import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const bikeRouter = createTRPCRouter({
  getBikes: publicProcedure.query(async () => {
    const bikes = await db.collection("bikes").find({}).toArray();
    return bikes;
  }),

  getBikeVersions: publicProcedure
    .input(z.object({ bikeNumber: z.string() }))
    .mutation(async ({ input }) => {
      const bikeVersions = await db
        .collection("bike_versions")
        .find({ number: input.bikeNumber })
        .toArray();
      return bikeVersions;
    }),
});
