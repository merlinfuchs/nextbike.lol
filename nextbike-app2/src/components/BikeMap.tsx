"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMap, {
  GeolocateControl,
  Layer,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type LayerProps,
  type MapRef,
} from "react-map-gl/maplibre";
import type { MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Bike, BikePosition, Place } from "@/db/schema";

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// --- layer definitions ---

const placeClusterLayer: LayerProps = {
  id: "place-clusters",
  type: "circle",
  source: "places",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#4ade80",
      10,
      "#facc15",
      50,
      "#f87171",
    ],
    "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 30],
    "circle-opacity": 0.85,
  },
};

const placeClusterCountLayer: LayerProps = {
  id: "place-cluster-count",
  type: "symbol",
  source: "places",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-size": 12,
    "text-font": ["Noto Sans Regular"],
  },
  paint: { "text-color": "#1f2937" },
};

const placeUnclusteredLayer: LayerProps = {
  id: "place-unclustered",
  type: "circle",
  source: "places",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": [
      "case",
      [">", ["get", "bikesAvailableToRent"], 5],
      "#4ade80",
      [">", ["get", "bikesAvailableToRent"], 0],
      "#facc15",
      "#f87171",
    ],
    "circle-radius": 8,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#fff",
  },
};

const bikeClusterLayer: LayerProps = {
  id: "bike-clusters",
  type: "circle",
  source: "bikes",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#60a5fa",
    "circle-radius": ["step", ["get", "point_count"], 14, 50, 20, 200, 28],
    "circle-opacity": 0.8,
  },
};

const bikeClusterCountLayer: LayerProps = {
  id: "bike-cluster-count",
  type: "symbol",
  source: "bikes",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-size": 11,
    "text-font": ["Noto Sans Regular"],
  },
  paint: { "text-color": "#1e3a5f" },
};

const bikeUnclusteredLayer: LayerProps = {
  id: "bike-unclustered",
  type: "circle",
  source: "bikes",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#3b82f6",
    "circle-radius": 5,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#fff",
    "circle-opacity": 0.9,
  },
};

const trailLineLayer: LayerProps = {
  id: "trail-line",
  type: "line",
  source: "bike-trail-line",
  filter: ["==", ["geometry-type"], "LineString"],
  layout: { "line-join": "round", "line-cap": "round" },
  paint: {
    "line-width": 2.5,
    "line-gradient": [
      "interpolate",
      ["linear"],
      ["line-progress"],
      0,
      "rgba(59,130,246,0.25)",
      1,
      "rgba(59,130,246,1)",
    ],
  },
};

const trailPointsLayer: LayerProps = {
  id: "trail-points",
  type: "circle",
  source: "bike-trail-points",
  filter: ["==", ["geometry-type"], "Point"],
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["get", "age"], 0, 7, 9, 3],
    "circle-color": "#3b82f6",
    "circle-opacity": [
      "interpolate",
      ["linear"],
      ["get", "age"],
      0,
      1,
      9,
      0.25,
    ],
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#fff",
    "circle-stroke-opacity": [
      "interpolate",
      ["linear"],
      ["get", "age"],
      0,
      1,
      9,
      0.25,
    ],
  },
};

// ---- types ----

interface PlacePopupInfo {
  place: Place;
  lng: number;
  lat: number;
}

interface BikePopupInfo {
  bikeNumber: string;
  lng: number;
  lat: number;
}

