import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bikes, bikePositions, places, zones } from "@/db/schema";
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

  getZones: baseProcedure.query(async () => {
    const rows = await db
      .select({
        id: zones.id,
        areaId: zones.areaId,
        externalId: zones.externalId,
        zoneType: zones.zoneType,
        properties: zones.properties,
        geometryJson: sql<string>`ST_AsGeoJSON("nextbike"."zones"."geometry")`.as(
          "geometry_json"
        ),
      })
      .from(zones);

    return rows.map((row) => ({
      id: row.id,
      areaId: row.areaId,
      externalId: row.externalId,
      zoneType: row.zoneType,
      properties: row.properties as Record<string, unknown>,
      geometry: JSON.parse(row.geometryJson) as GeoJSON.MultiPolygon,
    })) as Zone[];
  }),
});
