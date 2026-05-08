import { config as loadDotEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));

export const e2eRootDir = resolve(configDir, "..");
export const privateEnvPath = resolve(e2eRootDir, ".env.private");

loadDotEnv({ path: privateEnvPath, quiet: true });

function readOptionalEnv(name: string, fallback?: string) {
	const value = process.env[name]?.trim();
	if (value && value.length > 0) return value;
	return fallback;
}

function resolveFromRoot(pathValue: string) {
	return resolve(e2eRootDir, pathValue);
}

export const playwrightPrivateEnv = {
	baseUrl: readOptionalEnv("PLAYWRIGHT_BASE_URL", "https://localhost:3000")!,
	apiBaseUrl: readOptionalEnv("PLAYWRIGHT_API_BASE_URL", "https://localhost:4000")!,
	keycloakAuthority: readOptionalEnv("PLAYWRIGHT_KEYCLOAK_AUTHORITY", "https://auth.elyspio.fr/realms/clos-verde")!,
	keycloakClientId: readOptionalEnv("PLAYWRIGHT_KEYCLOAK_CLIENT_ID", "cv_dev-front")!,
	keycloakLogin: readOptionalEnv("PLAYWRIGHT_KEYCLOAK_LOGIN"),
	keycloakPassword: readOptionalEnv("PLAYWRIGHT_KEYCLOAK_PASSWORD"),
	storageStatePath: resolveFromRoot(readOptionalEnv("PLAYWRIGHT_STORAGE_STATE_PATH", "cache/.auth/user.json")!),
};

export function requirePrivateEnvValue(name: "PLAYWRIGHT_KEYCLOAK_LOGIN" | "PLAYWRIGHT_KEYCLOAK_PASSWORD") {
	const value = process.env[name]?.trim();
	if (value && value.length > 0) return value;

	throw new Error(`La variable ${name} est requise. Ajoutez-la dans ${privateEnvPath}.`);
}
