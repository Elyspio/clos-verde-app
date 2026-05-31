import { jwtDecode } from "jwt-decode";
import { useMemo } from "react";
import { useAuth } from "react-oidc-context";

/**
 * Keycloak ships realm role memberships in the `realm_access.roles` claim of the
 * **access token**, not the id token. `oidc-client-ts` decodes the id token into
 * `auth.user.profile`, which is why reading `profile.realm_access` returns
 * `undefined` here — we have to crack the access token open ourselves.
 *
 * The decode is local-only (already-validated JWT we received over TLS); using it
 * for a UI affordance is fine — every admin-only endpoint is also server-gated by
 * `[Authorize(Roles = "admin")]`, which is the real check.
 */
type AccessTokenPayload = {
	realm_access?: {
		roles?: string[];
	};
};

export function useIsAdmin(): boolean {
	const auth = useAuth();
	const accessToken = auth.user?.access_token;
	return useMemo(() => {
		if (!accessToken) return false;
		try {
			const { realm_access } = jwtDecode<AccessTokenPayload>(accessToken);
			return Array.isArray(realm_access?.roles) && realm_access.roles.includes("admin");
		} catch {
			return false;
		}
	}, [accessToken]);
}
