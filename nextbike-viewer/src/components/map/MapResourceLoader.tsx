import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";

export default function MapResourceLoader() {
  const map = useMap();

  useEffect(() => {
    const load = async () => {
      if (!map.current) return;

      if (!map.current.hasImage("bike")) {
        const bikeImage = await map.current.loadImage("/bike.png");
        map.current.addImage("bike", bikeImage.data);
      }

      if (!map.current.hasImage("station")) {
        const stationImage = await map.current.loadImage("/station_empty.png");
        map.current.addImage("station", stationImage.data);
      }
    };

    load();
  }, [map.current]);

  return <div>MapResourceLoader</div>;
}
