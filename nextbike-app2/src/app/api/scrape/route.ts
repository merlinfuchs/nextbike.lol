import { NextResponse } from "next/server";
import { scrape } from "@/lib/scraper";

export async function POST() {
  await scrape();
  return NextResponse.json({ ok: true });
}
