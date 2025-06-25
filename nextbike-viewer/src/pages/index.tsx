import { LoaderCircleIcon } from "lucide-react";
import Head from "next/head";
import MapContainer from "~/components/map/MapContainer";
import { api } from "~/utils/api";

export default function IndexPage() {
  const places = api.place.getPlaces.useQuery(undefined, {
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const zones = api.city.getAllZones.useQuery(undefined, {
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <div className="relative h-screen w-screen">
      <Head>
        <title>nextbike.lol</title>
        <meta
          name="description"
          content="Explore the Nextbike zones and places on a map. Not affiliated with Nextbike."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {places.isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
          <div className="flex flex-col items-center gap-3">
            <LoaderCircleIcon className="size-14 animate-spin" />
            <div className="text-gray-800">Loading bikes and zones...</div>
          </div>
        </div>
      ) : (
        <MapContainer places={places.data || []} zones={zones.data || []} />
      )}
    </div>
  );
}
