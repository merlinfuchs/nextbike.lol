import ReactMap, {
  GeolocateControl,
  Layer,
  NavigationControl,
  ScaleControl,
  Source,
} from "react-map-gl/maplibre";

import "maplibre-gl/dist/maplibre-gl.css";

import { useCallback, useMemo, useState } from "react";
import MapMouseManager from "./MapMouseManager";
import MapResourceLoader from "./MapResourceLoader";
import {
  clusterCountLayer,
  clusterLayer,
  routeLayer,
  unclusteredPlaceLayer,
  zoneLayer,
} from "./layers";
import type { Place, Zone } from "~/server/db/models";

interface Route {
  coordinates: { lat: number; lng: number }[];
}

export default function Map({
  places,
  zones,
  routes,
  onPlaceSelect,
}: {
  places: Place[];
  zones: Zone[];
  routes?: Route[];
  onPlaceSelect: (place: Place | null) => void;
}) {
  const [cursor, setCursor] = useState("auto");

  const placesGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: places.map((place) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [place.lng, place.lat] },
        properties: place,
      })),
    }),
    [places],
  );

  const zonesGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: zones,
    }),
    [zones],
  );

  const routesGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features:
        routes?.map((route) => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: route.coordinates.map((coord) => [
              coord.lng,
              coord.lat,
            ]),
          },
        })) || [],
    }),
    [routes],
  );

  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor("auto"), []);

  return (
    <ReactMap
      initialViewState={{
        longitude: 10.4515,
        latitude: 51.1657,
        zoom: 4,
      }}
      interactiveLayerIds={[clusterLayer.id!, unclusteredPlaceLayer.id!]}
      style={{ width: "100%", height: "100%" }}
      mapStyle={"https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      cursor={cursor}
    >
      <MapResourceLoader />
      <MapMouseManager onPlaceSelect={onPlaceSelect} />

      <GeolocateControl position="top-left" />
      <NavigationControl position="top-left" />
      <ScaleControl />

      <Source id="zones" type="geojson" data={zonesGeoJSON as any}>
        <Layer {...zoneLayer} />
      </Source>

      <Source id="routes" type="geojson" data={routesGeoJSON as any}>
        <Layer {...routeLayer} />
      </Source>

      <Source
        id="places"
        type="geojson"
        data={placesGeoJSON as any}
        cluster={true}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...unclusteredPlaceLayer} />
      </Source>
    </ReactMap>
  );
}
