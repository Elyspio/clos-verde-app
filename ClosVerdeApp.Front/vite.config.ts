import { getDefaultConfig } from "@elyspio/vite-eslint-config";
import { defineConfig } from "vite-plus";

const __dirname = import.meta.dirname;

const config = getDefaultConfig({ basePath: __dirname });

export default defineConfig(config);
