"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BoltIcon,
  BuildingOffice2Icon,
  ChevronRightIcon,
  MapPinIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { TwEmoji } from "@/components/ui/TwEmoji";
import { StatCard } from "@/components/ui/StatCard";
import { CardMessage } from "@/components/ui/CardMessage";
import { countryCodeToFlag } from "@/components/ui/countryFlag";
import { formatDistance } from "@/components/ui/formatDistance";

const LIMIT = 300;

export default function AreaPage() {
  const { id, areaId } = useParams();
  const networkId = parseInt(id as string, 10);
  const areaIdNum = parseInt(areaId as string, 10);
  const trpc = useTRPC();

  const areaQuery = useQuery(trpc.nextbike.getArea.queryOptions({ id: areaIdNum }));
  const stationsQuery = useQuery(
    trpc.nextbike.getAreaStations.queryOptions({ areaId: areaIdNum })
  );
  const bikesQuery = useQuery(
    trpc.nextbike.getAreaBikes.queryOptions({ areaId: areaIdNum })
  );

  const area = areaQuery.data;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/networks" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
            Networks
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
          {area ? (
            <>
              <Link
                href={`/networks/${networkId}`}
                className="flex items-center gap-1 transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <TwEmoji emoji={countryCodeToFlag(area.country)} className="h-4 w-4" />
                {area.networkName}
              </Link>
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
            </>
          ) : (
            <>
              <Link
                href={`/networks/${networkId}`}
                className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Network
              </Link>
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
            </>
          )}
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
            {area?.name ?? "…"}
          </span>
        </nav>

        {areaQuery.isLoading ? (
          <CardMessage>Loading area…</CardMessage>
        ) : !area ? (
          <CardMessage>Area not found.</CardMessage>
        ) : (
          <>
            {/* Header */}
            <header className="mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{area.name}</h1>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                {area.networkName} · {area.countryName}
              </p>
            </header>

            {/* Stats */}
            <ul className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Available bikes" value={area.availableBikes} icon={TruckIcon} color="sky" />
              <StatCard label="Capacity goal" value={area.setPointBikes} icon={MapPinIcon} color="indigo" />
              <StatCard
                label="Stations"
                value={stationsQuery.data?.length ?? area.numPlaces}
                icon={BuildingOffice2Icon}
                color="violet"
              />
              <StatCard
                label="Floating bikes"
                value={bikesQuery.data?.length ?? 0}
                icon={BoltIcon}
                color="emerald"
              />
            </ul>

            {/* Stations */}
            <section className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <TwEmoji emoji="🚏" className="h-5 w-5" />
                Stations
                {stationsQuery.data && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {stationsQuery.data.length}
                    {stationsQuery.data.length === LIMIT && "+"}
                  </span>
                )}
              </h2>

              {stationsQuery.isLoading ? (
                <CardMessage>Loading stations…</CardMessage>
              ) : !stationsQuery.data?.length ? (
                <CardMessage>No stations found.</CardMessage>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {stationsQuery.data.map((station) => {
                      const avail = station.bikesAvailableToRent;
                      const total = station.bikeRacks;
                      const chipColor =
                        avail === 0
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : avail <= 2
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";

                      return (
                        <li key={station.id}>
                        <Link
                          href={`/stations/${station.id}`}
                          className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">{station.name}</p>
                              {station.maintenance && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                  <WrenchScrewdriverIcon className="h-3 w-3" />
                                  Maintenance
                                </span>
                              )}
                            </div>
                            {station.address && (
                              <p className="truncate text-xs text-zinc-400">{station.address}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chipColor}`}>
                              {avail} / {total} bikes
                            </span>
                            {station.freeRacks > 0 && (
                              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {station.freeRacks} free racks
                              </span>
                            )}
                            <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
                          </div>
                        </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {stationsQuery.data.length === LIMIT && (
                    <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-400 dark:border-zinc-800">
                      Showing first {LIMIT} stations
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Floating bikes */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <TwEmoji emoji="🚲" className="h-5 w-5" />
                Floating bikes
                {bikesQuery.data && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {bikesQuery.data.length}
                    {bikesQuery.data.length === LIMIT && "+"}
                  </span>
                )}
              </h2>

              {bikesQuery.isLoading ? (
                <CardMessage>Loading bikes…</CardMessage>
              ) : !bikesQuery.data?.length ? (
                <CardMessage>No floating bikes in this area right now.</CardMessage>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {bikesQuery.data.map((bike) => (
                      <li key={bike.id}>
                      <Link
                        href={`/bikes/${bike.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        <span className="shrink-0 font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                          #{bike.number}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
                          {bike.pedelecBattery !== null && bike.pedelecBattery !== undefined && (
                            <BatteryChip pct={bike.pedelecBattery} />
                          )}
                          {bike.state && bike.state !== "ok" && (
                            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              {bike.state}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex flex-col items-end gap-0.5">
                            {bike.totalDistanceKm > 0 && (
                              <span className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                                {formatDistance(bike.totalDistanceKm)}
                              </span>
                            )}
                            <span className="text-xs text-zinc-400">
                              {timeAgo(bike.updatedAt)}
                            </span>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
                        </div>
                      </Link>
                      </li>
                    ))}
                  </ul>
                  {bikesQuery.data.length === LIMIT && (
                    <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-400 dark:border-zinc-800">
                      Showing first {LIMIT} bikes
                    </p>
                  )}
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
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
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
