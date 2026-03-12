import { sql } from "drizzle-orm";
import { db } from "@/db";
import { bikes, bikePositions, cities, places } from "@/db/schema";
import { haversineDistance } from "./geo";

const LIVE_DATA_URL = "https://maps.nextbike.net/maps/nextbike-live.flatjson";
const CHUNK_SIZE = 200;
const POSITION_THRESHOLD_METERS = 50;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

interface NextbikeCity {
  uid: number;
  name: string;
  lat: number;
  lng: number;
  available_bikes: number;
  booked_bikes: number;
}

interface NextbikePlace {
  uid: number;
  name: string;
  lat: number;
  lng: number;
  spot: boolean;
  bikes: number;
  bikes_available_to_rent: number;
  booked_bikes: number;
  bike_racks: number;
  city_id: number;
}

interface NextbikeBike {
  number: string;
  active: boolean;
  bike_type: number;
  place_id: number;
  state: string;
  lat?: number;
  lng?: number;
}

interface NextbikeLiveData {
  cities: NextbikeCity[];
  places: NextbikePlace[];
  bikes: NextbikeBike[];
}

export async function scrape() {
  console.log("[scraper] Starting scrape at", new Date().toISOString());

  const resp = await fetch(LIVE_DATA_URL);
  if (!resp.ok) throw new Error(`Failed to fetch live data: ${resp.status}`);

  const data: NextbikeLiveData = await resp.json();
  const now = new Date();

  // --- cities ---
  for (const batch of chunk(data.cities, CHUNK_SIZE)) {
    await db
      .insert(cities)
      .values(
        batch.map((c) => ({
          uid: c.uid,
          name: c.name,
          lat: c.lat,
          lng: c.lng,
          availableBikes: c.available_bikes ?? 0,
          bookedBikes: c.booked_bikes ?? 0,
          lastSeenAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: cities.uid,
        set: {
          name: sql`excluded.name`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          availableBikes: sql`excluded.available_bikes`,
          bookedBikes: sql`excluded.booked_bikes`,
          lastSeenAt: sql`excluded.last_seen_at`,
        },
      });
  }

  // --- places ---
  for (const batch of chunk(data.places, CHUNK_SIZE)) {
    await db
      .insert(places)
      .values(
        batch.map((p) => ({
          uid: p.uid,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          spot: p.spot ?? false,
          bikes: p.bikes ?? 0,
          bikesAvailableToRent: p.bikes_available_to_rent ?? 0,
          bookedBikes: p.booked_bikes ?? 0,
          bikeRacks: p.bike_racks ?? 0,
          cityId: p.city_id ?? null,
          lastSeenAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: places.uid,
        set: {
          name: sql`excluded.name`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          spot: sql`excluded.spot`,
          bikes: sql`excluded.bikes`,
          bikesAvailableToRent: sql`excluded.bikes_available_to_rent`,
          bookedBikes: sql`excluded.booked_bikes`,
          bikeRacks: sql`excluded.bike_racks`,
          cityId: sql`excluded.city_id`,
          lastSeenAt: sql`excluded.last_seen_at`,
        },
      });
  }

  // --- bikes ---
  const rawBikes: NextbikeBike[] = data.bikes ?? [];
  if (rawBikes.length === 0) {
    console.log("[scraper] No bikes in response, skipping bike tracking");
    return;
  }

  // Build place position lookup from this scrape's places data
  const placeMap = new Map<number, { lat: number; lng: number; bikeRacks: number }>();
  for (const p of data.places) {
    if (p.lat && p.lng) placeMap.set(p.uid, { lat: p.lat, lng: p.lng, bikeRacks: p.bike_racks ?? 0 });
  }

  // Load all current bike positions from DB into memory for comparison
  const storedBikes = await db.select().from(bikes);
  const storedMap = new Map<string, { lat: number; lng: number }>();
  for (const b of storedBikes) storedMap.set(b.number, { lat: b.lat, lng: b.lng });

  // Categorise each bike
  const bikeUpserts: (typeof bikes.$inferInsert)[] = [];
  const positionInserts: (typeof bikePositions.$inferInsert)[] = [];

  for (const bike of rawBikes) {
    // Resolve position: direct coords take priority, then via place
    let lat: number | undefined;
    let lng: number | undefined;

    if (bike.lat && bike.lng) {
      lat = bike.lat;
      lng = bike.lng;
    } else if (bike.place_id) {
      const place = placeMap.get(bike.place_id);
      if (place) { lat = place.lat; lng = place.lng; }
    }

    if (lat === undefined || lng === undefined) continue;

    // A bike is floating (shown as individual dot) if its place has no physical racks
    const placeRacks = placeMap.get(bike.place_id)?.bikeRacks ?? 1;
    const isFloating = (bike.lat && bike.lng) ? true : placeRacks === 0;

    bikeUpserts.push({ number: bike.number, lat, lng, placeId: bike.place_id ?? null, spot: isFloating, lastSeenAt: now });

    const stored = storedMap.get(bike.number);
    const isNew = !stored;
    const hasMoved =
      stored && haversineDistance(stored.lat, stored.lng, lat, lng) > POSITION_THRESHOLD_METERS;

    if (isNew || hasMoved) {
      positionInserts.push({ bikeNumber: bike.number, lat, lng, placeId: bike.place_id ?? null, recordedAt: now });
    }
  }

  // Upsert current bike positions
  for (const batch of chunk(bikeUpserts, CHUNK_SIZE)) {
    await db
      .insert(bikes)
      .values(batch)
      .onConflictDoUpdate({
        target: bikes.number,
        set: {
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          placeId: sql`excluded.place_id`,
          spot: sql`excluded.spot`,
          lastSeenAt: sql`excluded.last_seen_at`,
        },
      });
  }

  // Insert position history for bikes that moved or are new
  for (const batch of chunk(positionInserts, CHUNK_SIZE)) {
    await db.insert(bikePositions).values(batch);
  }

  console.log(
    `[scraper] Done: ${data.cities.length} cities, ${data.places.length} places, ` +
    `${bikeUpserts.length} bikes tracked, ${positionInserts.length} new positions recorded`,
  );
}
