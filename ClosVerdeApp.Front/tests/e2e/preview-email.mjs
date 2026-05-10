import { chromium } from "@playwright/test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(__dirname, "../../../docs/email/presentation-clos-verde.html");
const OUT = path.resolve(__dirname, "../../../docs/email/preview.png");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 700, height: 1200 } });
const page = await context.newPage();
await page.goto(pathToFileURL(HTML).href, { waitUntil: "load" });
await page.waitForTimeout(500);
await page.screenshot({ path: OUT, fullPage: true });
console.log(`[preview] saved ${OUT}`);
await browser.close();
