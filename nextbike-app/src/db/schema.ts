import {
  bigint,
  bigserial,
  boolean,
  customType,
  doublePrecision,
  geometry,
  index,
  integer,
  jsonb,
  pgSchema,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const schema = pgSchema("nextbike");

/** PostGIS MultiPolygon (SRID 4326). Use sql`ST_GeomFromGeoJSON(${json})` when inserting. */
const multipolygonGeometry = customType<{ data: string }>({
  dataType() {
    return "geometry(MultiPolygon, 4326)";
  },
});

// Called "countries" in the Nextbike API
export const networks = schema.table("networks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  hotline: text("hotline").notNull(),
  domain: text("domain").notNull(),
  language: text("language").notNull(),
  email: text("email").notNull(),
  timezone: text("timezone").notNull(),
  currency: text("currency").notNull(),
  countryCallingCode: text("country_calling_code").notNull(),
  systemOperatorAddress: text("system_operator_address").notNull(),
  country: text("country").notNull(),
  countryName: text("country_name").notNull(),
  termsUrl: text("terms_url").notNull(),
  policyUrl: text("policy_url").notNull(),
  websiteUrl: text("website_url").notNull(),
  pricingUrl: text("pricing_url").notNull(),
  faqUrl: text("faq_url").notNull(),
  storeAndroidUrl: text("store_android_url").notNull(),
  storeIOSUrl: text("store_ios_url").notNull(),
  vat: text("vat").notNull(),
  showBikeTypes: boolean("show_bike_types").notNull(),
  showBikeTypeGroups: boolean("show_bike_type_groups").notNull(),
  showFreeRacks: boolean("show_free_racks").notNull(),
  bookedBikes: integer("booked_bikes").notNull().default(0),
  setPointBikes: integer("set_point_bikes").notNull().default(0),
  availableBikes: integer("available_bikes").notNull().default(0),
  cappedAvailableBikes: boolean("capped_available_bikes").notNull(),
  noRegistration: boolean("no_registration").notNull(),
  expressRental: boolean("express_rental").notNull(),
  location: geometry("location", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }).notNull(),
  zoom: integer("zoom").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Called "cities" in the Nextbike API
export const areas = schema.table(
  "areas",
  {
    id: serial("id").primaryKey(),
    uid: integer("uid").notNull().unique(),
    networkId: integer("network_id")
    .notNull()
    .references(() => networks.id, {
      onDelete: "cascade",
    }),
  name: text("name").notNull(),
  alias: text("alias").notNull(),
  mapsIcon: text("maps_icon").notNull(),
  websiteUrl: text("website_url").notNull(),
  break: boolean("break").notNull().default(false),
  numPlaces: integer("num_places").notNull().default(0),
  bookedBikes: integer("booked_bikes").notNull().default(0),
  setPointBikes: integer("set_point_bikes").notNull().default(0),
  availableBikes: integer("available_bikes").notNull().default(0),
  returnToOfficialOnly: boolean("return_to_official_only").notNull(),
  refreshRate: text("refresh_rate").notNull(),
  bikesTypes: jsonb("bikes_types").notNull(),
  boundsNorthEast: geometry("bounds_north_east", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }).notNull(),
  boundsSouthWest: geometry("bounds_south_west", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }).notNull(),
  location: geometry("location", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }).notNull(),
  zoom: integer("zoom").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("areas_network_id_idx").on(t.networkId)]
);

/** Zones per city from zone-service.nextbikecloud.net (business, no-return, etc.). */
export const zones = schema.table(
  "zones",
  {
  id: serial("id").primaryKey(),
  areaId: integer("area_id")
    .notNull()
    .references(() => areas.id, {
      onDelete: "cascade",
    }),
  externalId: text("external_id").notNull().unique(),
  zoneType: text("zone_type").notNull(),
  properties: jsonb("properties").notNull(),
  geometry: multipolygonGeometry("geometry").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("zones_geometry_gist").using("gist", t.geometry)]
);

