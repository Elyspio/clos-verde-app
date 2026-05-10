import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useLocation, useNavigate } from "react-router-dom";
import { routes } from "@/config/routes";
import { AppShell } from "./AppShell";
import { SplashScreen } from "./SplashScreen";

export function ProtectedRoute() {
	const auth = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		if (auth.error && location.pathname !== routes.auth.tokenError.path) {
			void navigate(routes.auth.tokenError.path, { replace: true });
			return;
		}

		if (!auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator) {
			void auth.signinRedirect();
		}
	}, [auth, auth.activeNavigator, auth.error, auth.isAuthenticated, auth.isLoading, location.pathname, navigate]);

	if (!auth.isAuthenticated) return <SplashScreen />;

	return <AppShell />;
}
