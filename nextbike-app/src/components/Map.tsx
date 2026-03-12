"use client";

import { useQuery } from "@tanstack/react-query";
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
import type { Bike, BikePosition, Place } from "@/trpc/routers/nextbike";
import { useTRPC } from "@/trpc/client";

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// --- layer definitions (single combined source: places-and-bikes) ---

const combinedClusterLayer: LayerProps = {
  id: "combined-clusters",
  type: "circle",
  source: "places-and-bikes",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#6366f1",
    "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28, 200, 34],
    "circle-opacity": 0.85,
  },
};

const combinedClusterCountLayer: LayerProps = {
  id: "combined-cluster-count",
  type: "symbol",
  source: "places-and-bikes",
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
  source: "places-and-bikes",
  filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "featureType"], "place"]],
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

const bikeUnclusteredLayer: LayerProps = {
  id: "bike-unclustered",
  type: "circle",
  source: "places-and-bikes",
  filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "featureType"], "bike"]],
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
  bikeId: number;
  bikeNumber: string;
  lng: number;
  lat: number;
}

export default function BikeMap() {
  const mapRef = useRef<MapRef>(null);
  const trpc = useTRPC();
  const [placePopup, setPlacePopup] = useState<PlacePopupInfo | null>(null);
  const [bikePopup, setBikePopup] = useState<BikePopupInfo | null>(null);
  const [cursor, setCursor] = useState("auto");

  const placesQuery = useQuery(
    trpc.nextbike.getPlaces.queryOptions({ excludeBikes: true })
  );
  const bikesQuery = useQuery(
    trpc.nextbike.getBikes.queryOptions({ excludeParked: true })
  );
  const trailQuery = useQuery({
    ...trpc.nextbike.getBikePositions.queryOptions({
      bikeId: bikePopup?.bikeId ?? 0,
    }),
    enabled: !!bikePopup?.bikeId,
  });

  const places = placesQuery.data ?? [];
  const bikes = bikesQuery.data ?? [];
  const trail = bikePopup ? trailQuery.data ?? [] : [];
  const lastUpdated =
    placesQuery.dataUpdatedAt || bikesQuery.dataUpdatedAt
      ? new Date(
          Math.max(
            placesQuery.dataUpdatedAt ?? 0,
            bikesQuery.dataUpdatedAt ?? 0
          )
        )
      : null;

  /* const fetchForViewport = useCallback(() => {
    void placesQuery.refetch();
    void bikesQuery.refetch();
  }, [placesQuery, bikesQuery]);

  // Periodic refresh (tRPC procedures don't support viewport bounds yet; refetch gets full dataset)
  useEffect(() => {
    const interval = setInterval(fetchForViewport, 60_000);
    return () => clearInterval(interval);
  }, [fetchForViewport]);  */

  // Single combined GeoJSON: places and bikes with featureType for filtering
  const placesAndBikesGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        ...places.map((p) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [p.location.lng, p.location.lat],
          },
          properties: { ...p, featureType: "place" as const },
        })),
        ...bikes.map((b) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [b.location.lng, b.location.lat],
          },
          properties: { ...b, featureType: "bike" as const },
        })),
      ],
    }),
    [places, bikes]
  );

  // Trail GeoJSON: a LineString + individual Points for the selected bike
  // Two separate GeoJSON objects to avoid mixing geometry types with lineMetrics
  const trailLineGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features:
        trail.length >= 2
          ? [
              {
                type: "Feature" as const,
                geometry: {
                  type: "LineString" as const,
                  // reverse: trail is newest-first, line gradient goes old→new
                  coordinates: [...trail]
                    .reverse()
                    .map((p) => [p.location.lng, p.location.lat]),
                },
                properties: {},
              },
            ]
          : [],
    }),
    [trail]
  );

  const trailPointsGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: trail.map((p, i) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [p.location.lng, p.location.lat],
        },
        // age: 0 = most recent, increases toward oldest (tRPC returns createdAt)
        properties: { age: i, recordedAt: p.createdAt },
      })),
    }),
    [trail]
  );

  const onClick = useCallback((e: MapMouseEvent) => {
    const map = mapRef.current;
    if (!map) return;

    const features = map.queryRenderedFeatures(e.point, {
      layers: [
        "combined-clusters",
        "place-unclustered",
        "bike-unclustered",
      ],
    });

    if (!features.length) {
      setPlacePopup(null);
      setBikePopup(null);
      return;
    }

    const feature = features[0];
    const coords = (feature.geometry as GeoJSON.Point).coordinates;

    // Combined cluster → zoom in
    if (feature.layer.id === "combined-clusters") {
      const clusterId = feature.properties?.cluster_id as number;
      const source = map.getSource("places-and-bikes") as maplibregl.GeoJSONSource;
      source
        .getClusterExpansionZoom(clusterId)
        .then((zoom) => map.easeTo({ center: [coords[0], coords[1]], zoom }))
        .catch(console.error);
      return;
    }

    // Individual bike → show trail (tRPC getBikePositions uses bikeId)
    if (feature.layer.id === "bike-unclustered") {
      const props = feature.properties as Bike & { featureType: "bike" };
      setPlacePopup(null);
      setBikePopup({
        bikeId: props.id,
        bikeNumber: String(props.number),
        lng: coords[0],
        lat: coords[1],
      });
      return;
    }

    // Individual place → show info popup
    if (feature.layer.id === "place-unclustered") {
      const props = feature.properties as Place & { featureType: "place" };
      setBikePopup(null);
      setPlacePopup({ place: props, lng: coords[0], lat: coords[1] });
      return;
    }
  }, []);

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
          "combined-clusters",
          "place-unclustered",
          "bike-unclustered",
        ]}
        // onLoad={fetchForViewport}
        // onMoveEnd={fetchForViewport}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <GeolocateControl position="top-left" />
        <NavigationControl position="top-left" />
        <ScaleControl />

        {/* Trail line — lineMetrics only on the LineString source */}
        {trail.length >= 2 && (
          <Source
            id="bike-trail-line"
            type="geojson"
            data={trailLineGeoJSON}
            lineMetrics
          >
            <Layer {...trailLineLayer} />
          </Source>
        )}
        {/* Trail points — separate source, no lineMetrics */}
        {trail.length > 0 && (
          <Source
            id="bike-trail-points"
            type="geojson"
            data={trailPointsGeoJSON}
          >
            <Layer {...trailPointsLayer} />
          </Source>
        )}

        {/* Places and bikes in one clustered source */}
        <Source
          id="places-and-bikes"
          type="geojson"
          data={placesAndBikesGeoJSON}
          cluster
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer {...combinedClusterLayer} />
          <Layer {...combinedClusterCountLayer} />
          <Layer {...placeUnclusteredLayer} />
          <Layer {...bikeUnclusteredLayer} />
        </Source>

        {/* Place popup — closeOnClick: false so one click on another feature (same or different type) switches popup */}
        {placePopup && (
          <Popup
            longitude={placePopup.lng}
            latitude={placePopup.lat}
            anchor="bottom"
            onClose={() => setPlacePopup(null)}
            closeButton
            closeOnClick={false}
            className="pointer-events-none *:pointer-events-auto"
          >
            <div className="min-w-[160px] text-sm">
              <p className="font-semibold text-gray-900">
                {placePopup.place.name}
              </p>
              <div className="mt-1 space-y-0.5 text-gray-600">
                <p>Available: {placePopup.place.bikesAvailableToRent}</p>
                <p>Total bikes: {placePopup.place.bikes}</p>
                <p>Racks: {placePopup.place.bikeRacks}</p>
              </div>
            </div>
          </Popup>
        )}

        {/* Bike popup — closeOnClick: false so one click on another feature (same or different type) switches popup */}
        {bikePopup && (
          <Popup
            longitude={bikePopup.lng}
            latitude={bikePopup.lat}
            anchor="bottom"
            onClose={() => setBikePopup(null)}
            closeButton
            closeOnClick={false}
            className="pointer-events-none *:pointer-events-auto"
          >
            <div className="min-w-[180px] text-sm">
              <p className="font-semibold text-gray-900">
                Bike #{bikePopup.bikeNumber}
              </p>
              {trail.length === 0 ? (
                <p className="mt-1 text-gray-400">Loading trail…</p>
              ) : (
                <div className="mt-1 space-y-1 text-gray-600">
                  <p>
                    {trail.length} position{trail.length !== 1 ? "s" : ""}{" "}
                    recorded
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                    {trail.map((pos, i) => (
                      <li key={pos.id}>
                        {i === 0 ? "▶ " : `${i + 1}. `}
                        {new Date(pos.createdAt).toLocaleString()}
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
            <span className="font-medium">{bikes.length.toLocaleString()}</span>{" "}
            bikes
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
