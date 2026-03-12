import { createTRPCRouter } from "../init";
import { nextbikeRouter } from "./nextbike";

export const appRouter = createTRPCRouter({
  nextbike: nextbikeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
