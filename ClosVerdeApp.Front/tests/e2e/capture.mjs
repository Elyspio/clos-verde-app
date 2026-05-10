import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://localhost:3000";
const OUT = path.resolve(__dirname, "../../../docs/email/images");
fs.mkdirSync(OUT, { recursive: true });

const targets = [
	{ name: "01-accueil", url: `${BASE}/` },
	{ name: "02-calendrier", url: `${BASE}/calendrier` },
	{ name: "03-reserver", url: `${BASE}/reserver` },
	{ name: "04-classement", url: `${BASE}/classement` },
	{ name: "05-messages", url: `${BASE}/messages` },
];

const username = process.env.CV_USER ?? "alice.martin";
const password = process.env.CV_PWD ?? "password";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
	ignoreHTTPSErrors: true,
	viewport: { width: 1440, height: 900 },
	deviceScaleFactor: 1,
	locale: "fr-FR",
});
const page = await context.newPage();

console.log(`[capture] navigate ${BASE}/`);
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });

await page.waitForLoadState("networkidle").catch(() => {});

const isLogin = await page
	.waitForSelector('input[name="username"], input#username', { timeout: 8000 })
	.then(() => true)
	.catch(() => false);

if (isLogin) {
	console.log("[capture] login form detected — signing in");
	await page.fill('input[name="username"], input#username', username);
	await page.fill('input[name="password"], input#password', password);
	await Promise.all([page.waitForLoadState("networkidle").catch(() => {}), page.click('input[type="submit"], button[type="submit"]')]);
	await page.waitForURL(/localhost:3000/, { timeout: 15000 }).catch(() => {});
	await page.waitForLoadState("networkidle").catch(() => {});
}

for (const t of targets) {
	console.log(`[capture] ${t.name} -> ${t.url}`);
	await page.goto(t.url, { waitUntil: "domcontentloaded" });
	await page.waitForLoadState("networkidle").catch(() => {});
	await page.waitForTimeout(1200);
	if (t.name === "05-messages") {
		// Click the topic item (the one showing the message count, not the uppercase section header)
		const topic = page.locator("text=/\\d+\\s*messages?/").first();
		if (await topic.count()) {
			await topic.click().catch(() => {});
			await page.waitForLoadState("networkidle").catch(() => {});
			await page.waitForTimeout(1200);
		}
	}
	const file = path.join(OUT, `${t.name}.png`);
	await page.screenshot({ path: file, fullPage: false });
	console.log(`  saved ${file}`);
}

await browser.close();
console.log("[capture] done");
