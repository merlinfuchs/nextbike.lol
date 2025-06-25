import type { GeoJSONSource } from "maplibre-gl";
import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { Place } from "~/server/db/models";
import { clusterLayer, unclusteredPlaceLayer } from "./layers";

export default function MapMouseManager({
  onPlaceSelect,
}: {
  onPlaceSelect: (place: Place | null) => void;
}) {
  const map = useMap();

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

    map.current.on("click", [unclusteredPlaceLayer.id!], async (event) => {
      if (!map.current) return;

      const feature = event.features?.[0];
      if (!feature) return;

      onPlaceSelect(feature.properties as Place);
    });

    map.current.on("click", (event) => {
      // Check if any features were clicked at the click point
      const features = map.current?.queryRenderedFeatures(event.point);

      // If no features were found, it means we clicked on the base layer
      if (!features || features.length === 0) {
        onPlaceSelect(null);
        return;
      }

      const feature = features[0];
      if (feature?.layer.id !== unclusteredPlaceLayer.id) {
        onPlaceSelect(null);
      }
    });
  }, [map.current]);

  return null;
}
