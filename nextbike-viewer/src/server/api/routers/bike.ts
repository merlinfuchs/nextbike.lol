import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import type { Bike, BikeVersion } from "~/server/db/models";

export const bikeRouter = createTRPCRouter({
  getBikes: publicProcedure.query(async () => {
    const bikes = await db.collection<Bike>("bikes").find({}).toArray();
    return bikes;
  }),

  getBikeVersions: publicProcedure
    .input(z.object({ bikeNumber: z.string() }))
    .query(async ({ input }) => {
      const bikeVersions = await db
        .collection<BikeVersion>("bike_versions")
        .find({ number: input.bikeNumber })
        .toArray();
      return bikeVersions;
    }),
});
