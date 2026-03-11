import { and, between, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bikes } from "@/db/schema";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const minLat = parseFloat(searchParams.get("minLat") ?? "-90");
  const maxLat = parseFloat(searchParams.get("maxLat") ?? "90");
  const minLng = parseFloat(searchParams.get("minLng") ?? "-180");
  const maxLng = parseFloat(searchParams.get("maxLng") ?? "180");

  const floatingBikes = await db
    .select()
    .from(bikes)
    .where(
      and(
        eq(bikes.spot, true),
        between(bikes.lat, minLat, maxLat),
        between(bikes.lng, minLng, maxLng),
      ),
    );

  return NextResponse.json(floatingBikes);
}
