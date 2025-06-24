import requests
from dotenv import load_dotenv
from pymongo import MongoClient
from os import environ as env
from datetime import datetime, timezone
import hashlib

load_dotenv()


LIVE_DATA_URL = "https://maps.nextbike.net/maps/nextbike-live.flatjson"


def main():
    client = MongoClient(env.get("MONGO_URI"))
    db = client[env.get("MONGO_DB", "nextbike")]

    scrape_time = datetime.now(timezone.utc)
    resp = requests.get(LIVE_DATA_URL)

    if resp.status_code != 200:
        raise Exception(f"Failed to fetch data: {resp.status_code}")

    data = resp.json()

    for country in data["countries"]:
        country["_id"] = country["name"]
        country["last_seen_at"] = scrape_time
        db.countries.update_one(
            {"_id": country["_id"]},
            {"$set": country},
            upsert=True,
        )

    for city in data["cities"]:
        city["_id"] = city["uid"]
        city["last_seen_at"] = scrape_time
        db.cities.update_one(
            {"_id": city["_id"]},
            {"$set": city},
            upsert=True,
        )

        zone_resp = requests.get(
            f"https://zone-service.nextbikecloud.net/v1/zones/city/{city['uid']}"
        )
        if zone_resp.status_code == 200:
            zones = zone_resp.json()["features"]
            for zone in zones:
                zone["_id"] = zone["id"]
                zone["city_id"] = city["_id"]
                zone["last_seen_at"] = scrape_time
                db.zones.update_one(
                    {"_id": zone["_id"]},
                    {"$set": zone},
                    upsert=True,
                )

    for place in data["places"]:
        place["_id"] = place["uid"]
        place["last_seen_at"] = scrape_time
        db.places.update_one(
            {"_id": place["_id"]},
            {"$set": place},
            upsert=True,
        )

    for bike in data["bikes"]:
        bike_hash = hashlib.sha256(str(bike).encode()).hexdigest()

        db.bikes.update_one(
            {"_id": bike["number"]},
            {
                "$set": {
                    "_id": bike["number"],
                    "last_seen_at": scrape_time,
                    **bike,
                },
            },
            upsert=True,
        )

        db.bike_versions.update_one(
            {"_id": bike_hash},
            {
                "$set": {
                    "_id": bike_hash,
                    "last_seen_at": scrape_time,
                    **bike,
                },
                "$setOnInsert": {
                    "first_seen_at": scrape_time,
                },
            },
            upsert=True,
        )


if __name__ == "__main__":
    main()
