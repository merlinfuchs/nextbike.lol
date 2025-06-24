import ReactMap, {
  Layer,
  Source,
  Popup,
  type LayerProps,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/mapbox";

import type { GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRef, useState } from "react";
import { env } from "~/env";

export const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  source: "places",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#51bbd6",
      100,
      "#f1f075",
      750,
      "#f28cb1",
    ],
    "circle-radius": ["step", ["get", "point_count"], 20, 100, 25, 750, 30],
  },
};

export const clusterCountLayer: LayerProps = {
  id: "cluster-count",
  type: "symbol",
  source: "places",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-size": 12,
  },
};

export const unclusteredPointLayer: LayerProps = {
  id: "unclustered-point",
  type: "circle",
  source: "places",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#11b4da",
    "circle-radius": 6,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#fff",
  },
};

export const zoneLayer: LayerProps = {
  id: "zones",
  type: "fill",
  source: "zones",
  paint: {
    "fill-color": "#000000",
    "fill-opacity": 0.2,
    "fill-outline-color": "#000000",
    "fill-outline-width": 1,
  },
};

export default function Map({
  points,
  zones,
}: {
  points: { lat: number; lon: number; data: any }[];
  zones: any[];
}) {
  const mapRef = useRef<MapRef>(null);

  const [selectedPoint, setSelectedPoint] = useState<{
    lat: number;
    lon: number;
    data: any;
  } | null>(null);

  const pointsGeoJSON = {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.lon, point.lat] },
      properties: point.data,
    })),
  };

  const zonesGeoJSON = {
    type: "FeatureCollection",
    features: zones,
  };

  const onClick = (event: MapMouseEvent) => {
    if (!mapRef.current || !event.features) {
      return;
    }

    const feature = event.features[0];
    if (!feature) {
      return;
    }

    const clusterId = feature.properties?.cluster_id;
    if (!clusterId) {
      console.log(feature);
      setSelectedPoint({
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        data: feature.properties,
      });
      return;
    }

    const geojsonSource = mapRef.current.getSource("places") as GeoJSONSource;
    if (!geojsonSource) {
      return;
    }

    geojsonSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) {
        console.error(err);
        return;
      }

      mapRef.current.easeTo({
        center: feature.geometry.coordinates,
        zoom,
        duration: 500,
      });
    });
  };

  return (
    <ReactMap
      mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={{
        longitude: 10.4515,
        latitude: 51.1657,
        zoom: 4,
      }}
      interactiveLayerIds={[clusterLayer.id!, unclusteredPointLayer.id!]}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v9"
      onClick={onClick}
      ref={mapRef}
    >
      {selectedPoint && (
        <Popup
          anchor="top"
          longitude={Number(selectedPoint.lon)}
          latitude={Number(selectedPoint.lat)}
          onClose={() => setSelectedPoint(null)}
        >
          <pre>{JSON.stringify(selectedPoint, null, 2)}</pre>
        </Popup>
      )}

      <Source id="zones" type="geojson" data={zonesGeoJSON}>
        <Layer {...zoneLayer} />
      </Source>

      <Source
        id="places"
        type="geojson"
        data={pointsGeoJSON}
        cluster={true}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...unclusteredPointLayer} />
      </Source>
    </ReactMap>
  );
}
