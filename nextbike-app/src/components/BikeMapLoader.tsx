"use client";

import dynamic from "next/dynamic";

const BikeMap = dynamic(() => import("./BikeMap"), { ssr: false });

export default function BikeMapLoader() {
  return <BikeMap />;
}
