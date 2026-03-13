"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowTrendingUpIcon,
  BoltIcon,
  ChevronRightIcon,
  ClockIcon,
  MapIcon,
  MapPinIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { TwEmoji } from "@/components/ui/TwEmoji";
import { StatCard } from "@/components/ui/StatCard";
import { CardMessage } from "@/components/ui/CardMessage";
import { countryCodeToFlag } from "@/components/ui/countryFlag";
import { formatDistance } from "@/components/ui/formatDistance";

export default function BikePage() {
  const { bikeId } = useParams();
  const bikeIdNum = parseInt(bikeId as string, 10);
  const trpc = useTRPC();

  const bikeQuery = useQuery(
    trpc.nextbike.getBike.queryOptions({ id: bikeIdNum })
  );
  const movementsQuery = useQuery(
    trpc.nextbike.getBikeRecentMovements.queryOptions({
      bikeId: bikeIdNum,
      limit: 20,
    })
  );

  const bike = bikeQuery.data;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/networks" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
            Networks
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
          {bike ? (
            <>
              <Link
                href={`/networks/${bike.networkId}`}
                className="flex items-center gap-1 transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <TwEmoji emoji={countryCodeToFlag(bike.country)} className="h-4 w-4" />
                {bike.networkName}
              </Link>
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
              <Link
                href={`/networks/${bike.networkId}/areas/${bike.areaId}`}
                className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {bike.areaName}
              </Link>
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
            </>
          ) : (
            <>
              <span className="text-zinc-400">Network</span>
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="text-zinc-400">Area</span>
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
            </>
          )}
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
            Bike #{bike?.number ?? "…"}
          </span>
        </nav>

        {bikeQuery.isLoading ? (
          <CardMessage>Loading bike…</CardMessage>
        ) : !bike ? (
          <CardMessage>Bike not found.</CardMessage>
        ) : (
          <>
            {/* Header */}
            <header className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-sm">
                  <TwEmoji emoji="🚲" className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                      Bike #{bike.number}
                    </h1>
                    <Link
                      href={`/map?bikeId=${bike.id}&lat=${bike.lat}&lng=${bike.lng}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                    >
                      <MapIcon className="h-4 w-4" />
                      View on map
                    </Link>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {bike.bikeType !== null && (
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        Type {bike.bikeType}
                      </span>
                    )}
                    {bike.electricLock && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                        <BoltIcon className="h-3 w-3" />
                        Electric lock
                      </span>
                    )}
                    {bike.pedelecBattery !== undefined && (
                      <BatteryChip pct={bike.pedelecBattery} />
                    )}
                    {!bike.active && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Inactive
                      </span>
                    )}
                    {bike.state && bike.state !== "ok" && (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {bike.state}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {bike.areaName} · {bike.networkName} · {bike.countryName}
                  </p>
                </div>
              </div>
            </header>

            {/* Stats */}
            <ul className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total distance"
                value={formatDistance(bike.totalDistanceKm)}
                icon={ArrowTrendingUpIcon}
                color="sky"
              />
              <StatCard
                label="Trips recorded"
                value={bike.tripCount}
                icon={TruckIcon}
                color="indigo"
              />
              <li className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="inline-flex rounded-xl bg-violet-100 p-2 dark:bg-violet-900/30">
                  <MapPinIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Currently at</p>
                {bike.placeIsStation ? (
                  <Link
                    href={`/stations/${bike.placeId}`}
                    className="mt-1 block truncate text-lg font-bold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                  >
                    {bike.placeName}
                  </Link>
                ) : (
                  <p className="mt-1 truncate text-lg font-bold">
                    Floating in {bike.areaName}
                  </p>
                )}
                {bike.placeAddress && (
                  <p className="mt-0.5 truncate text-xs text-zinc-400">{bike.placeAddress}</p>
                )}
              </li>
              <li className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="inline-flex rounded-xl bg-zinc-100 p-2 dark:bg-zinc-800">
                  <ClockIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                </div>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Last seen</p>
                <p className="mt-1 text-lg font-bold">{timeAgo(bike.updatedAt)}</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {new Date(bike.updatedAt).toLocaleString()}
                </p>
              </li>
            </ul>

            {/* Recent movements */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <TwEmoji emoji="🗺️" className="h-5 w-5" />
                Recent trips
                {movementsQuery.data && movementsQuery.data.length > 0 && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {movementsQuery.data.length}
                  </span>
                )}
              </h2>

              {movementsQuery.isLoading ? (
                <CardMessage>Loading trips…</CardMessage>
              ) : !movementsQuery.data?.length ? (
                <CardMessage>No trips recorded yet.</CardMessage>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {movementsQuery.data.map((movement, i) => (
                      <li
                        key={i}
                        className={`flex items-center gap-4 px-5 py-3.5 ${
                          !movement.plausible ? "opacity-50" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {new Date(movement.startTime).toLocaleString()}
                          </p>
                          <p className="text-xs text-zinc-400">
                            Duration: {formatDuration(movement.durationSeconds)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              movement.plausible
                                ? "text-zinc-700 dark:text-zinc-200"
                                : "text-zinc-400"
                            }`}
                          >
                            {formatDistance(movement.distanceKm)}
                          </span>
                          {!movement.plausible && (
                            <span className="text-xs text-zinc-400">implausible</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function BatteryChip({ pct }: { pct: number }) {
  const color =
    pct >= 60
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : pct >= 25
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      <BoltIcon className="h-3 w-3" />
      {pct}%
    </span>
  );
}

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
