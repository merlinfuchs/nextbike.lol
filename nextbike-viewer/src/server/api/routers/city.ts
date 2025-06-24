import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const cityRouter = createTRPCRouter({
  getAllZones: publicProcedure.query(async () => {
    const zones = await db.collection("zones").find({}).toArray();
    return zones;
  }),
});
