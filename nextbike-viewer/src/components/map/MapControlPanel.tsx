import { useState } from "react";
import type { Place } from "~/server/db/models";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

export type ControlOption = "zones" | "stations" | "bikes";

export default function MapControlPanel({
  options,
  onOptionToggle,
  selectedPlace,
  onSelectPlace,
  showBikeHistory,
  onShowBikeHistory,
}: {
  options: ControlOption[];
  onOptionToggle: (option: ControlOption) => void;
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
  showBikeHistory: boolean;
  onShowBikeHistory: (show: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute top-5 right-5 z-10 w-[80dvw] rounded-lg bg-white p-5 shadow-lg sm:w-[380px]">
      {selectedPlace ? (
        <div>
          <div>
            <h1 className="mb-1 text-lg font-bold">{selectedPlace.name}</h1>
            <p className="mb-5 text-sm text-gray-500">
              {selectedPlace.address ||
                `${selectedPlace.lat}, ${selectedPlace.lng}`}
            </p>
          </div>

          {!collapsed && (
            <div className="mb-5 max-h-[300px] overflow-y-auto rounded-sm bg-gray-200 p-1 font-mono text-xs whitespace-pre-wrap">
              {JSON.stringify(selectedPlace, null, 2)}
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
              {selectedPlace.bike && (
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
      ) : (
        <div>
          <h1 className="mb-1 text-lg font-bold">nextbike.lol</h1>
          <p className="mb-5 text-sm text-gray-500">
            Explore the Nextbike zones and places on a map. Not affiliated with
            Nextbike.
          </p>

          {!collapsed && (
            <>
              <p className="mb-5 text-sm text-gray-500">
                Click on a bike or station to view more information. For bikes,
                you can also view the history where the bike was last seen.
              </p>

              <div className="mb-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.includes("zones")}
                    onChange={() => onOptionToggle("zones")}
                    className="h-4 w-4"
                  />
                  <label>Show zones</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.includes("stations")}
                    onChange={() => onOptionToggle("stations")}
                    className="h-4 w-4"
                  />
                  <label>Show stations</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.includes("bikes")}
                    onChange={() => onOptionToggle("bikes")}
                    className="h-4 w-4"
                  />
                  <label>Show bikes</label>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <a
              href="https://github.com/merlinfuchs/nextbike.lol"
              className="text-sm text-blue-400 hover:text-blue-500"
              target="_blank"
            >
              Source Code
            </a>

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
      )}
    </div>
  );
}
