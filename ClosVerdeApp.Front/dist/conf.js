window.closVerdeApp ??= {};
window.closVerdeApp.config = {
	endpoints: {
		core: "https://localhost:4000",
	},
	oauth: {
		authority: "https://auth.elyspio.fr/realms/clos-verde",
		client_id: "cv_dev-front",
		redirect_uri: `${window.location.origin}/login/callback`,
		post_logout_redirect_uri: `${window.location.origin}/login`,
		response_type: "code",
		scope: "openid profile email",
	},
};
