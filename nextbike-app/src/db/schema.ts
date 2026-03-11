import {
  bigserial,
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const cities = pgTable("cities", {
  uid: integer("uid").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  availableBikes: integer("available_bikes").notNull().default(0),
  bookedBikes: integer("booked_bikes").notNull().default(0),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
});

export const places = pgTable("places", {
  uid: integer("uid").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  spot: boolean("spot").notNull().default(false),
  bikes: integer("bikes").notNull().default(0),
  bikesAvailableToRent: integer("bikes_available_to_rent").notNull().default(0),
  bookedBikes: integer("booked_bikes").notNull().default(0),
  bikeRacks: integer("bike_racks").notNull().default(0),
  cityId: integer("city_id"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
});

export const bikes = pgTable("bikes", {
  number: text("number").primaryKey(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  placeId: integer("place_id"),
  spot: boolean("spot").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
});

export const bikePositions = pgTable("bike_positions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  bikeNumber: text("bike_number").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  placeId: integer("place_id"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
});

export type Place = typeof places.$inferSelect;
export type City = typeof cities.$inferSelect;
export type Bike = typeof bikes.$inferSelect;
export type BikePosition = typeof bikePositions.$inferSelect;
