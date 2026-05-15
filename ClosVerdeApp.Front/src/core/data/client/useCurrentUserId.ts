import { useAuth } from "react-oidc-context";

export function useCurrentUserId(): string | null {
	const auth = useAuth();
	return auth.user?.profile?.sub ?? null;
}
