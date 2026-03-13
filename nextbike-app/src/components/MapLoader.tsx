"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("./Map"), { ssr: false });

export type FocusParams = {
  stationId?: string;
  bikeId?: string;
  lat?: string;
  lng?: string;
  zoom?: string;
};

export default function MapLoader({
  initialFocusParams,
}: {
  initialFocusParams?: FocusParams;
}) {
  return <Map initialFocusParams={initialFocusParams} />;
}
