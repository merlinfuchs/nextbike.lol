import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/maplibre";
import { clusterLayer, unclusteredPointLayer } from "./layers";
import type { GeoJSONSource } from "maplibre-gl";
import type { Place } from "~/server/db/models";
import MapPlacePopup from "./MapPlacePopup";

export default function MapMouseManager() {
  const map = useMap();

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    if (!map.current) return;

    map.current.on("click", [clusterLayer.id!], async (event) => {
      if (!map.current) return;

      const feature = event.features?.[0];
      if (!feature) return;

      const clusterId = feature.properties?.cluster_id;
      if (!clusterId) return;

      const geojsonSource = map.current.getSource("places") as GeoJSONSource;
      if (!geojsonSource) {
        return;
      }

      const zoom = await geojsonSource.getClusterExpansionZoom(clusterId);

      map.current?.easeTo({
        center: (feature.geometry as any).coordinates,
        zoom,
        duration: 500,
      });
    });

    map.current.on("click", [unclusteredPointLayer.id!], async (event) => {
      if (!map.current) return;

      const feature = event.features?.[0];
      if (!feature) return;

      setSelectedPlace(feature.properties as Place);
    });
  }, [map.current]);

  if (!selectedPlace) return null;

  return (
    <MapPlacePopup
      place={selectedPlace}
      onClose={() => setSelectedPlace(null)}
    />
  );
}
