import { and, desc, eq, sql, sum } from "drizzle-orm";
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
          networkName: networks.name,
          totalDistanceKm: sum(bikeMovements.distanceKm),
        })
        .from(bikeMovements)
        .innerJoin(areas, eq(bikeMovements.areaId, areas.id))
        .innerJoin(networks, eq(areas.networkId, networks.id))
        .where(eq(bikeMovements.plausible, true))
        .groupBy(bikeMovements.areaId, areas.name, networks.name)
        .orderBy(desc(sql.raw('sum("nextbike"."bike_movements"."distance_km")')))
        .limit(opts.input.limit);

      return rows.map((row, i) => ({
        areaId: row.areaId,
        areaName: row.areaName,
        networkName: row.networkName,
        totalDistanceKm: Number(row.totalDistanceKm ?? 0),
        rank: i + 1,
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
