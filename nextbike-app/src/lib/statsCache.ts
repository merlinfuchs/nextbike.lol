import { sql } from "drizzle-orm";
import { db } from "@/db";
import { kvCache } from "@/db/schema";

export type GeneralStatsPayload = {
  bikes: number;
  stations: number;
  areas: number;
  networks: number;
  zones: number;
  bikePositions: number;
  totalDistanceKm: number;
};

export type LeaderboardBikeRow = {
  rank: number;
  bikeId: number;
  bikeNumber: string;
  totalDistanceKm: number;
};

export type LeaderboardAreaRow = {
  rank: number;
  areaId: number;
  areaName: string;
  networkId: number;
  networkName: string;
  totalDistanceKm: number;
};

export type LeaderboardNetworkRow = {
  rank: number;
  networkId: number;
  networkName: string;
  totalDistanceKm: number;
};

const LEADERBOARD_LIMIT = 10;

export const CACHE_KEYS = {
  GENERAL_STATS: "general_stats",
  LEADERBOARD_BIKES: "leaderboard_bikes",
  LEADERBOARD_AREAS: "leaderboard_areas",
  LEADERBOARD_NETWORKS: "leaderboard_networks",
} as const;

async function upsert(key: string, payload: unknown) {
  const now = new Date();
  await db
    .insert(kvCache)
    .values({ key, payload: payload as object, updatedAt: now })
    .onConflictDoUpdate({
      target: kvCache.key,
      set: { payload: payload as object, updatedAt: now },
    });
}

async function computeGeneralStats(): Promise<GeneralStatsPayload> {
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
      (SELECT count(*)::bigint FROM "nextbike"."bike_positions") AS bike_positions,
      coalesce(round((SELECT sum(distance_km) FROM "nextbike"."bike_movements" WHERE plausible = true))::numeric, 0) AS total_distance_km
  `);
  return {
    bikes: Number(row?.bikes ?? 0),
    stations: Number(row?.stations ?? 0),
    areas: Number(row?.areas ?? 0),
    networks: Number(row?.networks ?? 0),
    zones: Number(row?.zones ?? 0),
    bikePositions: Number(row?.bike_positions ?? 0),
    totalDistanceKm: Number(row?.total_distance_km ?? 0),
  };
}

async function computeLeaderboardBikes(): Promise<LeaderboardBikeRow[]> {
  const rows = await db.execute<{
    bike_id: number;
    number: string;
    total_distance_km: number;
  }>(sql`
    SELECT bm.bike_id, b.number, sum(bm.distance_km) AS total_distance_km
    FROM "nextbike"."bike_movements" bm
    JOIN "nextbike"."bikes" b ON b.id = bm.bike_id
    WHERE bm.plausible = true
    GROUP BY bm.bike_id, b.number
    ORDER BY total_distance_km DESC
    LIMIT ${LEADERBOARD_LIMIT}
  `);
  return rows.map((r, i) => ({
    rank: i + 1,
    bikeId: r.bike_id,
    bikeNumber: r.number,
    totalDistanceKm: Number(r.total_distance_km ?? 0),
  }));
}

async function computeLeaderboardAreas(): Promise<LeaderboardAreaRow[]> {
  const rows = await db.execute<{
    area_id: number;
    area_name: string;
    network_id: number;
    network_name: string;
    total_distance_km: number;
  }>(sql`
    SELECT bm.area_id, a.name AS area_name, n.id AS network_id, n.name AS network_name,
           sum(bm.distance_km) AS total_distance_km
    FROM "nextbike"."bike_movements" bm
    JOIN "nextbike"."areas" a ON a.id = bm.area_id
    JOIN "nextbike"."networks" n ON n.id = a.network_id
    WHERE bm.plausible = true
    GROUP BY bm.area_id, a.name, n.id, n.name
    ORDER BY total_distance_km DESC
    LIMIT ${LEADERBOARD_LIMIT}
  `);
  return rows.map((r, i) => ({
    rank: i + 1,
    areaId: r.area_id,
    areaName: r.area_name,
    networkId: r.network_id,
    networkName: r.network_name,
    totalDistanceKm: Number(r.total_distance_km ?? 0),
  }));
}

async function computeLeaderboardNetworks(): Promise<LeaderboardNetworkRow[]> {
  const rows = await db.execute<{
    network_id: number;
    network_name: string;
    total_distance_km: number;
  }>(sql`
    SELECT bm.network_id, n.name AS network_name, sum(bm.distance_km) AS total_distance_km
    FROM "nextbike"."bike_movements" bm
    JOIN "nextbike"."networks" n ON n.id = bm.network_id
    WHERE bm.plausible = true
    GROUP BY bm.network_id, n.name
    ORDER BY total_distance_km DESC
    LIMIT ${LEADERBOARD_LIMIT}
  `);
  return rows.map((r, i) => ({
    rank: i + 1,
    networkId: r.network_id,
    networkName: r.network_name,
    totalDistanceKm: Number(r.total_distance_km ?? 0),
  }));
}

export async function refreshStatsCache() {
  const start = Date.now();
  const [general, lbBikes, lbAreas, lbNetworks] = await Promise.all([
    computeGeneralStats(),
    computeLeaderboardBikes(),
    computeLeaderboardAreas(),
    computeLeaderboardNetworks(),
  ]);
  await Promise.all([
    upsert(CACHE_KEYS.GENERAL_STATS, general),
    upsert(CACHE_KEYS.LEADERBOARD_BIKES, lbBikes),
    upsert(CACHE_KEYS.LEADERBOARD_AREAS, lbAreas),
    upsert(CACHE_KEYS.LEADERBOARD_NETWORKS, lbNetworks),
  ]);
  console.log(`[stats-cache] refreshed in ${Date.now() - start}ms`);
}
