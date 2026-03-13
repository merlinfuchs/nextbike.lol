export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { scrape } = await import("./lib/scraper");
    const { db } = await import("./db");
    const { bikeMovements } = await import("./db/schema");

    scrape().catch((err) =>
      console.error("[scraper] Initial scrape failed:", err)
    );

    cron.schedule("*/1 * * * *", () => {
      scrape().catch((err) =>
        console.error("[scraper] Scheduled scrape failed:", err)
      );
    });

    const refreshBikeMovements = () =>
      db
        .refreshMaterializedView(bikeMovements)
        .concurrently()
        .then(() => console.log("[cron] bike_movements refreshed"))
        .catch((err) =>
          console.error("[cron] bike_movements refresh failed:", err)
        );

    refreshBikeMovements();
    cron.schedule("*/30 * * * *", refreshBikeMovements);

    console.log("[cron] Scraper scheduled every 1 minute");
    console.log("[cron] bike_movements refresh scheduled every 30 minutes");
  }
}
