"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";

function formatDistance(km: number): string {
  if (km === 0) return "0 km";
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
  return `${km.toFixed(1)} km`;
}

export default function Home() {
  const trpc = useTRPC();
  const stats = useQuery(trpc.nextbike.getGeneralStats.queryOptions());
  const leaderboardBikes = useQuery(
    trpc.nextbike.getLeaderboardBikes.queryOptions({ limit: 10 })
  );
  const leaderboardAreas = useQuery(
    trpc.nextbike.getLeaderboardAreas.queryOptions({ limit: 10 })
  );
  const leaderboardNetworks = useQuery(
    trpc.nextbike.getLeaderboardNetworks.queryOptions({ limit: 10 })
  );

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Nextbike stats
          </h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Aggregated stats and leaderboards from bike positions and trails.
          </p>
          <Link
            href="/map"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            View map
          </Link>
        </header>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-medium text-zinc-900 dark:text-zinc-50">
            General stats
          </h2>
          {stats.isLoading ? (
            <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
          ) : stats.data ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Bikes" value={stats.data.bikes} />
              <StatCard label="Places" value={stats.data.places} />
              <StatCard label="Areas" value={stats.data.areas} />
              <StatCard label="Networks" value={stats.data.networks} />
              <StatCard label="Zones" value={stats.data.zones} />
              <StatCard
                label="Bike positions"
                value={stats.data.bikePositions}
              />
              <li className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:col-span-2 lg:col-span-3">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total distance (trails)
                </span>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatDistance(stats.data.totalDistanceKm)}
                </p>
              </li>
            </ul>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">No data</p>
          )}
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-medium text-zinc-900 dark:text-zinc-50">
            Top bikes by distance
          </h2>
          <Leaderboard
            loading={leaderboardBikes.isLoading}
            rows={
              leaderboardBikes.data?.map(
                (row: {
                  rank: number;
                  bikeNumber: string;
                  totalDistanceKm: number;
                }) => ({
                  rank: row.rank,
                  label: `Bike #${row.bikeNumber}`,
                  value: formatDistance(row.totalDistanceKm),
                })
              ) ?? []
            }
          />
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-medium text-zinc-900 dark:text-zinc-50">
            Top areas by distance
          </h2>
          <Leaderboard
            loading={leaderboardAreas.isLoading}
            rows={
              leaderboardAreas.data?.map(
                (row: {
                  rank: number;
                  areaName: string;
                  networkName: string;
                  totalDistanceKm: number;
                }) => ({
                  rank: row.rank,
                  label: `${row.areaName} (${row.networkName})`,
                  value: formatDistance(row.totalDistanceKm),
                })
              ) ?? []
            }
          />
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-medium text-zinc-900 dark:text-zinc-50">
            Top networks by distance
          </h2>
          <Leaderboard
            loading={leaderboardNetworks.isLoading}
            rows={
              leaderboardNetworks.data?.map(
                (row: {
                  rank: number;
                  networkName: string;
                  totalDistanceKm: number;
                }) => ({
                  rank: row.rank,
                  label: row.networkName,
                  value: formatDistance(row.totalDistanceKm),
                })
              ) ?? []
            }
          />
        </section>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/map" className="underline hover:no-underline">
            Open the map
          </Link>{" "}
          to explore bikes and trails.
        </p>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value.toLocaleString()}
      </p>
    </li>
  );
}

function Leaderboard({
  loading,
  rows,
}: {
  loading: boolean;
  rows: { rank: number; label: string; value: string }[];
}) {
  if (loading) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">No data</p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Name
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Distance
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr key={row.rank}>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {row.rank}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                {row.label}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
