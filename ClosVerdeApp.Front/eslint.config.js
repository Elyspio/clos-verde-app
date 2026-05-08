import config from "@elyspio/vite-eslint-config/eslint.config.mjs";

config.push({ ignores: ["**/generated/**"] });

export default config;
