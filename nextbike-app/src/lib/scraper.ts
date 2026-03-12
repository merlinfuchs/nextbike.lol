import { desc, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bikes, bikePositions, networks, areas, places } from "@/db/schema";
import { haversineDistance } from "./geo";

const LIVE_DATA_URL = "https://api.nextbike.net/maps/nextbike-live.json";
const CHUNK_SIZE = 200;
const POSITION_THRESHOLD_METERS = 250;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size)
    chunks.push(arr.slice(i, i + size));
  return chunks;
}

// --- Nested nextbike API types (countries → cities → places → bike_list) ---

interface NextbikeBikeInPlace {
  number: string;
  bike_type: number;
  lock_types: string[];
  active: boolean;
  state: string;
  electric_lock: boolean;
  boardcomputer: number;
  pedelec_battery: number | null;
  battery_pack: { percentage: number } | null;
}

interface NextbikePlace {
  uid: number;
  lat: number;
  lng: number;
  bike: boolean;
  name: string;
  address: string | null;
  spot: boolean;
  number: number;
  booked_bikes: number;
  bikes: number;
  bikes_available_to_rent: number;
  active_place: number;
  bike_racks: number;
  free_racks: number;
  special_racks: number;
  free_special_racks: number;
  maintenance: boolean;
  terminal_type: string;
  place_type: string;
  rack_locks: boolean;
  bike_list?: NextbikeBikeInPlace[];
  bike_types: Record<string, number>;
}

interface NextbikeBounds {
  south_west: { lat: number; lng: number };
  north_east: { lat: number; lng: number };
}

interface NextbikeCity {
  uid: number;
  name: string;
  alias: string;
  maps_icon: string;
  lat: number;
  lng: number;
  zoom: number;
  break: boolean;
  num_places: number;
  refresh_rate: string;
  bounds: NextbikeBounds;
  booked_bikes: number;
  set_point_bikes: number;
  available_bikes: number;
  return_to_official_only: boolean;
  bike_types: Record<string, number>;
  website: string;
  places: NextbikePlace[];
}

interface NextbikeCountry {
  lat: number;
  lng: number;
  zoom: number;
  name: string;
  hotline: string;
  domain: string;
  language: string;
  email: string;
  timezone: string;
  currency: string;
  country_calling_code: string;
  system_operator_address: string;
  country: string;
  country_name: string;
  terms: string;
  policy: string;
  website: string;
  show_bike_types: boolean;
  show_bike_type_groups: boolean;
  show_free_racks: boolean;
  booked_bikes: number;
  set_point_bikes: number;
  available_bikes: number;
  capped_available_bikes: boolean;
  no_registration: boolean;
  pricing: string;
  vat: string;
  faq_url: string;
  store_uri_android: string;
  store_uri_ios: string;
  express_rental: boolean;
  cities: NextbikeCity[];
}

interface NextbikeLiveData {
  countries: NextbikeCountry[];
}

function point(lng: number, lat: number) {
  return { x: lng, y: lat };
}

