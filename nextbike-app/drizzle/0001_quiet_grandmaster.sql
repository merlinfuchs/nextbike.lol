CREATE SCHEMA "nextbike";
--> statement-breakpoint
CREATE TABLE "nextbike"."areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" integer NOT NULL,
	"network_id" integer NOT NULL,
	"name" text NOT NULL,
	"alias" text NOT NULL,
	"maps_icon" text NOT NULL,
	"website_url" text NOT NULL,
	"break" boolean DEFAULT false NOT NULL,
	"num_places" integer DEFAULT 0 NOT NULL,
	"booked_bikes" integer DEFAULT 0 NOT NULL,
	"set_point_bikes" integer DEFAULT 0 NOT NULL,
	"available_bikes" integer DEFAULT 0 NOT NULL,
	"return_to_official_only" boolean NOT NULL,
	"refresh_rate" text NOT NULL,
	"bikes_types" jsonb NOT NULL,
	"bounds_north_east" geometry(point) NOT NULL,
	"bounds_south_west" geometry(point) NOT NULL,
	"location" geometry(point) NOT NULL,
	"zoom" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "areas_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "nextbike"."bike_positions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bike_number" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"place_id" integer,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nextbike"."bikes" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"place_id" integer NOT NULL,
	"bike_type" integer NOT NULL,
	"lock_types" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"state" text NOT NULL,
	"electric_lock" boolean DEFAULT false NOT NULL,
	"board_computer" integer NOT NULL,
	"pedelec_battery" integer,
	"battery_pack" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "bikes_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "nextbike"."networks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hotline" text NOT NULL,
	"domain" text NOT NULL,
	"language" text NOT NULL,
	"email" text NOT NULL,
	"timezone" text NOT NULL,
	"currency" text NOT NULL,
	"country_calling_code" text NOT NULL,
	"system_operator_address" text NOT NULL,
	"country" text NOT NULL,
	"country_name" text NOT NULL,
	"terms_url" text NOT NULL,
	"policy_url" text NOT NULL,
	"website_url" text NOT NULL,
	"pricing_url" text NOT NULL,
	"faq_url" text NOT NULL,
	"store_android_url" text NOT NULL,
	"store_ios_url" text NOT NULL,
	"vat" text NOT NULL,
	"show_bike_types" boolean NOT NULL,
	"show_bike_type_groups" boolean NOT NULL,
	"show_free_racks" boolean NOT NULL,
	"booked_bikes" integer DEFAULT 0 NOT NULL,
	"set_point_bikes" integer DEFAULT 0 NOT NULL,
	"available_bikes" integer DEFAULT 0 NOT NULL,
	"capped_available_bikes" boolean NOT NULL,
	"no_registration" boolean NOT NULL,
	"express_rental" boolean NOT NULL,
	"location" geometry(point) NOT NULL,
	"zoom" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "networks_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "nextbike"."places" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" integer NOT NULL,
	"area_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"bike" boolean DEFAULT false NOT NULL,
	"spot" boolean DEFAULT false NOT NULL,
	"maintenance" boolean DEFAULT false NOT NULL,
	"terminal_type" text NOT NULL,
	"place_type" text NOT NULL,
	"number" integer NOT NULL,
	"booked_bikes" integer DEFAULT 0 NOT NULL,
	"bikes" integer DEFAULT 0 NOT NULL,
	"bikes_available_to_rent" integer DEFAULT 0 NOT NULL,
	"active_place" integer DEFAULT 0 NOT NULL,
	"bike_racks" integer DEFAULT 0 NOT NULL,
	"free_racks" integer DEFAULT 0 NOT NULL,
	"special_racks" integer DEFAULT 0 NOT NULL,
	"free_special_racks" integer DEFAULT 0 NOT NULL,
	"rack_locks" boolean DEFAULT false NOT NULL,
	"bike_types" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "places_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "nextbike"."areas" ADD CONSTRAINT "areas_network_id_networks_id_fk" FOREIGN KEY ("network_id") REFERENCES "nextbike"."networks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nextbike"."bikes" ADD CONSTRAINT "bikes_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "nextbike"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nextbike"."places" ADD CONSTRAINT "places_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "nextbike"."areas"("id") ON DELETE cascade ON UPDATE no action;