import { sql } from "drizzle-orm";
import { db } from "./index";

export async function initDb() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cities (
      uid INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      available_bikes INTEGER NOT NULL DEFAULT 0,
      booked_bikes INTEGER NOT NULL DEFAULT 0,
      last_seen_at TIMESTAMPTZ NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS places (
      uid INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      spot BOOLEAN NOT NULL DEFAULT FALSE,
      bikes INTEGER NOT NULL DEFAULT 0,
      bikes_available_to_rent INTEGER NOT NULL DEFAULT 0,
      booked_bikes INTEGER NOT NULL DEFAULT 0,
      bike_racks INTEGER NOT NULL DEFAULT 0,
      city_id INTEGER,
      last_seen_at TIMESTAMPTZ NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_places_latng ON places (lat, lng)
  `);

  // GiST index for PostGIS spatial queries (nearest-bike, radius search, etc.)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_places_geo
      ON places USING GIST (ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bikes (
      number TEXT PRIMARY KEY,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      place_id INTEGER,
      spot BOOLEAN NOT NULL DEFAULT FALSE,
      last_seen_at TIMESTAMPTZ NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_bikes_floating_latng
      ON bikes (lat, lng) WHERE spot = FALSE
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_bikes_geo
      ON bikes USING GIST (ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bike_positions (
      id BIGSERIAL PRIMARY KEY,
      bike_number TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      place_id INTEGER,
      recorded_at TIMESTAMPTZ NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_bike_positions_lookup
      ON bike_positions (bike_number, recorded_at DESC)
  `);

  console.log("[db] Schema ready");
}
