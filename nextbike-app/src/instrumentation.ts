export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { scrape } = await import("./lib/scraper");

    scrape().catch((err) =>
      console.error("[scraper] Initial scrape failed:", err)
    );

    cron.schedule("*/1 * * * *", () => {
      scrape().catch((err) =>
        console.error("[scraper] Scheduled scrape failed:", err)
      );
    });

    console.log("[cron] Scraper scheduled every 1 minute");
  }
}
