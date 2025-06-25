export interface Bike {
  _id: string;
  active: boolean;
  battery_pack: string | null;
  bike_type: number;
  boardcomputer: number;
  electric_lock: boolean;
  last_seen_at: Date;
  lock_types: string;
  number: string;
  pedelec_battery: string | null;
  place_id: number;
  state: string;
}

export interface BikeVersion {
  _id: string;
  active: boolean;
  battery_pack: string | null;
  bike_type: number;
  boardcomputer: number;
  electric_lock: boolean;
  first_seen_at: Date;
  last_seen_at: Date;
  lock_types: string;
  number: string;
  pedelec_battery: string | null;
  place_id: number;
  state: string;
}

export interface City {
  _id: number;
  alias: string;
  available_bikes: number;
  bike_types: string;
  booked_bikes: number;
  bounds_north_east_lat: number;
  bounds_north_east_lng: number;
  bounds_south_west_lat: number;
  bounds_south_west_lng: number;
  break: boolean;
  domain: string;
  last_seen_at: Date;
  lat: number;
  lng: number;
  maps_icon: string;
  name: string;
  num_places: number;
  refresh_rate: string;
  return_to_official_only: boolean;
  set_point_bikes: number;
  uid: number;
  website: string;
  zoom: number;
}

export interface Country {
  _id: string;
  available_bikes: number;
  booked_bikes: number;
  capped_available_bikes: boolean;
  country: string;
  country_calling_code: string;
  country_name: string;
  currency: string;
  domain: string;
  email: string;
  faq_url: string;
  hotline: string;
  language: string;
  last_seen_at: Date;
  lat: number;
  lng: number;
  name: string;
  no_registration: boolean;
  policy: string;
  pricing: string;
  set_point_bikes: number;
  show_bike_type_groups: boolean;
  show_bike_types: boolean;
  show_free_racks: boolean;
  store_uri_android: string;
  store_uri_ios: string;
  system_operator_address: string;
  terms: string;
  timezone: string;
  vat: string;
  website: string;
  zoom: number;
}

export interface Place {
  _id: number;
  address: string | null;
  bike: boolean;
  bike_numbers: string;
  bike_racks: number;
  bike_types: string;
  bikes: number;
  bikes_available_to_rent: number;
  booked_bikes: number;
  city_id: number;
  free_racks: number;
  free_special_racks: number;
  last_seen_at: Date;
  lat: number;
  lng: number;
  maintenance: boolean;
  name: string;
  number: number;
  place_type: string;
  rack_locks: boolean;
  special_racks: number;
  spot: boolean;
  terminal_type: string;
  uid: number;
}

export interface Zone {
  _id: string;
  id: string;
  city_id: number;
  type: string;
  last_seen_at: Date;
  properties: Record<string, any>;
  geometry: Record<string, any>;
}
