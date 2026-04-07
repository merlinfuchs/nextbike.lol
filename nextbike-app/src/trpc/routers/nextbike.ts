import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  bikePositions,
  bikes,
  places,
  kvCache,
  zones,
} from "@/db/schema";
import {
  CACHE_KEYS,
  type GeneralStatsPayload,
  type LeaderboardAreaRow,
  type LeaderboardBikeRow,
  type LeaderboardNetworkRow,
} from "@/lib/statsCache";
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

type RawBikeWithDistance = {
  id: number;
  number: string;
  bike_type: number;
  state: string;
  active: boolean;
  electric_lock: boolean;
  pedelec_battery: number | null;
  updated_at: Date;
  total_distance_km: number;
};

function mapBikeRow(r: RawBikeWithDistance) {
  return {
    id: r.id,
    number: r.number,
    bikeType: r.bike_type,
    state: r.state,
    active: r.active,
    electricLock: r.electric_lock,
    pedelecBattery: r.pedelec_battery,
    updatedAt: r.updated_at,
    totalDistanceKm: Number(r.total_distance_km),
  };
}

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
        limit: z.number().min(1).max(1000).default(500),
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
        .where(eq(bikePositions.bikeId, opts.input.bikeId))
        .orderBy(desc(bikePositions.createdAt))
        .limit(opts.input.limit);

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
    const [row] = await db
      .select({ payload: kvCache.payload })
      .from(kvCache)
      .where(eq(kvCache.key, CACHE_KEYS.GENERAL_STATS));
    return (
      (row?.payload as GeneralStatsPayload | undefined) ?? {
        bikes: 0,
        stations: 0,
        areas: 0,
        networks: 0,
        zones: 0,
        bikePositions: 0,
        totalDistanceKm: 0,
      }
    );
  }),

  getLeaderboardBikes: baseProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
    .query(async (opts) => {
      const [row] = await db
        .select({ payload: kvCache.payload })
        .from(kvCache)
        .where(eq(kvCache.key, CACHE_KEYS.LEADERBOARD_BIKES));
      const data = (row?.payload as LeaderboardBikeRow[] | undefined) ?? [];
      return data.slice(0, opts.input.limit);
    }),

  getLeaderboardAreas: baseProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
    .query(async (opts) => {
      const [row] = await db
        .select({ payload: kvCache.payload })
        .from(kvCache)
        .where(eq(kvCache.key, CACHE_KEYS.LEADERBOARD_AREAS));
      const data = (row?.payload as LeaderboardAreaRow[] | undefined) ?? [];
      return data.slice(0, opts.input.limit);
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
        WITH area_dist AS (
          SELECT area_id, SUM(distance_km) AS total
          FROM "nextbike"."bike_movements"
          WHERE network_id = ${opts.input.networkId} AND plausible = true
          GROUP BY area_id
        )
        SELECT
          a.id,
          a.name,
          a.available_bikes,
          a.set_point_bikes,
          a.num_places,
          a.booked_bikes,
          COALESCE(ad.total, 0) AS total_distance_km
        FROM "nextbike"."areas" a
        LEFT JOIN area_dist ad ON ad.area_id = a.id
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
      const rows = await db.execute<RawBikeWithDistance>(sql`
        SELECT
          b.id, b.number, b.bike_type, b.state, b.active, b.electric_lock,
          b.pedelec_battery, b.updated_at,
          COALESCE(m.total_distance_km, 0) AS total_distance_km
        FROM "nextbike"."bikes" b
        JOIN "nextbike"."places" p ON p.id = b.place_id
        LEFT JOIN LATERAL (
          SELECT SUM(distance_km) AS total_distance_km
          FROM "nextbike"."bike_movements"
          WHERE bike_id = b.id AND plausible = true
        ) m ON TRUE
        WHERE p.area_id = ${opts.input.areaId} AND p.bike = true
        ORDER BY total_distance_km DESC NULLS LAST
        LIMIT 300
      `);
      return rows.map(mapBikeRow);
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

      const parkedBikesRaw = await db.execute<RawBikeWithDistance>(sql`
        SELECT
          b.id, b.number, b.bike_type, b.state, b.active, b.electric_lock,
          b.pedelec_battery, b.updated_at,
          COALESCE(m.total_distance_km, 0) AS total_distance_km
        FROM "nextbike"."bikes" b
        LEFT JOIN LATERAL (
          SELECT SUM(distance_km) AS total_distance_km
          FROM "nextbike"."bike_movements"
          WHERE bike_id = b.id AND plausible = true
        ) m ON TRUE
        WHERE b.place_id = ${opts.input.id}
        ORDER BY total_distance_km DESC NULLS LAST
      `);
      const parkedBikes = parkedBikesRaw.map(mapBikeRow);

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
        bikes: parkedBikes,
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
          COALESCE(m.total_distance_km, 0) AS total_distance_km,
          COALESCE(m.trip_count, 0) AS trip_count
        FROM "nextbike"."bikes" b
        JOIN "nextbike"."places" p ON p.id = b.place_id
        JOIN "nextbike"."areas" a ON a.id = p.area_id
        JOIN "nextbike"."networks" n ON n.id = a.network_id
        LEFT JOIN LATERAL (
          SELECT SUM(distance_km) AS total_distance_km, COUNT(*)::int AS trip_count
          FROM "nextbike"."bike_movements"
          WHERE bike_id = b.id AND plausible = true
        ) m ON TRUE
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
    .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
    .query(async (opts) => {
      const [row] = await db
        .select({ payload: kvCache.payload })
        .from(kvCache)
        .where(eq(kvCache.key, CACHE_KEYS.LEADERBOARD_NETWORKS));
      const data = (row?.payload as LeaderboardNetworkRow[] | undefined) ?? [];
      return data.slice(0, opts.input.limit);
    }),
});
