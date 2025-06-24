import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const placeRouter = createTRPCRouter({
  getPlaces: publicProcedure.query(async () => {
    const places = await db.collection("places").find({}).toArray();
    return places;
  }),
});
