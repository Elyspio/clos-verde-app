import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { setAccessToken } from "./token";

export function TokenSync() {
	const auth = useAuth();

	useEffect(() => {
		setAccessToken(auth.user?.access_token ?? null);
	}, [auth.user?.access_token]);

	return null;
}
