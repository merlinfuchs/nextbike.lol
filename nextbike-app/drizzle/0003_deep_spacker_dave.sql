CREATE TABLE "nextbike"."kv_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bike_positions_bike_id_created_at_idx" ON "nextbike"."bike_positions" USING btree ("bike_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "places_station_area_idx" ON "nextbike"."places" USING btree ("area_id") WHERE spot = true AND bike = false;