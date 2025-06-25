import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import type { Place } from "~/server/db/models";

export const placeRouter = createTRPCRouter({
  getPlaces: publicProcedure.query(async () => {
    const places = await db
      .collection<Place>("places")
      .find(
        {
          last_seen_at: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 48) },
        },
        /* {
          projection: {
            _id: 1,
            lat: 1,
            lng: 1,
            spot: 1,
            bike: 1,
            bikes: 1,
            name: 1,
          },
        }, */
      )
      .toArray();
    return places;
  }),
});
