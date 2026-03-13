"use client";

import { useTRPC } from "@/trpc/client";
import type { Bike, Place, RawZone, Zone } from "@/trpc/routers/nextbike";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const ZONE_ZOOM_THRESHOLD = 10;
const VIEWPORT_DEBOUNCE_MS = 300;

function roundBounds(
  b: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  decimals = 2
) {
  const r = (n: number) => Math.round(n * 10 ** decimals) / 10 ** decimals;
  return {
    minLng: r(b.minLng),
    minLat: r(b.minLat),
    maxLng: r(b.maxLng),
    maxLat: r(b.maxLat),
  };
}

// --- layer definitions (single combined source: places-and-bikes) ---

const combinedClusterLayer: LayerProps = {
  id: "combined-clusters",
  type: "circle",
  source: "places-and-bikes",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#6366f1",
    "circle-radius": [
      "step",
      ["get", "point_count"],
      16,
      10,
      22,
      50,
      28,
      200,
      34,
    ],
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
  filter: [
    "all",
    ["!", ["has", "point_count"]],
    ["==", ["get", "featureType"], "place"],
  ],
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
  filter: [
    "all",
    ["!", ["has", "point_count"]],
    ["==", ["get", "featureType"], "bike"],
  ],
  paint: {
    "circle-color": "#3b82f6",
    "circle-radius": 5,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#fff",
    "circle-opacity": 0.9,
  },
};

