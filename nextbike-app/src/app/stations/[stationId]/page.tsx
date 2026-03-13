"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BoltIcon,
  BuildingOffice2Icon,
  ChevronRightIcon,
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

export default function StationPage() {
  const { stationId } = useParams();
  const stationIdNum = parseInt(stationId as string, 10);
  const trpc = useTRPC();

  const stationQuery = useQuery(
    trpc.nextbike.getStation.queryOptions({ id: stationIdNum })
  );

  const station = stationQuery.data;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/networks"
            className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Networks
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
          {station ? (
            <>
              <Link
                href={`/networks/${station.networkId}`}
                className="flex items-center gap-1 transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <TwEmoji
                  emoji={countryCodeToFlag(station.country)}
                  className="h-4 w-4"
                />
                {station.networkName}
              </Link>
              <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
              <Link
                href={`/networks/${station.networkId}/areas/${station.areaId}`}
                className="transition hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {station.areaName}
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
            {station?.name ?? "…"}
          </span>
        </nav>

        {stationQuery.isLoading ? (
          <CardMessage>Loading station…</CardMessage>
        ) : !station ? (
          <CardMessage>Station not found.</CardMessage>
        ) : (
          <>
            {/* Header */}
            <header className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                  <BuildingOffice2Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                      {station.name}
                    </h1>
                    {station.maintenance && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <WrenchScrewdriverIcon className="h-4 w-4" />
                        Under maintenance
                      </span>
                    )}
                  </div>
                  {station.address && (
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                      {station.address}
                    </p>
                  )}
                  <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">
                    {station.areaName} · {station.networkName} ·{" "}
                    {station.countryName}
                  </p>
                </div>
              </div>
            </header>

            {/* Stats */}
            <ul className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Available bikes"
                value={station.bikesAvailableToRent}
                icon={TruckIcon}
                color="sky"
              />
              <StatCard
                label="Total racks"
                value={station.bikeRacks}
                icon={BuildingOffice2Icon}
                color="indigo"
              />
              <StatCard
                label="Free racks"
                value={station.freeRacks}
                icon={BuildingOffice2Icon}
                color="emerald"
              />
              <StatCard
                label="Booked bikes"
                value={station.bookedBikes}
                icon={TruckIcon}
                color="amber"
              />
            </ul>

            {/* Parked bikes */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <TwEmoji emoji="🚲" className="h-5 w-5" />
                Bikes here now
                {station.bikes.length > 0 && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {station.bikes.length}
                  </span>
                )}
              </h2>

              {station.bikes.length === 0 ? (
                <CardMessage>No bikes parked here right now.</CardMessage>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {station.bikes.map((bike) => (
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
                            {bike.pedelecBattery !== null &&
                              bike.pedelecBattery !== undefined && (
                                <BatteryChip pct={bike.pedelecBattery} />
                              )}
                            {bike.state && bike.state !== "ok" && (
                              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {bike.state}
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {bike.totalDistanceKm > 0 && (
                              <span className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                                {formatDistance(bike.totalDistanceKm)}
                              </span>
                            )}
                            <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
                          </div>
                        </Link>
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
