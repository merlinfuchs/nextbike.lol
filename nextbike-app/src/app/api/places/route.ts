import { and, between, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { places } from "@/db/schema";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const minLat = parseFloat(searchParams.get("minLat") ?? "-90");
  const maxLat = parseFloat(searchParams.get("maxLat") ?? "90");
  const minLng = parseFloat(searchParams.get("minLng") ?? "-180");
  const maxLng = parseFloat(searchParams.get("maxLng") ?? "180");

  // Only show places with physical racks — flex drop-zones (no racks) are shown as individual bike dots
  const stations = await db
    .select()
    .from(places)
    .where(
      and(
        gt(places.bikeRacks, 0),
        between(places.lat, minLat, maxLat),
        between(places.lng, minLng, maxLng),
      ),
    );

  return NextResponse.json(stations);
}
