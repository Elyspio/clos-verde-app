import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { AppShell } from "./AppShell";
import { SplashScreen } from "./SplashScreen";

export function ProtectedRoute() {
	const auth = useAuth();

	useEffect(() => {
		if (!auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator) {
			void auth.signinRedirect();
		}
	}, [auth, auth.activeNavigator, auth.isAuthenticated, auth.isLoading]);

	if (!auth.isAuthenticated) return <SplashScreen />;

	return <AppShell />;
}
