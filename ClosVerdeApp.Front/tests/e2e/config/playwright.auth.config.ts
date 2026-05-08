import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { e2eRootDir, playwrightPrivateEnv } from "./load-private-env";

export default defineConfig({
	testDir: e2eRootDir,
	testMatch: ["setup/**/*.setup.ts"],
	fullyParallel: false,
	workers: 1,
	timeout: 5 * 60_000,
	outputDir: join(e2eRootDir, "test-results"),
	reporter: [["html", { open: "never", outputFolder: join(e2eRootDir, "playwright-report") }]],
	use: {
		baseURL: playwrightPrivateEnv.baseUrl,
		ignoreHTTPSErrors: true,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
});
