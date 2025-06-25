import { useMemo, useState } from "react";
import type { Place, Zone } from "~/server/db/models";
import type { ControlOption } from "./MapControlPanel";
import MapControlPanel from "./MapControlPanel";
import Map from "./Map";

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

  const filteredPlaces = useMemo(() => {
    const showStations = options.includes("stations");
    const showBikes = options.includes("bikes");

    return places.filter((place) => {
      if (showStations && place.spot) return true;
      if (showBikes && !place.spot) return true;
      return false;
    });
  }, [places, options]);

  const filteredZones = useMemo(() => {
    if (!options.includes("zones")) return [];
    return zones;
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
      />
    </div>
  );
}