// Zones: semi-transparent fill, color by zone type
const zonesFillLayer: LayerProps = {
  id: "zones-fill",
  type: "fill",
  source: "zones",
  paint: {
    "fill-color": [
      "match",
      ["get", "zoneType"],
      "BusinessZone",
      "#22c55e",
      "NoBusinessZone",
      "#94a3b8",
      "PolicyZone",
      "#f59e0b",
      "#a78bfa",
    ],
    "fill-opacity": 0.1,
    "fill-outline-color": "rgba(0,0,0,0.15)",
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
  const [showZones, setShowZones] = useState(false);
  const [viewport, setViewport] = useState<{
    zoom: number;
    bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  } | null>(null);
  const viewportDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const updateViewportFromMap = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    setViewport({
      zoom,
      bounds: {
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth(),
      },
    });
  }, []);

  const onMapLoad = useCallback(() => {
    updateViewportFromMap();
  }, [updateViewportFromMap]);

  const onMapMoveEnd = useCallback(() => {
    if (viewportDebounceRef.current) clearTimeout(viewportDebounceRef.current);
    viewportDebounceRef.current = setTimeout(() => {
      viewportDebounceRef.current = null;
      updateViewportFromMap();
    }, VIEWPORT_DEBOUNCE_MS);
  }, [updateViewportFromMap]);

  useEffect(() => {
    return () => {
      if (viewportDebounceRef.current)
        clearTimeout(viewportDebounceRef.current);
    };
  }, []);

  const placesQuery = useQuery(
    trpc.nextbike.getPlaces.queryOptions({ excludeBikes: true })
  );
  const bikesQuery = useQuery(
    trpc.nextbike.getBikes.queryOptions({ excludeParked: true })
  );

  const zonesQuery = useQuery({
    ...trpc.nextbike.getZones.queryOptions(
      viewport != null && viewport.zoom >= ZONE_ZOOM_THRESHOLD
        ? { bounds: roundBounds(viewport.bounds) }
        : {}
    ),
    enabled:
      showZones &&
      viewport != null &&
      viewport.zoom >= ZONE_ZOOM_THRESHOLD,
    placeholderData: keepPreviousData,
  });

  const zones: Zone[] = useMemo(() => {
    return viewport != null && viewport.zoom >= ZONE_ZOOM_THRESHOLD
      ? zonesQuery.data?.map((z) => ({
          ...z,
          geometry: JSON.parse(z.geometry) as GeoJSON.MultiPolygon,
        })) ?? ([] as Zone[])
      : [];
  }, [zonesQuery.data, viewport]);
  const trailQuery = useQuery({
    ...trpc.nextbike.getBikePositions.queryOptions({
      bikeId: bikePopup?.bikeId ?? 0,
    }),
    enabled: !!bikePopup?.bikeId,
  });

  const places = placesQuery.data ?? [];
  const bikes = bikesQuery.data ?? [];
  const trail = bikePopup ? trailQuery.data ?? [] : [];
  const trailFetched = !!bikePopup && trailQuery.isFetched;

  // When a bike is selected and trail has loaded, fit viewport to trail + bike position
  useEffect(() => {
    if (!trailFetched || !bikePopup) return;
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const lngs: number[] = [bikePopup.lng];
    const lats: number[] = [bikePopup.lat];
    for (const p of trail) {
      lngs.push(p.location.lng);
      lats.push(p.location.lat);
    }
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    // If single point, expand slightly so we don't zoom to max
    const pad = 0.0005;
    const w = Math.max(maxLng - minLng, pad);
    const h = Math.max(maxLat - minLat, pad);
    const bounds: [[number, number], [number, number]] = [
      [minLng - w * 0.5, minLat - h * 0.5],
      [maxLng + w * 0.5, maxLat + h * 0.5],
    ];
    map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
  }, [trailFetched, bikePopup?.bikeId, bikePopup?.lng, bikePopup?.lat, trail]);

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

  // Zones as GeoJSON; skip world-covering polygons (e.g. NoBusinessZone exterior = whole globe)
  const zonesGeoJSON = useMemo(() => {
    const isWorldBbox = (ring: number[][]) => {
      if (!ring?.length) return false;
      let minLng = Infinity,
        maxLng = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;
      for (const [lng, lat] of ring) {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
      return minLng <= -179 && maxLng >= 179 && minLat <= -89 && maxLat >= 89;
    };
    const filtered = zones.filter((z) => {
      const coords = z.geometry?.coordinates;
      if (!coords?.[0]?.[0]) return true;
      return !isWorldBbox(coords[0][0]);
    });
    return {
      type: "FeatureCollection" as const,
      features: filtered.map((z) => ({
        type: "Feature" as const,
        geometry: z.geometry,
        properties: {
          id: z.id,
          areaId: z.areaId,
          externalId: z.externalId,
          zoneType: z.zoneType,
        },
      })),
    };
  }, [zones]);

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
      layers: ["combined-clusters", "place-unclustered", "bike-unclustered"],
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
      const source = map.getSource(
        "places-and-bikes"
      ) as maplibregl.GeoJSONSource;
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
        onLoad={onMapLoad}
        onMoveEnd={onMapMoveEnd}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <GeolocateControl position="top-left" />
        <NavigationControl position="top-left" />
        <ScaleControl />

        {/* Zones (semi-transparent fill by type) — below points so stations/bikes render on top */}
        {showZones && (
          <Source id="zones" type="geojson" data={zonesGeoJSON}>
            <Layer {...zonesFillLayer} />
          </Source>
        )}

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
              <p className="font-semibold text-zinc-900">
                {placePopup.place.name}
              </p>
              <div className="mt-2 space-y-1 text-zinc-500">
                <p>
                  <span className="font-medium text-zinc-800">{placePopup.place.bikesAvailableToRent}</span>{" "}
                  available
                </p>
                <p>
                  <span className="font-medium text-zinc-800">{placePopup.place.bikes}</span>{" "}
                  total bikes
                </p>
                <p>
                  <span className="font-medium text-zinc-800">{placePopup.place.bikeRacks}</span>{" "}
                  racks
                </p>
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
              <p className="font-semibold text-zinc-900">
                Bike #{bikePopup.bikeNumber}
              </p>
              {trail.length === 0 ? (
                <p className="mt-1 text-zinc-400">Loading trail…</p>
              ) : (
                <div className="mt-2 space-y-1 text-zinc-500">
                  <p>
                    <span className="font-medium text-zinc-800">{trail.length}</span>{" "}
                    position{trail.length !== 1 ? "s" : ""} recorded
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {trail.map((pos, i) => (
                      <li key={pos.id} className="flex items-center gap-1.5">
                        <span className={i === 0 ? "text-blue-500" : "text-zinc-300"}>
                          {i === 0 ? "▶" : `${i + 1}.`}
                        </span>
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
      <div className="absolute bottom-14 right-4 flex gap-2">
        <div className="rounded-xl bg-white/90 px-3 py-2 text-xs text-zinc-600 shadow backdrop-blur">
          <span className="font-semibold text-zinc-900">{places.length.toLocaleString()}</span> stations
          {lastUpdated && (
            <span className="ml-2 text-zinc-400">
              · {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        {bikes.length > 0 && (
          <div className="rounded-xl bg-white/90 px-3 py-2 text-xs text-zinc-600 shadow backdrop-blur">
            <span className="font-semibold text-blue-500">{bikes.length.toLocaleString()}</span> bikes
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 rounded-2xl bg-white/90 px-4 py-3 text-xs text-zinc-600 shadow backdrop-blur">
        <div className="mb-2 font-semibold text-zinc-400 tracking-wide uppercase text-[10px]">Legend</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-green-400 ring-2 ring-zinc-200" />
            Station (bikes avail.)
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-yellow-400 ring-2 ring-zinc-200" />
            Station (few bikes)
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-red-400 ring-2 ring-zinc-200" />
            Station (empty)
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-blue-400 ring-2 ring-zinc-200" />
            Individual bike
          </div>
        </div>
        <div className="mt-3 border-t border-zinc-200 pt-2.5">
          <label className="flex cursor-pointer items-center gap-2 font-medium text-zinc-500 hover:text-zinc-800 transition-colors">
            <input
              type="checkbox"
              checked={showZones}
              onChange={(e) => setShowZones(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-zinc-300 accent-indigo-500"
            />
            Show zones
          </label>
          {showZones && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 shrink-0 rounded bg-green-500/30 border border-green-500/50" />
                Business
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 shrink-0 rounded bg-slate-400/30 border border-slate-400/50" />
                No business
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 shrink-0 rounded bg-amber-500/30 border border-amber-400/50" />
                Policy zone
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
