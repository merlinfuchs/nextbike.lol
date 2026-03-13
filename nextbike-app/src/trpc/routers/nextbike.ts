import { and, asc, desc, eq, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  areas,
  bikeMovements,
  bikePositions,
  bikes,
  networks,
  places,
  zones,
} from "@/db/schema";
import { baseProcedure, createTRPCRouter } from "../init";

export type Bike = {
  id: number;
  number: number;
  location: Location;
  active: boolean;
  state: string;
  electricLock: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Place = {
  id: number;
  number: number;
  name: string;
  address?: string;
  location: Location;
  bike: boolean;
  spot: boolean;
  bikes: number;
  bikesAvailableToRent: number;
  bookedBikes: number;
  bikeRacks: number;
  freeRacks: number;
  specialRacks: number;
  freeSpecialRacks: number;
  rackLocks: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type BikePosition = {
  id: number;
  bikeId: number;
  placeId: number;
  location: Location;
  createdAt: Date;
};

export type Location = {
  lat: number;
  lng: number;
};

export type RawZone = {
  id: number;
  areaId: number;
  externalId: string;
  zoneType: string;
  properties: Record<string, unknown>;
  geometry: string;
};

export type Zone = {
  id: number;
  areaId: number;
  externalId: string;
  zoneType: string;
  properties: Record<string, unknown>;
  geometry: GeoJSON.MultiPolygon;
};

export const nextbikeRouter = createTRPCRouter({
  getBikes: baseProcedure
    .input(
      z.object({
        excludeParked: z.boolean().default(false),
      })
    )
    .query(async (opts) => {
      const { excludeParked } = opts.input;
      const conditions = [excludeParked ? eq(places.bike, true) : null].filter(
        (c): c is NonNullable<typeof c> => c != null
      );
      const rows = await db
        .select({
          id: bikes.id,
          number: bikes.number,
          active: bikes.active,
          state: bikes.state,
          electricLock: bikes.electricLock,
          createdAt: bikes.createdAt,
          updatedAt: bikes.updatedAt,
          lat: sql<number>`ST_Y("nextbike"."places"."location")`.as("lat"),
          lng: sql<number>`ST_X("nextbike"."places"."location")`.as("lng"),
        })
        .from(bikes)
        .innerJoin(places, eq(bikes.placeId, places.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return rows.map((row) => ({
        id: row.id,
        number: parseInt(row.number, 10) || 0,
        location: { lat: row.lat, lng: row.lng },
        active: row.active,
        state: row.state,
        electricLock: row.electricLock,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })) as Bike[];
    }),

  getPlaces: baseProcedure
    .input(
      z.object({
        excludeBikes: z.boolean().default(true),
      })
    )
    .query(async (opts) => {
      const rows = await db
        .select({
          id: places.id,
          number: places.number,
          name: places.name,
          address: places.address,
          bike: places.bike,
          spot: places.spot,
          bikes: places.bikes,
          bikesAvailableToRent: places.bikesAvailableToRent,
          bookedBikes: places.bookedBikes,
          bikeRacks: places.bikeRacks,
          freeRacks: places.freeRacks,
          specialRacks: places.specialRacks,
          freeSpecialRacks: places.freeSpecialRacks,
          rackLocks: places.rackLocks,
          createdAt: places.createdAt,
          updatedAt: places.updatedAt,
          lat: sql<number>`ST_Y("nextbike"."places"."location")`.as("lat"),
          lng: sql<number>`ST_X("nextbike"."places"."location")`.as("lng"),
        })
        .from(places)
        .where(opts.input.excludeBikes ? eq(places.bike, false) : undefined);

      return rows.map((row) => ({
        id: row.id,
        number: row.number,
        name: row.name,
        address: row.address ?? undefined,
        location: { lat: row.lat, lng: row.lng },
        bike: row.bike,
        spot: row.spot,
        bikes: row.bikes,
        bikesAvailableToRent: row.bikesAvailableToRent,
        bookedBikes: row.bookedBikes,
        bikeRacks: row.bikeRacks,
        freeRacks: row.freeRacks,
        specialRacks: row.specialRacks,
        freeSpecialRacks: row.freeSpecialRacks,
        rackLocks: row.rackLocks,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })) as Place[];
    }),

  getBikePositions: baseProcedure
    .input(
      z.object({
        bikeId: z.number(),
      })
    )
    .query(async (opts) => {
      const rows = await db
        .select({
          id: bikePositions.id,
          bikeId: bikePositions.bikeId,
          placeId: bikePositions.placeId,
          createdAt: bikePositions.createdAt,
          lat: sql<number>`ST_Y("nextbike"."bike_positions"."location")`.as(
            "lat"
          ),
          lng: sql<number>`ST_X("nextbike"."bike_positions"."location")`.as(
            "lng"
          ),
        })
        .from(bikePositions)
        .where(eq(bikePositions.bikeId, opts.input.bikeId));

      return rows.map((row) => ({
        id: row.id,
        bikeId: row.bikeId,
        placeId: row.placeId,
        location: { lat: row.lat, lng: row.lng },
        createdAt: row.createdAt,
      })) as BikePosition[];
    }),

  getZones: baseProcedure
    .input(
      z.object({
        bounds: z
          .object({
            minLng: z.number(),
            minLat: z.number(),
            maxLng: z.number(),
            maxLat: z.number(),
          })
          .optional(),
      })
    )
    .query(async (opts) => {
      const bounds = opts.input.bounds;
      if (!bounds) return [] as RawZone[];

      const rows = await db
        .select({
          id: zones.id,
          areaId: zones.areaId,
          externalId: zones.externalId,
          zoneType: zones.zoneType,
          properties: zones.properties,
          geometryJson:
            sql<string>`ST_AsGeoJSON("nextbike"."zones"."geometry")`.as(
              "geometry_json"
            ),
        })
        .from(zones)
        .where(
          sql`ST_Intersects("nextbike"."zones"."geometry", ST_MakeEnvelope(${bounds.minLng}, ${bounds.minLat}, ${bounds.maxLng}, ${bounds.maxLat}, 4326))`
        );

      return rows.map((row) => ({
        id: row.id,
        areaId: row.areaId,
        externalId: row.externalId,
        zoneType: row.zoneType,
        properties: row.properties as Record<string, unknown>,
        geometry: row.geometryJson, // We are returning the raw geometry string so we don't have to parse it to just serialize it again
      })) as RawZone[];
    }),

  getGeneralStats: baseProcedure.query(async () => {
    const [row] = await db.execute<{
      bikes: number;
      stations: number;
      areas: number;
      networks: number;
      zones: number;
      bike_positions: number;
      total_distance_km: number;
    }>(sql`
      SELECT
        (SELECT count(*)::int FROM "nextbike"."bikes") AS bikes,
        (SELECT count(*)::int FROM "nextbike"."places" WHERE bike = false) AS stations,
        (SELECT count(*)::int FROM "nextbike"."areas") AS areas,
        (SELECT count(*)::int FROM "nextbike"."networks") AS networks,
        (SELECT count(*)::int FROM "nextbike"."zones") AS zones,
        (SELECT count(*)::int FROM "nextbike"."bike_positions") AS bike_positions,
        coalesce(round((SELECT sum(distance_km) FROM "nextbike"."bike_movements" WHERE plausible = true))::numeric, 0) AS total_distance_km
      FROM (SELECT 1) _ 
    `);
    if (!row) {
      return {
        bikes: 0,
        stations: 0,
        areas: 0,
        networks: 0,
        zones: 0,
        bikePositions: 0,
        totalDistanceKm: 0,
      };
    }
    return {
      bikes: row.bikes,
      stations: row.stations,
      areas: row.areas,
      networks: row.networks,
      zones: row.zones,
      bikePositions: row.bike_positions,
      totalDistanceKm: Number(row.total_distance_km),
    };
  }),

  getLeaderboardBikes: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async (opts) => {
      const rows = await db
        .select({
          bikeId: bikeMovements.bikeId,
          bikeNumber: bikes.number,
          totalDistanceKm: sum(bikeMovements.distanceKm),
        })
        .from(bikeMovements)
        .innerJoin(bikes, eq(bikeMovements.bikeId, bikes.id))
        .where(eq(bikeMovements.plausible, true))
        .groupBy(bikeMovements.bikeId, bikes.number)
        .orderBy(desc(sql.raw("3")))
        .limit(opts.input.limit);

      return rows.map((row, i) => ({
        bikeId: row.bikeId,
        bikeNumber: row.bikeNumber,
        totalDistanceKm: Number(row.totalDistanceKm ?? 0),
        rank: i + 1,
      }));
    }),

  getLeaderboardAreas: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async (opts) => {
      const rows = await db
        .select({
          areaId: bikeMovements.areaId,
          areaName: areas.name,
          networkId: networks.id,
          networkName: networks.name,
          totalDistanceKm: sum(bikeMovements.distanceKm),
        })
        .from(bikeMovements)
        .innerJoin(areas, eq(bikeMovements.areaId, areas.id))
        .innerJoin(networks, eq(areas.networkId, networks.id))
        .where(eq(bikeMovements.plausible, true))
        .groupBy(bikeMovements.areaId, areas.name, networks.id, networks.name)
        .orderBy(desc(sql.raw('sum("nextbike"."bike_movements"."distance_km")')))
        .limit(opts.input.limit);

      return rows.map((row, i) => ({
        areaId: row.areaId,
        areaName: row.areaName,
        networkId: row.networkId,
        networkName: row.networkName,
        totalDistanceKm: Number(row.totalDistanceKm ?? 0),
        rank: i + 1,
      }));
    }),

  getNetworks: baseProcedure.query(async () => {
    const rows = await db.execute<{
      id: number;
      name: string;
      country: string;
      country_name: string;
      website_url: string;
      hotline: string;
      available_bikes: number;
      booked_bikes: number;
      set_point_bikes: number;
      area_count: number;
      station_count: number;
      total_distance_km: number;
    }>(sql`
      SELECT
        n.id,
        n.name,
        n.country,
        n.country_name,
        n.website_url,
        n.hotline,
        n.available_bikes,
        n.booked_bikes,
        n.set_point_bikes,
        (SELECT COUNT(*)::int FROM "nextbike"."areas" WHERE network_id = n.id) AS area_count,
        (SELECT COUNT(*)::int FROM "nextbike"."places" p
         JOIN "nextbike"."areas" a ON p.area_id = a.id
         WHERE a.network_id = n.id AND p.spot = true AND p.bike = false) AS station_count,
        COALESCE((SELECT SUM(distance_km) FROM "nextbike"."bike_movements"
                  WHERE network_id = n.id AND plausible = true), 0) AS total_distance_km
      FROM "nextbike"."networks" n
      ORDER BY total_distance_km DESC
    `);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      country: r.country,
      countryName: r.country_name,
      websiteUrl: r.website_url,
      hotline: r.hotline,
      availableBikes: r.available_bikes,
      bookedBikes: r.booked_bikes,
      setPointBikes: r.set_point_bikes,
      areaCount: r.area_count,
      stationCount: r.station_count,
      totalDistanceKm: Number(r.total_distance_km),
    }));
  }),

  getNetwork: baseProcedure
    .input(z.object({ id: z.number() }))
    .query(async (opts) => {
      const rows = await db.execute<{
        id: number;
        name: string;
        country: string;
        country_name: string;
        website_url: string;
        hotline: string;
        available_bikes: number;
        booked_bikes: number;
        set_point_bikes: number;
        area_count: number;
        station_count: number;
        total_distance_km: number;
      }>(sql`
        SELECT
          n.id,
          n.name,
          n.country,
          n.country_name,
          n.website_url,
          n.hotline,
          n.available_bikes,
          n.booked_bikes,
          n.set_point_bikes,
          (SELECT COUNT(*)::int FROM "nextbike"."areas" WHERE network_id = n.id) AS area_count,
          (SELECT COUNT(*)::int FROM "nextbike"."places" p
           JOIN "nextbike"."areas" a ON p.area_id = a.id
           WHERE a.network_id = n.id AND p.spot = true AND p.bike = false) AS station_count,
          COALESCE((SELECT SUM(distance_km) FROM "nextbike"."bike_movements"
                    WHERE network_id = n.id AND plausible = true), 0) AS total_distance_km
        FROM "nextbike"."networks" n
        WHERE n.id = ${opts.input.id}
      `);
      const r = rows[0];
      if (!r) throw new Error("Network not found");
      return {
        id: r.id,
        name: r.name,
        country: r.country,
        countryName: r.country_name,
        websiteUrl: r.website_url,
        hotline: r.hotline,
        availableBikes: r.available_bikes,
        bookedBikes: r.booked_bikes,
        setPointBikes: r.set_point_bikes,
        areaCount: r.area_count,
        stationCount: r.station_count,
        totalDistanceKm: Number(r.total_distance_km),
      };
    }),

  getNetworkAreas: baseProcedure
    .input(z.object({ networkId: z.number() }))
    .query(async (opts) => {
      const rows = await db.execute<{
        id: number;
        name: string;
        available_bikes: number;
        set_point_bikes: number;
        num_places: number;
        booked_bikes: number;
        total_distance_km: number;
      }>(sql`
        SELECT
          a.id,
          a.name,
          a.available_bikes,
          a.set_point_bikes,
          a.num_places,
          a.booked_bikes,
          COALESCE((SELECT SUM(distance_km) FROM "nextbike"."bike_movements"
                    WHERE area_id = a.id AND plausible = true), 0) AS total_distance_km
        FROM "nextbike"."areas" a
        WHERE a.network_id = ${opts.input.networkId}
        ORDER BY total_distance_km DESC
      `);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        availableBikes: r.available_bikes,
        setPointBikes: r.set_point_bikes,
        numPlaces: r.num_places,
        bookedBikes: r.booked_bikes,
        totalDistanceKm: Number(r.total_distance_km),
      }));
    }),

  getArea: baseProcedure
    .input(z.object({ id: z.number() }))
    .query(async (opts) => {
      const rows = await db.execute<{
        id: number;
        uid: number;
        name: string;
        available_bikes: number;
        set_point_bikes: number;
        num_places: number;
        booked_bikes: number;
        website_url: string;
        network_id: number;
        network_name: string;
        country: string;
        country_name: string;
      }>(sql`
        SELECT
          a.id, a.uid, a.name, a.available_bikes, a.set_point_bikes,
          a.num_places, a.booked_bikes, a.website_url,
          n.id AS network_id, n.name AS network_name,
          n.country, n.country_name
        FROM "nextbike"."areas" a
        JOIN "nextbike"."networks" n ON n.id = a.network_id
        WHERE a.id = ${opts.input.id}
      `);
      const r = rows[0];
      if (!r) throw new Error("Area not found");
      return {
        id: r.id,
        uid: r.uid,
        name: r.name,
        availableBikes: r.available_bikes,
        setPointBikes: r.set_point_bikes,
        numPlaces: r.num_places,
        bookedBikes: r.booked_bikes,
        websiteUrl: r.website_url,
        networkId: r.network_id,
        networkName: r.network_name,
        country: r.country,
        countryName: r.country_name,
      };
    }),

  getAreaStations: baseProcedure
    .input(z.object({ areaId: z.number() }))
    .query(async (opts) => {
      return db
        .select({
          id: places.id,
          name: places.name,
          address: places.address,
          bikes: places.bikes,
          bikesAvailableToRent: places.bikesAvailableToRent,
          bikeRacks: places.bikeRacks,
          freeRacks: places.freeRacks,
          bookedBikes: places.bookedBikes,
          maintenance: places.maintenance,
          activePlace: places.activePlace,
        })
        .from(places)
        .where(
          and(
            eq(places.areaId, opts.input.areaId),
            eq(places.spot, true),
            eq(places.bike, false)
          )
        )
        .orderBy(desc(places.bikesAvailableToRent), asc(places.name))
        .limit(300);
    }),

  getAreaBikes: baseProcedure
    .input(z.object({ areaId: z.number() }))
    .query(async (opts) => {
      const rows = await db
        .select({
          id: bikes.id,
          number: bikes.number,
          bikeType: bikes.bikeType,
          state: bikes.state,
          active: bikes.active,
          electricLock: bikes.electricLock,
          pedelecBattery: bikes.pedelecBattery,
          updatedAt: bikes.updatedAt,
          totalDistanceKm: sql<number>`coalesce(sum(${bikeMovements.distanceKm}) filter (where ${bikeMovements.plausible} = true), 0)`.as("total_distance_km"),
        })
        .from(bikes)
        .innerJoin(places, eq(bikes.placeId, places.id))
        .leftJoin(bikeMovements, eq(bikes.id, bikeMovements.bikeId))
        .where(and(eq(places.areaId, opts.input.areaId), eq(places.bike, true)))
        .groupBy(bikes.id)
        .orderBy(desc(sql.raw("total_distance_km")))
        .limit(300);
      return rows.map((r) => ({ ...r, totalDistanceKm: Number(r.totalDistanceKm) }));
    }),

  getStation: baseProcedure
    .input(z.object({ id: z.number() }))
    .query(async (opts) => {
      const rows = await db.execute<{
        id: number;
        uid: number;
        name: string;
        address: string | null;
        bikes_count: number;
        bikes_available_to_rent: number;
        booked_bikes: number;
        bike_racks: number;
        free_racks: number;
        special_racks: number;
        free_special_racks: number;
        rack_locks: boolean;
        maintenance: boolean;
        active_place: number;
        terminal_type: string;
        place_type: string;
        lat: number;
        lng: number;
        area_id: number;
        area_name: string;
        network_id: number;
        network_name: string;
        country: string;
        country_name: string;
      }>(sql`
        SELECT
          p.id, p.uid, p.name, p.address,
          p.bikes AS bikes_count,
          p.bikes_available_to_rent,
          p.booked_bikes, p.bike_racks, p.free_racks,
          p.special_racks, p.free_special_racks, p.rack_locks,
          p.maintenance, p.active_place,
          p.terminal_type, p.place_type,
          ST_Y(p.location) AS lat, ST_X(p.location) AS lng,
          a.id AS area_id, a.name AS area_name,
          n.id AS network_id, n.name AS network_name,
          n.country, n.country_name
        FROM "nextbike"."places" p
        JOIN "nextbike"."areas" a ON a.id = p.area_id
        JOIN "nextbike"."networks" n ON n.id = a.network_id
        WHERE p.id = ${opts.input.id} AND p.spot = true AND p.bike = false
      `);
      const r = rows[0];
      if (!r) throw new Error("Station not found");

      const parkedBikes = await db
        .select({
          id: bikes.id,
          number: bikes.number,
          bikeType: bikes.bikeType,
          state: bikes.state,
          active: bikes.active,
          electricLock: bikes.electricLock,
          pedelecBattery: bikes.pedelecBattery,
          updatedAt: bikes.updatedAt,
          totalDistanceKm: sql<number>`coalesce(sum(${bikeMovements.distanceKm}) filter (where ${bikeMovements.plausible} = true), 0)`.as("total_distance_km"),
        })
        .from(bikes)
        .leftJoin(bikeMovements, eq(bikes.id, bikeMovements.bikeId))
        .where(eq(bikes.placeId, opts.input.id))
        .groupBy(bikes.id)
        .orderBy(desc(sql.raw("total_distance_km")));

      return {
        id: r.id,
        uid: r.uid,
        name: r.name,
        address: r.address ?? undefined,
        bikesCount: r.bikes_count,
        bikesAvailableToRent: r.bikes_available_to_rent,
        bookedBikes: r.booked_bikes,
        bikeRacks: r.bike_racks,
        freeRacks: r.free_racks,
        specialRacks: r.special_racks,
        freeSpecialRacks: r.free_special_racks,
        rackLocks: r.rack_locks,
        maintenance: r.maintenance,
        activePlace: r.active_place,
        terminalType: r.terminal_type,
        placeType: r.place_type,
        lat: r.lat,
        lng: r.lng,
        areaId: r.area_id,
        areaName: r.area_name,
        networkId: r.network_id,
        networkName: r.network_name,
        country: r.country,
        countryName: r.country_name,
        bikes: parkedBikes.map((b) => ({ ...b, totalDistanceKm: Number(b.totalDistanceKm) })),
      };
    }),

  getBike: baseProcedure
    .input(z.object({ id: z.number() }))
    .query(async (opts) => {
      const rows = await db.execute<{
        id: number;
        number: string;
        bike_type: number;
        state: string;
        active: boolean;
        electric_lock: boolean;
        pedelec_battery: number | null;
        created_at: Date;
        updated_at: Date;
        place_id: number;
        place_name: string;
        place_address: string | null;
        place_spot: boolean;
        place_bike: boolean;
        lat: number;
        lng: number;
        area_id: number;
        area_name: string;
        network_id: number;
        network_name: string;
        country: string;
        country_name: string;
        total_distance_km: number;
        trip_count: number;
      }>(sql`
        SELECT
          b.id, b.number, b.bike_type, b.state, b.active, b.electric_lock,
          b.pedelec_battery, b.created_at, b.updated_at,
          p.id AS place_id, p.name AS place_name, p.address AS place_address,
          p.spot AS place_spot, p.bike AS place_bike,
          ST_Y(p.location) AS lat, ST_X(p.location) AS lng,
          a.id AS area_id, a.name AS area_name,
          n.id AS network_id, n.name AS network_name, n.country, n.country_name,
          COALESCE((SELECT SUM(distance_km) FROM "nextbike"."bike_movements"
                    WHERE bike_id = b.id AND plausible = true), 0) AS total_distance_km,
          (SELECT COUNT(*)::int FROM "nextbike"."bike_movements"
           WHERE bike_id = b.id AND plausible = true) AS trip_count
        FROM "nextbike"."bikes" b
        JOIN "nextbike"."places" p ON p.id = b.place_id
        JOIN "nextbike"."areas" a ON a.id = p.area_id
        JOIN "nextbike"."networks" n ON n.id = a.network_id
        WHERE b.id = ${opts.input.id}
      `);
      const r = rows[0];
      if (!r) throw new Error("Bike not found");
      return {
        id: r.id,
        number: r.number,
        bikeType: r.bike_type,
        state: r.state,
        active: r.active,
        electricLock: r.electric_lock,
        pedelecBattery: r.pedelec_battery ?? undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        placeId: r.place_id,
        placeName: r.place_name,
        placeAddress: r.place_address ?? undefined,
        placeIsStation: r.place_spot && !r.place_bike,
        lat: r.lat,
        lng: r.lng,
        areaId: r.area_id,
        areaName: r.area_name,
        networkId: r.network_id,
        networkName: r.network_name,
        country: r.country,
        countryName: r.country_name,
        totalDistanceKm: Number(r.total_distance_km),
        tripCount: r.trip_count,
      };
    }),

  getBikeRecentMovements: baseProcedure
    .input(z.object({ bikeId: z.number(), limit: z.number().min(1).max(100).default(20) }))
    .query(async (opts) => {
      const rows = await db.execute<{
        distance_km: number;
        start_time: Date;
        end_time: Date;
        duration_seconds: number;
        plausible: boolean;
      }>(sql`
        SELECT distance_km, start_time, end_time, duration_seconds, plausible
        FROM "nextbike"."bike_movements"
        WHERE bike_id = ${opts.input.bikeId}
        ORDER BY start_time DESC
        LIMIT ${opts.input.limit}
      `);
      return rows.map((r) => ({
        distanceKm: Number(r.distance_km),
        startTime: r.start_time,
        endTime: r.end_time,
        durationSeconds: Number(r.duration_seconds),
        plausible: r.plausible,
      }));
    }),

  getLeaderboardNetworks: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async (opts) => {
      const rows = await db
        .select({
          networkId: bikeMovements.networkId,
          networkName: networks.name,
          totalDistanceKm: sum(bikeMovements.distanceKm),
        })
        .from(bikeMovements)
        .innerJoin(networks, eq(bikeMovements.networkId, networks.id))
        .where(eq(bikeMovements.plausible, true))
        .groupBy(bikeMovements.networkId, networks.name)
        .orderBy(desc(sql.raw('sum("nextbike"."bike_movements"."distance_km")')))
        .limit(opts.input.limit);

      return rows.map((row, i) => ({
        networkId: row.networkId,
        networkName: row.networkName,
        totalDistanceKm: Number(row.totalDistanceKm ?? 0),
        rank: i + 1,
      }));
    }),
});