export default function BikeMap() {
  const mapRef = useRef<MapRef>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [placePopup, setPlacePopup] = useState<PlacePopupInfo | null>(null);
  const [bikePopup, setBikePopup] = useState<BikePopupInfo | null>(null);
  const [trail, setTrail] = useState<BikePosition[]>([]);
  const [cursor, setCursor] = useState("auto");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchForViewport = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const params = new URLSearchParams({
      minLat: b.getSouth().toString(),
      maxLat: b.getNorth().toString(),
      minLng: b.getWest().toString(),
      maxLng: b.getEast().toString(),
    });
    const [placesRes, bikesRes] = await Promise.all([
      fetch(`/api/places?${params}`),
      fetch(`/api/bikes?${params}`),
    ]);
    setPlaces(await placesRes.json());
    setBikes(await bikesRes.json());
    setLastUpdated(new Date());
  }, []);

  const fetchTrail = useCallback(async (bikeNumber: string) => {
    const res = await fetch(`/api/bikes/${encodeURIComponent(bikeNumber)}/trail`);
    const data: BikePosition[] = await res.json();
    setTrail(data);
  }, []);

  // Periodic refresh of the current viewport
  useEffect(() => {
    const interval = setInterval(fetchForViewport, 60_000);
    return () => clearInterval(interval);
  }, [fetchForViewport]);

  useEffect(() => {
    if (bikePopup) fetchTrail(bikePopup.bikeNumber);
    else setTrail([]);
  }, [bikePopup, fetchTrail]);

  // GeoJSON sources
  const placesGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: places.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: p,
      })),
    }),
    [places],
  );

  const bikesGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: bikes.map((b) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [b.lng, b.lat] },
        properties: b,
      })),
    }),
    [bikes],
  );

  // Trail GeoJSON: a LineString + individual Points for the selected bike
  // Two separate GeoJSON objects to avoid mixing geometry types with lineMetrics
  const trailLineGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: trail.length >= 2 ? [{
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        // reverse: trail is newest-first, line gradient goes old→new
        coordinates: [...trail].reverse().map((p) => [p.lng, p.lat]),
      },
      properties: {},
    }] : [],
  }), [trail]);

  const trailPointsGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: trail.map((p, i) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      // age: 0 = most recent, increases toward oldest
      properties: { age: i, recordedAt: p.recordedAt },
    })),
  }), [trail]);

  const onClick = useCallback(
    (e: MapMouseEvent) => {
      const map = mapRef.current;
      if (!map) return;

      const features = map.queryRenderedFeatures(e.point, {
        layers: [
          "bike-clusters",
          "bike-unclustered",
          "place-clusters",
          "place-unclustered",
        ],
      });

      if (!features.length) {
        setPlacePopup(null);
        setBikePopup(null);
        return;
      }

      const feature = features[0];
      const coords = (feature.geometry as GeoJSON.Point).coordinates;

      // Bike cluster → zoom in
      if (feature.layer.id === "bike-clusters") {
        const clusterId = feature.properties?.cluster_id as number;
        const source = map.getSource("bikes") as maplibregl.GeoJSONSource;
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => map.easeTo({ center: [coords[0], coords[1]], zoom }))
          .catch(console.error);
        return;
      }

      // Place cluster → zoom in
      if (feature.layer.id === "place-clusters") {
        const clusterId = feature.properties?.cluster_id as number;
        const source = map.getSource("places") as maplibregl.GeoJSONSource;
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => map.easeTo({ center: [coords[0], coords[1]], zoom }))
          .catch(console.error);
        return;
      }

      // Individual bike → show trail
      if (feature.layer.id === "bike-unclustered") {
        const props = feature.properties as Bike;
        setPlacePopup(null);
        setBikePopup({ bikeNumber: props.number, lng: coords[0], lat: coords[1] });
        return;
      }

      // Individual place → show info popup
      if (feature.layer.id === "place-unclustered") {
        const props = feature.properties as Place;
        setBikePopup(null);
        setPlacePopup({ place: props, lng: coords[0], lat: coords[1] });
        return;
      }
    },
    [],
  );

  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor("auto"), []);

  return (
    <div className="relative h-screen w-screen">
      <ReactMap
        ref={mapRef}
        initialViewState={{ longitude: 10.45, latitude: 51.17, zoom: 4 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        cursor={cursor}
        interactiveLayerIds={[
          "place-clusters",
          "place-unclustered",
          "bike-clusters",
          "bike-unclustered",
        ]}
        onLoad={fetchForViewport}
        onMoveEnd={fetchForViewport}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <GeolocateControl position="top-left" />
        <NavigationControl position="top-left" />
        <ScaleControl />

        {/* Trail line — lineMetrics only on the LineString source */}
        {trail.length >= 2 && (
          <Source id="bike-trail-line" type="geojson" data={trailLineGeoJSON} lineMetrics>
            <Layer {...trailLineLayer} />
          </Source>
        )}
        {/* Trail points — separate source, no lineMetrics */}
        {trail.length > 0 && (
          <Source id="bike-trail-points" type="geojson" data={trailPointsGeoJSON}>
            <Layer {...trailPointsLayer} />
          </Source>
        )}

        {/* Place stations */}
        <Source
          id="places"
          type="geojson"
          data={placesGeoJSON}
          cluster
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer {...placeClusterLayer} />
          <Layer {...placeClusterCountLayer} />
          <Layer {...placeUnclusteredLayer} />
        </Source>

        {/* Individual bikes */}
        <Source
          id="bikes"
          type="geojson"
          data={bikesGeoJSON}
          cluster
          clusterMaxZoom={14}
          clusterRadius={40}
        >
          <Layer {...bikeClusterLayer} />
          <Layer {...bikeClusterCountLayer} />
          <Layer {...bikeUnclusteredLayer} />
        </Source>

        {/* Place popup */}
        {placePopup && (
          <Popup
            longitude={placePopup.lng}
            latitude={placePopup.lat}
            anchor="bottom"
            onClose={() => setPlacePopup(null)}
            closeButton
          >
            <div className="min-w-[160px] text-sm">
              <p className="font-semibold text-gray-900">{placePopup.place.name}</p>
              <div className="mt-1 space-y-0.5 text-gray-600">
                <p>Available: {placePopup.place.bikesAvailableToRent}</p>
                <p>Total bikes: {placePopup.place.bikes}</p>
                <p>Racks: {placePopup.place.bikeRacks}</p>
              </div>
            </div>
          </Popup>
        )}

        {/* Bike popup */}
        {bikePopup && (
          <Popup
            longitude={bikePopup.lng}
            latitude={bikePopup.lat}
            anchor="bottom"
            onClose={() => setBikePopup(null)}
            closeButton
          >
            <div className="min-w-[180px] text-sm">
              <p className="font-semibold text-gray-900">Bike #{bikePopup.bikeNumber}</p>
              {trail.length === 0 ? (
                <p className="mt-1 text-gray-400">Loading trail…</p>
              ) : (
                <div className="mt-1 space-y-1 text-gray-600">
                  <p>{trail.length} position{trail.length !== 1 ? "s" : ""} recorded</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                    {trail.map((pos, i) => (
                      <li key={pos.id}>
                        {i === 0 ? "▶ " : `${i + 1}. `}
                        {new Date(pos.recordedAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Popup>
        )}
      </ReactMap>

      {/* Status bar */}
      <div className="absolute bottom-8 right-4 flex gap-2">
        <div className="rounded-lg bg-white/90 px-3 py-2 text-xs text-gray-600 shadow backdrop-blur">
          <span className="font-medium">{places.length}</span> stations
          {lastUpdated && (
            <span className="ml-2 text-gray-400">
              · {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        {bikes.length > 0 && (
          <div className="rounded-lg bg-blue-50/90 px-3 py-2 text-xs text-blue-700 shadow backdrop-blur">
            <span className="font-medium">{bikes.length.toLocaleString()}</span> bikes
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-16 right-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-gray-600 shadow backdrop-blur">
        <div className="mb-1 font-semibold text-gray-700">Legend</div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-green-400" />
          Station (bikes avail.)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" />
          Station (few bikes)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-400" />
          Station (empty)
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-400" />
          Individual bike
        </div>
      </div>
    </div>
  );
}
