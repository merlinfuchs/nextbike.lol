import { useEffect, useMemo, useState } from "react";
import type { Place, Zone } from "~/server/db/models";
import type { ControlOption } from "./MapControlPanel";
import MapControlPanel from "./MapControlPanel";
import Map from "./Map";
import { api } from "~/utils/api";

export default function MapContainer({
  places,
  zones,
}: {
  places: Place[];
  zones: Zone[];
}) {
  const [options, setOptions] = useState<ControlOption[]>([
    "zones",
    "stations",
    "bikes",
  ]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showBikeHistory, setShowBikeHistory] = useState(false);

  useEffect(() => {
    if (!selectedPlace) {
      setShowBikeHistory(false);
    }
  }, [selectedPlace]);

  const bikeVersions = api.bike.getBikeVersions.useQuery(
    { bikeNumber: selectedPlace?.bike_numbers || "" },
    {
      enabled: !!selectedPlace?.bike && showBikeHistory,
    },
  );

  const filteredPlaces = useMemo(() => {
    const showStations = options.includes("stations");
    const showBikes = options.includes("bikes");

    return places.filter((place) => {
      if (showBikeHistory) {
        return bikeVersions.data?.some((bike) => bike.place_id === place._id);
      }

      if (showStations && place.spot) return true;
      if (showBikes && !place.spot) return true;
      return false;
    });
  }, [places, options, showBikeHistory, bikeVersions.data]);

  const filteredZones = useMemo(() => {
    if (!options.includes("zones")) return [];
    return zones.map((zone) => ({
      ...zone,
      properties: {
        ...zone.properties,
        fee:
          zone.properties.rules.length > 0 ? zone.properties.rules[0].fee : 0,
      },
    }));
  }, [zones, options]);

  return (
    <div className="relative h-screen w-screen">
      <Map
        places={filteredPlaces}
        zones={filteredZones}
        onPlaceSelect={setSelectedPlace}
      />
      <MapControlPanel
        options={options}
        onOptionToggle={(option) => {
          setOptions((prev) => {
            if (prev.includes(option)) {
              return prev.filter((o) => o !== option);
            }
            return [...prev, option];
          });
        }}
        selectedPlace={selectedPlace}
        onSelectPlace={setSelectedPlace}
        showBikeHistory={showBikeHistory}
        onShowBikeHistory={setShowBikeHistory}
      />
    </div>
  );
}
