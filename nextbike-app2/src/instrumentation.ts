export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb } = await import("./db/init");
    await initDb();

    const cron = await import("node-cron");
    const { scrape } = await import("./lib/scraper");

    scrape().catch((err) => console.error("[scraper] Initial scrape failed:", err));

    cron.schedule("*/5 * * * *", () => {
      scrape().catch((err) => console.error("[scraper] Scheduled scrape failed:", err));
    });

    console.log("[cron] Scraper scheduled every 5 minutes");
  }
}
