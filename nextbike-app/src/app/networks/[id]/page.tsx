"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BuildingOffice2Icon,
  ChevronRightIcon,
  GlobeEuropeAfricaIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { TwEmoji } from "@/components/ui/TwEmoji";
import { StatCard } from "@/components/ui/StatCard";
import { CardMessage } from "@/components/ui/CardMessage";
import { formatDistance } from "@/components/ui/formatDistance";
import { countryCodeToFlag } from "@/components/ui/countryFlag";

export default function NetworkPage() {
  const { id } = useParams();
  const networkId = parseInt(id as string, 10);
  const trpc = useTRPC();

  const network = useQuery(trpc.nextbike.getNetwork.queryOptions({ id: networkId }));
  const areasQuery = useQuery(
    trpc.nextbike.getNetworkAreas.queryOptions({ networkId })
  );
  const [areaQuery, setAreaQuery] = useState("");

  const n = network.data;

  const filteredAreas = areasQuery.data?.filter((a) => {
    const q = areaQuery.trim().toLowerCase();
    return !q || a.name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/networks" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition">
            Networks
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
            {n?.name ?? "…"}
          </span>
        </nav>

        {network.isLoading ? (
          <CardMessage>Loading network…</CardMessage>
        ) : !n ? (
          <CardMessage>Network not found.</CardMessage>
        ) : (
          <>
            {/* Header card */}
            <header className="mb-8 flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <TwEmoji
                emoji={countryCodeToFlag(n.country)}
                className="h-10 w-10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{n.name}</h1>
                <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">{n.countryName}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {n.hotline && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                      <TwEmoji emoji="📞" className="h-3.5 w-3.5" />
                      {n.hotline}
                    </span>
                  )}
                  {n.websiteUrl && (
                    <a
                      href={n.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs text-indigo-600 transition hover:bg-indigo-50 dark:border-zinc-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                    >
                      <TwEmoji emoji="🌐" className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </header>

            {/* Stats */}
            <ul className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Available bikes" value={n.availableBikes} icon={TruckIcon} color="sky" />
              <StatCard label="Capacity goal" value={n.setPointBikes} icon={GlobeEuropeAfricaIcon} color="indigo" />
              <StatCard label="Areas" value={n.areaCount} icon={MapPinIcon} color="violet" />
              <StatCard label="Stations" value={n.stationCount} icon={BuildingOffice2Icon} color="emerald" />
            </ul>

            {/* Areas list */}
            <section>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  Areas
                  {areasQuery.data && (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {filteredAreas?.length ?? areasQuery.data.length}
                      {areaQuery && filteredAreas?.length !== areasQuery.data.length
                        ? ` of ${areasQuery.data.length}`
                        : ""}
                    </span>
                  )}
                </h2>
                {areasQuery.data && areasQuery.data.length > 5 && (
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="search"
                      placeholder="Filter areas…"
                      value={areaQuery}
                      onChange={(e) => setAreaQuery(e.target.value)}
                      className="w-48 rounded-xl border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                    />
                  </div>
                )}
              </div>
              {areasQuery.isLoading ? (
                <CardMessage>Loading areas…</CardMessage>
              ) : !filteredAreas?.length ? (
                <CardMessage>{areaQuery ? `No areas match "${areaQuery}".` : "No areas found."}</CardMessage>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {filteredAreas.map((area) => {
                      const avail = area.availableBikes;
                      const pct = area.setPointBikes > 0
                        ? Math.round((avail / area.setPointBikes) * 100)
                        : null;
                      const chipColor =
                        avail === 0
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : avail < (area.setPointBikes ?? 0) * 0.3
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";

                      return (
                        <li key={area.id}>
                          <Link
                            href={`/networks/${networkId}/areas/${area.id}`}
                            className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{area.name}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {area.numPlaces} places · {formatDistance(area.totalDistanceKm)} ridden
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chipColor}`}>
                                {avail} available
                                {pct !== null ? ` (${pct}%)` : ""}
                              </span>
                              <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {areaQuery && filteredAreas.length === 0 && (
                    <p className="px-5 py-4 text-sm text-zinc-400">No areas match &ldquo;{areaQuery}&rdquo;.</p>
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
