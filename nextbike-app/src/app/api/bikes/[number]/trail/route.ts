import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bikePositions } from "@/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const trail = await db
    .select()
    .from(bikePositions)
    .where(eq(bikePositions.bikeNumber, number))
    .orderBy(desc(bikePositions.recordedAt))
    .limit(10);
  return NextResponse.json(trail);
}
