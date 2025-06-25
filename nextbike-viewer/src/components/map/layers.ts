import { type LayerProps } from "react-map-gl/maplibre";

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

export const unclusteredPlaceLayer: LayerProps = {
  id: "unclustered-place",
  type: "symbol",
  source: "places",
  filter: ["!", ["has", "point_count"]],
  layout: {
    "icon-image": ["case", ["==", ["get", "spot"], true], "station", "bike"],
    "icon-size": ["case", ["==", ["get", "spot"], true], 0.25, 0.2],
    "text-field": ["case", ["==", ["get", "spot"], true], ["get", "bikes"], ""],
    "text-size": 12,
  },
  paint: {
    "text-color": "#fff",
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
