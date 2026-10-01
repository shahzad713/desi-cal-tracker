// Day 9 — capture real product screenshots for the marketing landing.
// Logs in as the seeded demo user, screenshots /track, /dashboard, /dishes.
import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3100";
const OUT = path.join(__dirname, "..", "public", "screenshots");

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/opt/meta-chromium/chrome",
    args: ["--no-sandbox", "--no-proxy-server"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", "demo@desical.ai");
  await page.fill("#password", "DemoPass123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("logged in");

  const shots: Array<[string, string]> = [
    ["/track", "track.png"],
    ["/dashboard", "dashboard.png"],
    ["/dishes", "dishes.png"],
  ];
  for (const [route, file] of shots) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800); // let client bits settle
    await page.screenshot({ path: path.join(OUT, file) });
    console.log("saved", file);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
