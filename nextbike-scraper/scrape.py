import requests
from dotenv import load_dotenv
from pymongo import MongoClient
from os import environ as env
from datetime import datetime, timezone

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

    for place in data["places"]:
        place["_id"] = place["uid"]
        place["last_seen_at"] = scrape_time
        db.places.update_one(
            {"_id": place["_id"]},
            {"$set": place},
            upsert=True,
        )

    for bike in data["bikes"]:
        bike["_id"] = bike["number"]
        bike["last_seen_at"] = scrape_time

        place_id = bike.pop("place_id")

        db.bikes.update_one(
            {"_id": bike["_id"]},
            {
                "$set": bike,
                "$push": {
                    "places": {
                        "$each": [
                            {
                                "place_id": place_id,
                                "seen_at": scrape_time,
                            },
                        ],
                        "$position": 0,
                    },
                },
            },
            upsert=True,
        )


if __name__ == "__main__":
    main()
