import ReactMap, {
  GeolocateControl,
  Layer,
  NavigationControl,
  ScaleControl,
  Source,
} from "react-map-gl/maplibre";

import "maplibre-gl/dist/maplibre-gl.css";

import { useCallback, useState } from "react";
import MapMouseManager from "./MapMouseManager";
import MapResourceLoader from "./MapResourceLoader";
import {
  clusterCountLayer,
  clusterLayer,
  unclusteredPointLayer,
  zoneLayer,
} from "./layers";

export default function Map({
  points,
  zones,
}: {
  points: { lat: number; lon: number; data: any }[];
  zones: any[];
}) {
  const [cursor, setCursor] = useState("auto");

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

  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor("auto"), []);

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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      cursor={cursor}
    >
      <MapResourceLoader />
      <MapMouseManager />

      <GeolocateControl position="top-left" />
      <NavigationControl position="top-left" />
      <ScaleControl />

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