export async function scrape() {
  console.log("[scraper] Starting scrape at", new Date().toISOString());

  const resp = await fetch(LIVE_DATA_URL);
  if (!resp.ok) throw new Error(`Failed to fetch live data: ${resp.status}`);

  const data: NextbikeLiveData = await resp.json();
  const now = new Date();

  if (!data.countries?.length) {
    console.log("[scraper] No countries in response");
    return;
  }

  const networkNames: string[] = [];
  const areaRows: {
    uid: number;
    networkName: string;
    name: string;
    alias: string;
    mapsIcon: string;
    websiteUrl: string;
    break: boolean;
    numPlaces: number;
    bookedBikes: number;
    setPointBikes: number;
    availableBikes: number;
    returnToOfficialOnly: boolean;
    refreshRate: string;
    bikesTypes: Record<string, number>;
    boundsNorthEast: { x: number; y: number };
    boundsSouthWest: { x: number; y: number };
    location: { x: number; y: number };
    zoom: number;
  }[] = [];
  const placeRows: {
    uid: number;
    areaUid: number;
    name: string;
    address: string | null;
    bike: boolean;
    spot: boolean;
    maintenance: boolean;
    terminalType: string;
    placeType: string;
    number: number;
    bookedBikes: number;
    bikes: number;
    bikesAvailableToRent: number;
    activePlace: number;
    bikeRacks: number;
    freeRacks: number;
    specialRacks: number;
    freeSpecialRacks: number;
    rackLocks: boolean;
    bikeTypes: Record<string, number>;
    lat: number;
    lng: number;
  }[] = [];
  const bikeRows: {
    number: string;
    placeUid: number;
    bikeType: number;
    lockTypes: string[];
    active: boolean;
    state: string;
    electricLock: boolean;
    boardComputer: number;
    pedelecBattery: number | null;
    batteryPack: { percentage: number } | null;
    lat: number;
    lng: number;
  }[] = [];

  const networkPayloads: (typeof networks.$inferInsert)[] = [];
  for (const country of data.countries) {
    networkNames.push(country.name);
    networkPayloads.push({
      name: country.name,
      hotline: country.hotline ?? "",
      domain: country.domain ?? "",
      language: country.language ?? "",
      email: country.email ?? "",
      timezone: country.timezone ?? "",
      currency: country.currency ?? "",
      countryCallingCode: country.country_calling_code ?? "",
      systemOperatorAddress: country.system_operator_address ?? "",
      country: country.country ?? "",
      countryName: country.country_name ?? "",
      termsUrl: country.terms ?? "",
      policyUrl: country.policy ?? "",
      websiteUrl: country.website ?? "",
      pricingUrl: country.pricing ?? "",
      faqUrl: country.faq_url ?? country.website ?? "",
      storeAndroidUrl: country.store_uri_android ?? "",
      storeIOSUrl: country.store_uri_ios ?? "",
      vat: String(country.vat ?? ""),
      showBikeTypes: country.show_bike_types ?? false,
      showBikeTypeGroups: country.show_bike_type_groups ?? false,
      showFreeRacks: country.show_free_racks ?? false,
      bookedBikes: country.booked_bikes ?? 0,
      setPointBikes: country.set_point_bikes ?? 0,
      availableBikes: country.available_bikes ?? 0,
      cappedAvailableBikes: country.capped_available_bikes ?? false,
      noRegistration: country.no_registration ?? false,
      expressRental: country.express_rental ?? false,
      location: point(country.lng, country.lat),
      zoom: country.zoom ?? 9,
      createdAt: now,
      updatedAt: now,
    });

    for (const city of country.cities ?? []) {
      const b = city.bounds;
      const ne = b?.north_east
        ? point(b.north_east.lng, b.north_east.lat)
        : point(city.lng, city.lat);
      const sw = b?.south_west
        ? point(b.south_west.lng, b.south_west.lat)
        : point(city.lng, city.lat);
      areaRows.push({
        uid: city.uid,
        networkName: country.name,
        name: city.name,
        alias: city.alias ?? city.name,
        mapsIcon: city.maps_icon ?? "",
        websiteUrl: city.website ?? country.website ?? "",
        break: city.break ?? false,
        numPlaces: city.num_places ?? 0,
        bookedBikes: city.booked_bikes ?? 0,
        setPointBikes: city.set_point_bikes ?? 0,
        availableBikes: city.available_bikes ?? 0,
        returnToOfficialOnly: city.return_to_official_only ?? false,
        refreshRate: String(city.refresh_rate ?? ""),
        bikesTypes: city.bike_types ?? {},
        boundsNorthEast: ne,
        boundsSouthWest: sw,
        location: point(city.lng, city.lat),
        zoom: city.zoom ?? 9,
      });

      for (const place of city.places ?? []) {
        placeRows.push({
          uid: place.uid,
          areaUid: city.uid,
          name: place.name,
          address: place.address ?? null,
          bike: place.bike ?? false,
          spot: place.spot ?? false,
          maintenance: place.maintenance ?? false,
          terminalType: place.terminal_type ?? "",
          placeType: String(place.place_type ?? ""),
          number: place.number ?? 0,
          bookedBikes: place.booked_bikes ?? 0,
          bikes: place.bikes ?? 0,
          bikesAvailableToRent: place.bikes_available_to_rent ?? 0,
          activePlace: place.active_place ?? 0,
          bikeRacks: place.bike_racks ?? 0,
          freeRacks: place.free_racks ?? 0,
          specialRacks: place.special_racks ?? 0,
          freeSpecialRacks: place.free_special_racks ?? 0,
          rackLocks: place.rack_locks ?? false,
          bikeTypes: place.bike_types ?? {},
          lat: place.lat,
          lng: place.lng,
        });

        const list = place.bike_list ?? [];
        for (const bike of list) {
          bikeRows.push({
            number: bike.number,
            placeUid: place.uid,
            bikeType: bike.bike_type,
            lockTypes: Array.isArray(bike.lock_types) ? bike.lock_types : [],
            active: bike.active ?? true,
            state: bike.state ?? "ok",
            electricLock: bike.electric_lock ?? false,
            boardComputer: bike.boardcomputer ?? 0,
            pedelecBattery: bike.pedelec_battery ?? null,
            batteryPack: bike.battery_pack ?? null,
            lat: place.lat,
            lng: place.lng,
          });
        }
      }
    }
  }

  for (const batch of chunk(networkPayloads, CHUNK_SIZE)) {
    await db
      .insert(networks)
      .values(batch)
      .onConflictDoUpdate({
        target: networks.name,
        set: {
          hotline: sql`excluded.hotline`,
          domain: sql`excluded.domain`,
          language: sql`excluded.language`,
          email: sql`excluded.email`,
          timezone: sql`excluded.timezone`,
          currency: sql`excluded.currency`,
          countryCallingCode: sql`excluded.country_calling_code`,
          systemOperatorAddress: sql`excluded.system_operator_address`,
          country: sql`excluded.country`,
          countryName: sql`excluded.country_name`,
          termsUrl: sql`excluded.terms_url`,
          policyUrl: sql`excluded.policy_url`,
          websiteUrl: sql`excluded.website_url`,
          pricingUrl: sql`excluded.pricing_url`,
          faqUrl: sql`excluded.faq_url`,
          storeAndroidUrl: sql`excluded.store_android_url`,
          storeIOSUrl: sql`excluded.store_ios_url`,
          vat: sql`excluded.vat`,
          showBikeTypes: sql`excluded.show_bike_types`,
          showBikeTypeGroups: sql`excluded.show_bike_type_groups`,
          showFreeRacks: sql`excluded.show_free_racks`,
          bookedBikes: sql`excluded.booked_bikes`,
          setPointBikes: sql`excluded.set_point_bikes`,
          availableBikes: sql`excluded.available_bikes`,
          cappedAvailableBikes: sql`excluded.capped_available_bikes`,
          noRegistration: sql`excluded.no_registration`,
          expressRental: sql`excluded.express_rental`,
          location: sql`excluded.location`,
          zoom: sql`excluded.zoom`,
          updatedAt: now,
        },
      });
  }

  const nameToNetworkId = new Map<string, number>();
  const networkRows = await db
    .select({ id: networks.id, name: networks.name })
    .from(networks)
    .where(inArray(networks.name, networkNames));
  for (const r of networkRows) nameToNetworkId.set(r.name, r.id);

  for (const batch of chunk(areaRows, CHUNK_SIZE)) {
    const withNetworkId = batch
      .map((a) => {
        const networkId = nameToNetworkId.get(a.networkName);
        if (networkId == null) return null;
        return {
          uid: a.uid,
          networkId,
          name: a.name,
          alias: a.alias,
          mapsIcon: a.mapsIcon,
          websiteUrl: a.websiteUrl,
          break: a.break,
          numPlaces: a.numPlaces,
          bookesBikes: a.bookedBikes,
          setPointBikes: a.setPointBikes,
          availableBikes: a.availableBikes,
          returnToOfficialOnly: a.returnToOfficialOnly,
          refreshRate: a.refreshRate,
          bikesTypes: a.bikesTypes,
          boundsNorthEast: a.boundsNorthEast,
          boundsSouthWest: a.boundsSouthWest,
          location: a.location,
          zoom: a.zoom,
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter(Boolean) as (typeof areas.$inferInsert)[];
    if (withNetworkId.length === 0) continue;
    await db
      .insert(areas)
      .values(withNetworkId)
      .onConflictDoUpdate({
        target: areas.uid,
        set: {
          networkId: sql`excluded.network_id`,
          name: sql`excluded.name`,
          alias: sql`excluded.alias`,
          mapsIcon: sql`excluded.maps_icon`,
          websiteUrl: sql`excluded.website_url`,
          break: sql`excluded.break`,
          numPlaces: sql`excluded.num_places`,
          bookesBikes: sql`excluded.booked_bikes`,
          setPointBikes: sql`excluded.set_point_bikes`,
          availableBikes: sql`excluded.available_bikes`,
          returnToOfficialOnly: sql`excluded.return_to_official_only`,
          refreshRate: sql`excluded.refresh_rate`,
          bikesTypes: sql`excluded.bikes_types`,
          boundsNorthEast: sql`excluded.bounds_north_east`,
          boundsSouthWest: sql`excluded.bounds_south_west`,
          location: sql`excluded.location`,
          zoom: sql`excluded.zoom`,
          updatedAt: now,
        },
      });
  }

  const areaUidToId = new Map<number, number>();
  const areaUids = [...new Set(placeRows.map((p) => p.areaUid))];
  const areaIdRows = await db
    .select({ id: areas.id, uid: areas.uid })
    .from(areas)
    .where(inArray(areas.uid, areaUids));
  for (const r of areaIdRows) areaUidToId.set(r.uid, r.id);

  for (const batch of chunk(placeRows, CHUNK_SIZE)) {
    const withAreaId = batch
      .map((p) => {
        const areaId = areaUidToId.get(p.areaUid);
        if (areaId == null) return null;
        return {
          uid: p.uid,
          areaId,
          name: p.name,
          address: p.address,
          bike: p.bike,
          spot: p.spot,
          maintenance: p.maintenance,
          terminalType: p.terminalType,
          placeType: p.placeType,
          number: p.number,
          bookedBikes: p.bookedBikes,
          bikes: p.bikes,
          bikesAvailableToRent: p.bikesAvailableToRent,
          activePlace: p.activePlace,
          bikeRacks: p.bikeRacks,
          freeRacks: p.freeRacks,
          specialRacks: p.specialRacks,
          freeSpecialRacks: p.freeSpecialRacks,
          rackLocks: p.rackLocks,
          bikeTypes: p.bikeTypes,
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter(Boolean) as (typeof places.$inferInsert)[];
    if (withAreaId.length === 0) continue;
    await db
      .insert(places)
      .values(withAreaId)
      .onConflictDoUpdate({
        target: places.uid,
        set: {
          areaId: sql`excluded.area_id`,
          name: sql`excluded.name`,
          address: sql`excluded.address`,
          bike: sql`excluded.bike`,
          spot: sql`excluded.spot`,
          maintenance: sql`excluded.maintenance`,
          terminalType: sql`excluded.terminal_type`,
          placeType: sql`excluded.place_type`,
          number: sql`excluded.number`,
          bookedBikes: sql`excluded.booked_bikes`,
          bikes: sql`excluded.bikes`,
          bikesAvailableToRent: sql`excluded.bikes_available_to_rent`,
          activePlace: sql`excluded.active_place`,
          bikeRacks: sql`excluded.bike_racks`,
          freeRacks: sql`excluded.free_racks`,
          specialRacks: sql`excluded.special_racks`,
          freeSpecialRacks: sql`excluded.free_special_racks`,
          rackLocks: sql`excluded.rack_locks`,
          bikeTypes: sql`excluded.bike_types`,
          updatedAt: now,
        },
      });
  }

  const placeUidToId = new Map<number, number>();
  const placeUids = [...new Set(bikeRows.map((b) => b.placeUid))];
  const placeIdRows = await db
    .select({ id: places.id, uid: places.uid })
    .from(places)
    .where(inArray(places.uid, placeUids));
  for (const r of placeIdRows) placeUidToId.set(r.uid, r.id);

  const bikeUpserts: (typeof bikes.$inferInsert)[] = [];
  for (const b of bikeRows) {
    const placeId = placeUidToId.get(b.placeUid);
    if (placeId == null) continue;
    bikeUpserts.push({
      number: b.number,
      placeId,
      bikeType: b.bikeType,
      lockTypes: b.lockTypes,
      active: b.active,
      state: b.state,
      electricLock: b.electricLock,
      boardComputer: b.boardComputer,
      pedelecBattery: b.pedelecBattery,
      batteryPack: b.batteryPack,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const batch of chunk(bikeUpserts, CHUNK_SIZE)) {
    await db
      .insert(bikes)
      .values(batch)
      .onConflictDoUpdate({
        target: bikes.number,
        set: {
          placeId: sql`excluded.place_id`,
          bikeType: sql`excluded.bike_type`,
          lockTypes: sql`excluded.lock_types`,
          active: sql`excluded.active`,
          state: sql`excluded.state`,
          electricLock: sql`excluded.electric_lock`,
          boardComputer: sql`excluded.board_computer`,
          pedelecBattery: sql`excluded.pedelec_battery`,
          batteryPack: sql`excluded.battery_pack`,
          updatedAt: now,
        },
      });
  }

  const bikeNumbers = [...new Set(bikeRows.map((b) => b.number))];
  const bikeNumberToId = new Map<string, number>();
  for (const batch of chunk(bikeNumbers, CHUNK_SIZE)) {
    const rows = await db
      .select({ id: bikes.id, number: bikes.number })
      .from(bikes)
      .where(inArray(bikes.number, batch));
    for (const r of rows) bikeNumberToId.set(r.number, r.id);
  }

  const lastPositions = await db
    .select({
      bikeId: bikePositions.bikeId,
      placeId: bikePositions.placeId,
      location: bikePositions.location,
    })
    .from(bikePositions)
    .orderBy(desc(bikePositions.createdAt));
  const lastByBikeId = new Map<
    number,
    { placeId: number; lat: number; lng: number }
  >();
  for (const row of lastPositions) {
    if (!lastByBikeId.has(row.bikeId)) {
      const loc = row.location as { x: number; y: number };
      lastByBikeId.set(row.bikeId, {
        placeId: row.placeId,
        lat: loc.y,
        lng: loc.x,
      });
    }
  }

  const positionInserts: (typeof bikePositions.$inferInsert)[] = [];
  for (const b of bikeRows) {
    const bikeId = bikeNumberToId.get(b.number);
    const placeId = placeUidToId.get(b.placeUid);
    if (bikeId == null || placeId == null) continue;
    const prev = lastByBikeId.get(bikeId);
    const isNew = !prev;
    const placeChanged = prev ? prev.placeId !== placeId : false;
    const hasMoved =
      prev &&
      haversineDistance(prev.lat, prev.lng, b.lat, b.lng) >
        POSITION_THRESHOLD_METERS;
    if (isNew || placeChanged || hasMoved) {
      positionInserts.push({
        bikeId,
        placeId,
        location: { x: b.lng, y: b.lat },
        createdAt: now,
      });
    }
  }

  for (const batch of chunk(positionInserts, CHUNK_SIZE)) {
    if (batch.length > 0) await db.insert(bikePositions).values(batch);
  }

  const numNetworks = new Set(data.countries.map((c) => c.name)).size;
  const numAreas = areaRows.length;
  const numPlaces = placeRows.length;
  console.log(
    `[scraper] Done: ${numNetworks} networks, ${numAreas} areas, ${numPlaces} places, ` +
      `${bikeUpserts.length} bikes, ${positionInserts.length} new positions`
  );
}
