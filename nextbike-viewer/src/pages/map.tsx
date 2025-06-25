import { api } from "~/utils/api";
import Map from "../components/Map";
import { useMemo, useState } from "react";

export default function MapPage() {
  const places = api.place.getPlaces.useQuery();
  const zones = api.city.getAllZones.useQuery();

  const [showZones, setShowZones] = useState(true);
  const [showPlaces, setShowPlaces] = useState(true);

  const points = useMemo(() => {
    if (!showPlaces) return [];

    return (
      places.data?.map((place) => ({
        lat: place.lat,
        lon: place.lng,
        data: place,
      })) || []
    );
  }, [places.data, showPlaces]);

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
      {places.isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90">
          <div className="text-2xl font-bold">Loading...</div>
        </div>
      ) : (
        <div className="absolute top-5 right-5 z-10 max-w-xs rounded-lg bg-white p-5 shadow-lg">
          <div>
            <h1 className="mb-1 text-lg font-bold">nextbike.lol</h1>
            <p className="mb-5 text-sm text-gray-500">
              Explore the Nextbike zones and places on a map. Not affiliated
              with Nextbike.
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showZones}
                  onChange={() => setShowZones(!showZones)}
                />
                <label>Show zones</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showPlaces}
                  onChange={() => setShowPlaces(!showPlaces)}
                />
                <label>Show places</label>
              </div>
            </div>
          </div>
        </div>
      )}

      <Map points={points} zones={zoneData} />
    </div>
  );
}
