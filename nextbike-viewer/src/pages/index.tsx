import { api } from "~/utils/api";
import Map from "../components/map/Map";
import { useMemo, useState } from "react";
import Head from "next/head";
import { LoaderCircleIcon } from "lucide-react";
import MapContainer from "~/components/map/MapContainer";

export default function IndexPage() {
  const places = api.place.getPlaces.useQuery();
  const zones = api.city.getAllZones.useQuery();

  const [showZones, setShowZones] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showBikes, setShowBikes] = useState(true);

  const placeData = useMemo(() => {
    if (!showStations && !showBikes) return [];

    return (
      places.data?.filter((place) => {
        if (showStations && place.spot) return true;
        if (showBikes && !place.spot) return true;
        return false;
      }) || []
    );
  }, [places.data, showStations, showBikes]);

  const zoneData = useMemo(() => {
    if (!showZones) return [];

    return (
      zones.data?.map((zone) => ({
        ...zone,
        properties: {
          ...zone.properties,
          fee:
            zone.properties.rules.length > 0 ? zone.properties.rules[0].fee : 0,
        },
      })) || []
    );
  }, [zones.data, showZones]);

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
        <MapContainer places={placeData} zones={zoneData} />
      )}
    </div>
  );
}
