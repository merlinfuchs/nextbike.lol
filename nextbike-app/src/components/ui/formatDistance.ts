export function formatDistance(km: number): string {
  if (km === 0) return "0 km";
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
  return `${km.toFixed(1)} km`;
}
