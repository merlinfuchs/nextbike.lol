"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  ChevronRightIcon,
  GlobeEuropeAfricaIcon,
  MapIcon,
  MapPinIcon,
  QueueListIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { TwEmoji } from "@/components/ui/TwEmoji";
import { StatCard } from "@/components/ui/StatCard";
import { CardMessage } from "@/components/ui/CardMessage";
import { formatDistance } from "@/components/ui/formatDistance";

const MEDAL_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

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
      (row: { rank: number; bikeId: number; bikeNumber: string; totalDistanceKm: number }) => ({
        rank: row.rank,
        label: `Bike #${row.bikeNumber}`,
        value: formatDistance(row.totalDistanceKm),
        href: `/bikes/${row.bikeId}`,
      })
    ) ?? [];

  const areaRows =
    leaderboardAreas.data?.map(
      (row: {
        rank: number;
        areaId: number;
        areaName: string;
        networkId: number;
        networkName: string;
        totalDistanceKm: number;
      }) => ({
        rank: row.rank,
        label: `${row.areaName} (${row.networkName})`,
        value: formatDistance(row.totalDistanceKm),
        href: `/networks/${row.networkId}/areas/${row.areaId}`,
      })
    ) ?? [];

  const networkRows =
    leaderboardNetworks.data?.map(
      (row: { rank: number; networkId: number; networkName: string; totalDistanceKm: number }) => ({
        rank: row.rank,
        label: row.networkName,
        value: formatDistance(row.totalDistanceKm),
        href: `/networks/${row.networkId}`,
      })
    ) ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Hero ── */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900 p-8 shadow-xl sm:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute right-1/4 top-1/3 h-32 w-32 rounded-full bg-yellow-300/20 blur-2xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                <TwEmoji emoji="🟢" className="inline-block h-4 w-4 animate-pulse" />
                Live tracking · updated every 5 min
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
                nextbike<span className="text-yellow-300">.lol</span>
              </h1>
              <p className="mt-3 max-w-xl text-base text-white/80 sm:text-lg">
                Who&apos;s the hardest-working bike in the fleet? Find out which
                bikes, stations, and networks clock the most km — live.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-md transition hover:scale-105 hover:shadow-lg active:scale-95"
                >
                  <TwEmoji emoji="🗺️" className="h-4 w-4" />
                  Open map
                </Link>
                <a
                  href="#leaderboards"
                  className="inline-flex items-center gap-2 justify-center rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
                >
                  <TwEmoji emoji="🏆" className="h-4 w-4" />
                  See rankings
                </a>
              </div>
            </div>

            <div className="relative hidden shrink-0 sm:block">
              <div className="absolute inset-0 rounded-full bg-indigo-400/20 blur-2xl scale-110" />
              <img
                src="/cyclist.svg"
                alt="Cyclist"
                className="relative h-44 w-44 drop-shadow-2xl lg:h-56 lg:w-56"
              />
            </div>
          </div>
        </header>

        {/* ── Stats ── */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Fleet at a glance</h2>
          {stats.isLoading ? (
            <CardMessage>Crunching numbers…</CardMessage>
          ) : stats.data ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Bikes" value={stats.data.bikes} icon={TruckIcon} color="sky" />
              <StatCard label="Stations" value={stats.data.stations} icon={BuildingOffice2Icon} color="indigo" />
              <StatCard label="Areas" value={stats.data.areas} icon={MapPinIcon} color="violet" />
              <StatCard label="Networks" value={stats.data.networks} icon={GlobeEuropeAfricaIcon} color="emerald" href="/networks" />
              <StatCard label="Zones" value={stats.data.zones} icon={MapIcon} color="amber" />
              <StatCard label="Bike positions" value={stats.data.bikePositions} icon={QueueListIcon} color="rose" />
              <li className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 sm:col-span-2 lg:col-span-2">
                <div className="inline-flex rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 p-2 text-white shadow-sm">
                  <ArrowTrendingUpIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Total plausible distance
                </p>
                <p className="mt-1 bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-3xl font-extrabold text-transparent">
                  {formatDistance(stats.data.totalDistanceKm)}
                </p>
              </li>
            </ul>
          ) : (
            <CardMessage>No stats available.</CardMessage>
          )}
        </section>

        {/* ── Leaderboards ── */}
        <section id="leaderboards" className="mt-10 grid gap-6 lg:grid-cols-3">
          <LeaderboardCard
            title={<><TwEmoji emoji="🚲" className="inline h-5 w-5" /> Top bikes</>}
            subtitle="By plausible distance ridden"
            loading={leaderboardBikes.isLoading}
            rows={bikeRows}
          />
          <LeaderboardCard
            title={<><TwEmoji emoji="📍" className="inline h-5 w-5" /> Top areas</>}
            subtitle="By plausible distance"
            loading={leaderboardAreas.isLoading}
            rows={areaRows}
          />
          <LeaderboardCard
            title={<><TwEmoji emoji="🌍" className="inline h-5 w-5" /> Top networks</>}
            subtitle="By plausible distance"
            loading={leaderboardNetworks.isLoading}
            rows={networkRows}
          />
        </section>

        <footer className="mt-12 text-center text-xs text-zinc-400 dark:text-zinc-600">
          Not affiliated with Nextbike GmbH · data fetched from the public API ·{" "}
          <a
            href="https://github.com/merlinfuchs/nextbike.lol"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
          >
            GitHub
          </a>
        </footer>
      </main>
    </div>
  );
}


function LeaderboardCard({
  title,
  subtitle,
  loading,
  rows,
}: {
  title: React.ReactNode;
  subtitle: string;
  loading: boolean;
  rows: { rank: number; label: string; value: string; href?: string }[];
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h3 className="flex items-center gap-2 text-lg font-bold">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      {loading ? (
        <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">No data yet</p>
      ) : (
        <ol className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {rows.map((row) => {
            const inner = (
              <>
                {MEDAL_EMOJI[row.rank] ? (
                  <TwEmoji
                    emoji={MEDAL_EMOJI[row.rank]}
                    className="h-6 w-6 shrink-0"
                  />
                ) : (
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {row.rank}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{row.label}</span>
                <span className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                  {row.value}
                </span>
                {row.href && (
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
                )}
              </>
            );
            return row.href ? (
              <li key={row.rank}>
                <Link
                  href={row.href}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                >
                  {inner}
                </Link>
              </li>
            ) : (
              <li
                key={row.rank}
                className="flex items-center gap-3 px-5 py-3"
              >
                {inner}
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
