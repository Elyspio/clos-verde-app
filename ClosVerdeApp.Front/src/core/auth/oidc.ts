import type { AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import { routes } from "@/config/routes";

const { oauth } = window.closVerdeApp.config;

export const oidcConfig: AuthProviderProps = {
	...oauth,
	automaticSilentRenew: true,
	loadUserInfo: false,
	userStore: new WebStorageStateStore({ store: window.localStorage }),
	onSigninCallback: () => {
		window.history.replaceState({}, document.title, routes.app.root.path);
	},
};
