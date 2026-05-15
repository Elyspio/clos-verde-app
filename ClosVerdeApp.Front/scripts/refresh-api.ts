import { generateApi } from "@elyspio/vite-eslint-config";
import path from "node:path";
import fs from "node:fs";

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

const apiUrl = process.env.SWAGGER_URL || "https://localhost:4000/swagger/v1/swagger.json";

const outputFolder = path.resolve("src", "core", "apis", "rest", "api", "generated");

await generateApi(apiUrl, outputFolder, "Backend");

await fs.promises.rm(path.resolve(outputFolder, "docs"), { recursive: true });
