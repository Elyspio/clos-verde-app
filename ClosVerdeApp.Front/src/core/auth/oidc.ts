import type { AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import { routes } from "@/config/routes";

// Vite-injected env vars (set by Aspire AppHost) win over the static `public/conf.js` runtime
// config. This lets the local Keycloak managed by Aspire override the production authority
// without rebuilding the SPA.
const runtime = window.closVerdeApp.config.oauth;
const authority = import.meta.env.VITE_KEYCLOAK_AUTHORITY ?? runtime.authority;
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? runtime.client_id;

export const oidcConfig: AuthProviderProps = {
	...runtime,
	authority,
	client_id: clientId,
	automaticSilentRenew: true,
	loadUserInfo: false,
	userStore: new WebStorageStateStore({ store: window.localStorage }),
	onSigninCallback: () => {
		window.history.replaceState({}, document.title, routes.app.root.path);
	},
};
