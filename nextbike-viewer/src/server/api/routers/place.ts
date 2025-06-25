import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const placeRouter = createTRPCRouter({
  getPlaces: publicProcedure.query(async () => {
    const places = await db
      .collection("places")
      .find(
        {},
        {
          projection: { _id: 1, lat: 1, lng: 1, spot: 1, bike: 1 },
        },
      )
      .toArray();
    return places;
  }),
});
