import { api } from "~/utils/api";
import Map from "../components/Map";
import { useMemo } from "react";

export default function MapPage() {
  const places = api.place.getPlaces.useQuery();

  const points =
    places.data?.map((place) => ({
      lat: place.lat,
      lon: place.lng,
      data: place,
    })) || [];

  return (
    <div className="h-screen w-screen">
      <Map points={points} />
    </div>
  );
}
