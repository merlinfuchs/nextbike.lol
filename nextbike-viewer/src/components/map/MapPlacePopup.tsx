import { Popup } from "react-map-gl/maplibre";
import type { Place } from "~/server/db/models";

export default function MapPlacePopup({
  place,
  onClose,
}: {
  place: Place;
  onClose: () => void;
}) {
  return (
    <Popup
      anchor="left"
      offset={15}
      longitude={Number(place.lng)}
      latitude={Number(place.lat)}
      onClose={onClose}
      className="popup-reset"
    >
      <div className="w-[400px] rounded-lg bg-white p-3">
        <div className="mb-3 text-base font-bold">{place.name}</div>
        <pre className="mb-3 max-h-[200px] overflow-y-auto rounded-md bg-slate-900 p-2 font-mono text-white">
          {JSON.stringify(place, null, 2)}
        </pre>

        {place.bike && (
          <button
            className="rounded-md bg-blue-500 px-3 py-2 text-white"
            onClick={() => console.log("view history")}
          >
            View History
          </button>
        )}
      </div>
    </Popup>
  );
}
