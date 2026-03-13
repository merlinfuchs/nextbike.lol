import MapLoader from "@/components/MapLoader";

type FocusParams = {
  stationId?: string;
  bikeId?: string;
  lat?: string;
  lng?: string;
  zoom?: string;
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<FocusParams>;
}) {
  const params = await searchParams;
  return <MapLoader initialFocusParams={params} />;
}
