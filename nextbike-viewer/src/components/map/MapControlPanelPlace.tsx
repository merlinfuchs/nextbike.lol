import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { formatRelative } from "date-fns";

import type { Place } from "~/server/db/models";

export default function MapControlPanelPlace({
  place,
  collapsed,
  onSelectPlace,
  onShowBikeHistory,
  showBikeHistory,
  setCollapsed,
}: {
  place: Place;
  collapsed: boolean;
  onSelectPlace: (place: Place | null) => void;
  onShowBikeHistory: (show: boolean) => void;
  showBikeHistory: boolean;
  setCollapsed: (collapsed: boolean) => void;
}) {
  return (
    <div>
      <div>
        <h1 className="mb-1 text-lg font-bold">{place.name}</h1>
        <p className="mb-5 text-sm text-gray-500">
          {place.address || `${place.lat}, ${place.lng}`}
        </p>
      </div>

      {!collapsed && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          {place.spot && (
            <>
              <div>
                <h2 className="mb-1 text-sm font-bold">Total Bikes</h2>
                <p className="text-sm text-gray-500">{place.bikes}</p>
              </div>

              <div>
                <h2 className="mb-1 text-sm font-bold">Available Bikes</h2>
                <p className="text-sm text-gray-500">
                  {place.bikes_available_to_rent}
                </p>
              </div>

              <div>
                <h2 className="mb-1 text-sm font-bold">Booked Bikes</h2>
                <p className="text-sm text-gray-500">{place.booked_bikes}</p>
              </div>

              <div>
                <h2 className="mb-1 text-sm font-bold">Bikes</h2>
                <div className="flex flex-wrap gap-1">
                  {place.bike_numbers?.split(",").map((b) => (
                    <div
                      key={b}
                      className="rounded-sm bg-gray-200 px-1 text-sm text-gray-700"
                    >
                      {b}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-1 text-sm font-bold">Total Racks</h2>
                <p className="text-sm text-gray-500">{place.bike_racks}</p>
              </div>

              <div>
                <h2 className="mb-1 text-sm font-bold">Free Racks</h2>
                <p className="text-sm text-gray-500">{place.free_racks}</p>
              </div>
            </>
          )}

          <div>
            <h2 className="mb-1 text-sm font-bold">Last Seen</h2>
            <p className="text-sm text-gray-500">
              {formatRelative(new Date(place.last_seen_at), new Date())}
            </p>
          </div>

          <div>
            <h2 className="mb-1 text-sm font-bold">Maintenance</h2>
            <p className="text-sm text-gray-500">
              {place.maintenance ? "Yes" : "No"}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => onSelectPlace(null)}
            className="cursor-pointer rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
          >
            Close
          </button>
          {place.bike && (
            <button
              onClick={() => onShowBikeHistory(!showBikeHistory)}
              className="cursor-pointer rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
            >
              {showBikeHistory ? "Hide History" : "View History"}
            </button>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="cursor-pointer rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100"
        >
          {collapsed ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronUpIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
