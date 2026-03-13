"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  GlobeEuropeAfricaIcon,
  MapIcon,
  MapPinIcon,
  QueueListIcon,
  SparklesIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
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

  const bikeRows =
    leaderboardBikes.data?.map(
      (row: { rank: number; bikeNumber: string; totalDistanceKm: number }) => ({
        rank: row.rank,
        label: `Bike #${row.bikeNumber}`,
        value: formatDistance(row.totalDistanceKm),
      })
    ) ?? [];

  const areaRows =
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
    ) ?? [];

  const networkRows =
    leaderboardNetworks.data?.map(
      (row: { rank: number; networkName: string; totalDistanceKm: number }) => ({
        rank: row.rank,
        label: row.networkName,
        value: formatDistance(row.totalDistanceKm),
      })
    ) ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              <SparklesIcon className="h-4 w-4" />
              Live movement insights
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Nextbike leaderboard
            </h1>
            <p className="mt-3 max-w-2xl text-base text-zinc-600 dark:text-zinc-300 sm:text-lg">
              Track fleet activity, compare top bikes, and see which areas and
              networks rack up the most distance.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/map"
                className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Open map
              </Link>
              <a
                href="#leaderboards"
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Jump to rankings
              </a>
            </div>
          </div>
        </header>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">General stats</h2>
          {stats.isLoading ? (
            <CardMessage>Loading stats...</CardMessage>
          ) : stats.data ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Bikes" value={stats.data.bikes} icon={TruckIcon} />
              <StatCard
                label="Stations"
                value={stats.data.stations}
                icon={BuildingOffice2Icon}
              />
              <StatCard label="Areas" value={stats.data.areas} icon={MapPinIcon} />
              <StatCard
                label="Networks"
                value={stats.data.networks}
                icon={GlobeEuropeAfricaIcon}
              />
              <StatCard label="Zones" value={stats.data.zones} icon={MapIcon} />
              <StatCard
                label="Bike positions"
                value={stats.data.bikePositions}
                icon={QueueListIcon}
              />
              <li className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:col-span-2 lg:col-span-2">
                <div className="inline-flex rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:text-sky-300">
                  <ArrowTrendingUpIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Total plausible distance
                </p>
                <p className="mt-1 text-3xl font-semibold">
                  {formatDistance(stats.data.totalDistanceKm)}
                </p>
              </li>
            </ul>
          ) : (
            <CardMessage>No stats available.</CardMessage>
          )}
        </section>

        <section id="leaderboards" className="mt-10 grid gap-6 lg:grid-cols-3">
          <LeaderboardCard
            title="Top bikes"
            subtitle="By plausible distance"
            loading={leaderboardBikes.isLoading}
            rows={bikeRows}
          />
          <LeaderboardCard
            title="Top areas"
            subtitle="By plausible distance"
            loading={leaderboardAreas.isLoading}
            rows={areaRows}
          />
          <LeaderboardCard
            title="Top networks"
            subtitle="By plausible distance"
            loading={leaderboardNetworks.isLoading}
            rows={networkRows}
          />
        </section>
      </main>
    </div>
  );
}

function CardMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="inline-flex rounded-lg bg-zinc-100 p-2 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</p>
    </li>
  );
}

function LeaderboardCard({
  title,
  subtitle,
  loading,
  rows,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  rows: { rank: number; label: string; value: string }[];
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      {loading ? (
        <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">No data</p>
      ) : (
        <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => (
            <li key={row.rank} className="flex items-center gap-3 px-5 py-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {row.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{row.label}</span>
              <span className="text-sm font-medium">{row.value}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
