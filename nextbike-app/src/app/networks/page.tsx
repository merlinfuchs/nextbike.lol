"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BuildingOffice2Icon,
  GlobeEuropeAfricaIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { TwEmoji } from "@/components/ui/TwEmoji";
import { CardMessage } from "@/components/ui/CardMessage";
import { formatDistance } from "@/components/ui/formatDistance";
import { countryCodeToFlag } from "@/components/ui/countryFlag";

export default function NetworksPage() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.nextbike.getNetworks.queryOptions());
  const [query, setQuery] = useState("");

  const filtered = data?.filter((n) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return n.name.toLowerCase().includes(q) || n.countryName.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Networks</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            All Nextbike operating regions worldwide
          </p>
        </header>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search by name or country…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
          />
        </div>

        {isLoading ? (
          <CardMessage>Loading networks…</CardMessage>
        ) : !filtered?.length ? (
          <CardMessage>{query ? `No networks match "${query}".` : "No networks found."}</CardMessage>
        ) : (
          <>
            {query && (
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                {filtered.length} of {data?.length} networks
              </p>
            )}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((n) => (
              <li key={n.id} >
                <Link
                  href={`/networks/${n.id}`}
                  className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {/* Header row */}
                  <div className="flex items-start gap-3">
                    <TwEmoji
                      emoji={countryCodeToFlag(n.country)}
                      className="mt-0.5 h-6 w-6 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold leading-tight">{n.name}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{n.countryName}</p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Stat icon={MapPinIcon} label="Areas" value={n.areaCount} />
                    <Stat icon={BuildingOffice2Icon} label="Stations" value={n.stationCount} />
                    <Stat icon={TruckIcon} label="Available" value={n.availableBikes} />
                    <Stat
                      icon={GlobeEuropeAfricaIcon}
                      label="Distance"
                      value={formatDistance(n.totalDistanceKm)}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
      <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
      <div className="min-w-0">
        <p className="text-xs text-zinc-400">{label}</p>
        <p className="truncate text-sm font-semibold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  );
}
