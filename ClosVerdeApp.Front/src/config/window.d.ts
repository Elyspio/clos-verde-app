export type OAuthConfig = {
	authority: string;
	client_id: string;
	redirect_uri: string;
	post_logout_redirect_uri: string;
	response_type: string;
	scope: string;
};

export type RuntimeConfig = {
	endpoints: {
		core: string;
	};
	oauth: OAuthConfig;
};

declare global {
	interface Window {
		closVerdeApp: {
			config: RuntimeConfig;
		};
	}
}
