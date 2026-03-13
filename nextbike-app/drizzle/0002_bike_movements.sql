-- Materialized view: one row per movement (segment between two consecutive bike_positions).
-- Includes area_id and network_id from the start position's place for leaderboard queries.
CREATE MATERIALIZED VIEW "nextbike"."bike_movements" AS
WITH ordered AS (
  SELECT
    bp.id,
    bp.bike_id,
    bp.place_id,
    bp.location,
    bp.created_at,
    bp.last_seen_at,
    LEAD(bp.id) OVER w AS end_position_id,
    LEAD(bp.location) OVER w AS end_location,
    LEAD(bp.created_at) OVER w AS end_time
  FROM "nextbike"."bike_positions" bp
  WINDOW w AS (PARTITION BY bp.bike_id ORDER BY bp.created_at)
),
segments AS (
  SELECT
    ordered.bike_id,
    ordered.id AS start_position_id,
    ordered.end_position_id,
    ordered.location AS start_location,
    ordered.end_location,
    (ST_Distance(ordered.location::geography, ordered.end_location::geography) / 1000.0)::real AS distance_km,
    ordered.last_seen_at AS start_time,
    ordered.end_time,
    EXTRACT(EPOCH FROM (ordered.end_time - ordered.last_seen_at))::double precision AS duration_seconds,
    a.id AS area_id,
    a.network_id AS network_id
  FROM ordered
  JOIN "nextbike"."places" p ON p.id = ordered.place_id
  JOIN "nextbike"."areas" a ON a.id = p.area_id
  WHERE ordered.end_position_id IS NOT NULL
)
SELECT
  segments.bike_id,
  segments.start_position_id,
  segments.end_position_id,
  segments.start_location,
  segments.end_location,
  segments.distance_km,
  segments.start_time,
  segments.end_time,
  segments.duration_seconds,
  (segments.duration_seconds > 0 AND (segments.distance_km / (segments.duration_seconds / 3600.0)) <= 60) AS plausible,
  segments.area_id,
  segments.network_id
FROM segments
WITH DATA;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX "bike_movements_start_position_id_idx" ON "nextbike"."bike_movements" ("start_position_id");

-- Indexes for leaderboard aggregations
CREATE INDEX "bike_movements_bike_id_idx" ON "nextbike"."bike_movements" ("bike_id");
CREATE INDEX "bike_movements_area_id_idx" ON "nextbike"."bike_movements" ("area_id");
CREATE INDEX "bike_movements_network_id_idx" ON "nextbike"."bike_movements" ("network_id");
CREATE INDEX "bike_movements_plausible_idx" ON "nextbike"."bike_movements" ("plausible");
