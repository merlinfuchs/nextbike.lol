import ReactMap, {
  GeolocateControl,
  Layer,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type LayerProps,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";

import "maplibre-gl/dist/maplibre-gl.css";

import type { GeoJSONSource } from "maplibre-gl";

import { useCallback, useRef, useState } from "react";

export const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  source: "places",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#0046d7",
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
  paint: {
    "text-color": "#fff",
  },
};

/* export const unclusteredPointLayer: LayerProps = {
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
}; */

export const unclusteredPointLayer: LayerProps = {
  id: "unclustered-point",
  type: "symbol",
  source: "places",
  filter: ["!", ["has", "point_count"]],
  layout: {
    "icon-image": ["case", ["==", ["get", "spot"], true], "station", "bike"],
    "icon-size": ["case", ["==", ["get", "spot"], true], 0.25, 0.2],
  },
};

export const zoneLayer: LayerProps = {
  id: "zones",
  type: "fill",
  source: "zones",
  paint: {
    "fill-color": [
      "step",
      ["get", "fee"],
      "#ffffff",
      1,
      "#ffff00",
      1000,
      "#ff0000",
    ],
    "fill-opacity": 0.2,
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
  const [cursor, setCursor] = useState("auto");

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

  const onClick = async (event: MapMouseEvent) => {
    if (!mapRef.current || !event.features) {
      return;
    }

    const feature = event.features[0] as any;
    if (!feature) {
      return;
    }

    const clusterId = feature.properties?.cluster_id;
    if (!clusterId) {
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

    const zoom = await geojsonSource.getClusterExpansionZoom(clusterId);

    mapRef.current?.easeTo({
      center: feature.geometry.coordinates,
      zoom,
      duration: 500,
    });
  };

  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor("auto"), []);

  const onLoad = useCallback(async () => {
    if (!mapRef.current) {
      return;
    }

    const bikeImage = await mapRef.current.loadImage("/bike.png");
    mapRef.current.addImage("bike", bikeImage.data);

    const stationImage = await mapRef.current.loadImage("/station.png");
    mapRef.current.addImage("station", stationImage.data);
  }, []);

  return (
    <ReactMap
      initialViewState={{
        longitude: 10.4515,
        latitude: 51.1657,
        zoom: 4,
      }}
      interactiveLayerIds={[clusterLayer.id!, unclusteredPointLayer.id!]}
      style={{ width: "100%", height: "100%" }}
      mapStyle={"https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onLoad={onLoad}
      cursor={cursor}
      ref={mapRef}
    >
      <GeolocateControl position="top-left" />
      <NavigationControl position="top-left" />
      <ScaleControl />

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

      <Source id="zones" type="geojson" data={zonesGeoJSON as any}>
        <Layer {...zoneLayer} />
      </Source>

      <Source
        id="places"
        type="geojson"
        data={pointsGeoJSON as any}
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