export const places = schema.table(
  "places",
  {
  id: serial("id").primaryKey(),
  uid: integer("uid").notNull().unique(),
  areaId: integer("area_id")
    .notNull()
    .references(() => areas.id, {
      onDelete: "cascade",
    }),
  name: text("name").notNull(),
  address: text("address"),
  // bike and spot are (with a handful of exceptions) mutually exclusive and one is required
  // spot: true means it's a real station
  // bike: true means it's a virtual station for just that one bike
  // Virtual places can move around with the bike, but real stations are static
  bike: boolean("bike").notNull().default(false),
  spot: boolean("spot").notNull().default(false),
  maintenance: boolean("maintenance").notNull().default(false),
  terminalType: text("terminal_type").notNull(),
  placeType: text("place_type").notNull(),
  number: integer("number").notNull(),
  bookedBikes: integer("booked_bikes").notNull().default(0),
  bikes: integer("bikes").notNull().default(0),
  bikesAvailableToRent: integer("bikes_available_to_rent").notNull().default(0),
  activePlace: integer("active_place").notNull().default(0),
  bikeRacks: integer("bike_racks").notNull().default(0),
  freeRacks: integer("free_racks").notNull().default(0),
  specialRacks: integer("special_racks").notNull().default(0),
  freeSpecialRacks: integer("free_special_racks").notNull().default(0),
  rackLocks: boolean("rack_locks").notNull().default(false),
  bikeTypes: jsonb("bike_types").notNull(),
  location: geometry("location", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("places_bike_idx").on(t.bike),
    index("places_area_id_idx").on(t.areaId),
    index("places_station_area_idx").on(t.areaId).where(sql`spot = true AND bike = false`),
  ]
);

export const bikes = schema.table(
  "bikes",
  {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  networkId: integer("network_id")
    .notNull()
    .references(() => networks.id, {
      onDelete: "cascade",
    }),
  placeId: integer("place_id")
    .notNull()
    .references(() => places.id, {
      onDelete: "cascade",
    }),
  bikeType: integer("bike_type").notNull(),
  lockTypes: jsonb("lock_types").notNull(),
  active: boolean("active").notNull().default(true),
  state: text("state").notNull(),
  electricLock: boolean("electric_lock").notNull().default(false),
  boardComputer: bigint("board_computer", { mode: "number" }).notNull(),
  pedelecBattery: integer("pedelec_battery"),
  batteryPack: jsonb("battery_pack"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("bikes_number_network_id_idx").on(t.number, t.networkId),
    index("bikes_place_id_idx").on(t.placeId),
    index("bikes_network_id_idx").on(t.networkId),
  ]
);

export const bikePositions = schema.table(
  "bike_positions",
  {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  bikeId: integer("bike_id")
    .notNull()
    .references(() => bikes.id, {
      onDelete: "cascade",
    }),
  placeId: integer("place_id")
    .notNull()
    .references(() => places.id, {
      onDelete: "cascade",
    }),
  location: geometry("location", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("bike_positions_bike_id_idx").on(t.bikeId),
    index("bike_positions_created_at_idx").on(t.createdAt),
    index("bike_positions_bike_id_created_at_idx").on(t.bikeId, t.createdAt.desc()),
  ]
);

export const kvCache = schema.table("kv_cache", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bikeMovements = schema.materializedView(
  "bike_movements",
  {
    bikeId: integer("bike_id").notNull(),
    startPositionId: integer("start_position_id").notNull(),
    endPositionId: integer("end_position_id").notNull(),
    startLocation: geometry("start_location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    endLocation: geometry("end_location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    distanceKm: real("distance_km").notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    durationSeconds: doublePrecision("duration_seconds").notNull(),
    plausible: boolean("plausible").notNull(),
    areaId: integer("area_id").notNull(),
    networkId: integer("network_id").notNull(),
  }
).existing();

export type Network = typeof networks.$inferSelect;
export type Area = typeof areas.$inferSelect;
export type Zone = typeof zones.$inferSelect;
export type Place = typeof places.$inferSelect;
export type Bike = typeof bikes.$inferSelect;
export type BikePosition = typeof bikePositions.$inferSelect;
export type BikeMovement = typeof bikeMovements.$inferSelect;
export type KvCache = typeof kvCache.$inferSelect;
