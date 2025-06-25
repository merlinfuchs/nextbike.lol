import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import type { Zone } from "~/server/db/models";

export const cityRouter = createTRPCRouter({
  getAllZones: publicProcedure.query(async () => {
    const zones = await db.collection<Zone>("zones").find({}).toArray();
    return zones;
  }),
});
