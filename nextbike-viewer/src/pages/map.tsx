import { api } from "~/utils/api";
import Map from "../components/Map";
import { useMemo } from "react";

export default function MapPage() {
  const places = api.place.getPlaces.useQuery();
  const zones = api.city.getAllZones.useQuery();

  const points =
    places.data?.map((place) => ({
      lat: place.lat,
      lon: place.lng,
      data: place,
    })) || [];

  const zoneData = useMemo(() => {
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
  }, [zones.data]);

  return (
    <div className="h-screen w-screen">
      <Map points={points} zones={zoneData} />
    </div>
  );
}
