export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { scrape } = await import("./lib/scraper");
    const { db } = await import("./db");
    const { bikeMovements } = await import("./db/schema");
    const { refreshStatsCache } = await import("./lib/statsCache");

    scrape().catch((err) =>
      console.error("[scraper] Initial scrape failed:", err)
    );

    cron.schedule("*/2 * * * *", () => {
      scrape().catch((err) =>
        console.error("[scraper] Scheduled scrape failed:", err)
      );
    });

    const refreshBikeMovements = async () => {
      try {
        await db.refreshMaterializedView(bikeMovements).concurrently();
        console.log("[cron] bike_movements refreshed");
      } catch (err) {
        console.error("[cron] bike_movements refresh failed:", err);
        return;
      }
      try {
        await refreshStatsCache();
      } catch (err) {
        console.error("[cron] stats_cache refresh failed:", err);
      }
    };

    refreshBikeMovements();
    cron.schedule("*/10 * * * *", refreshBikeMovements);

    console.log("[cron] Scraper scheduled every 2 minutes");
    console.log("[cron] bike_movements refresh scheduled every 10 minutes");
  }
}
