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
    LEAD(bp.id) OVER w AS end_position_id,
    LEAD(bp.location) OVER w AS end_location,
    LEAD(bp.created_at) OVER w AS end_time
  FROM "nextbike"."bike_positions" bp
  WINDOW w AS (PARTITION BY bp.bike_id ORDER BY bp.created_at)
)
SELECT
  ordered.bike_id,
  ordered.id AS start_position_id,
  ordered.end_position_id,
  ordered.location AS start_location,
  ordered.end_location,
  (ST_Distance(ordered.location::geography, ordered.end_location::geography) / 1000.0)::real AS distance_km,
  ordered.created_at AS start_time,
  ordered.end_time,
  a.id AS area_id,
  a.network_id AS network_id
FROM ordered
JOIN "nextbike"."places" p ON p.id = ordered.place_id
JOIN "nextbike"."areas" a ON a.id = p.area_id
WHERE ordered.end_position_id IS NOT NULL
WITH DATA;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX "bike_movements_start_position_id_idx" ON "nextbike"."bike_movements" ("start_position_id");

-- Indexes for leaderboard aggregations
CREATE INDEX "bike_movements_bike_id_idx" ON "nextbike"."bike_movements" ("bike_id");
CREATE INDEX "bike_movements_area_id_idx" ON "nextbike"."bike_movements" ("area_id");
CREATE INDEX "bike_movements_network_id_idx" ON "nextbike"."bike_movements" ("network_id");
