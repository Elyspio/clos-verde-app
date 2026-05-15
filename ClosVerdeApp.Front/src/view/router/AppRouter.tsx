import { lazy, Suspense, useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { routes } from "@/config/routes";
import { setUnauthorizedHandler } from "@apis/rest/api/clients/api.client";
import { clearStoredAuthSession } from "@/core/auth/session";
import { ProtectedRoute } from "@/view/components/layout/ProtectedRoute";
import { RouteFallback } from "@/view/components/layout/RouteFallback";
import { SplashScreen } from "@/view/components/layout/SplashScreen";

// Pages are loaded on demand so the entry chunk stays small. Each `lazy()` call becomes
// its own dynamic chunk that the router fetches when the route matches. The `.then(...)`
// shim is required because pages export their components as named exports, not default.
const LoginPage = lazy(() => import("@/view/components/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const TokenErrorPage = lazy(() => import("@/view/components/auth/TokenErrorPage").then((m) => ({ default: m.TokenErrorPage })));
const CalendarPage = lazy(() => import("@/view/components/calendar/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const ReservationPage = lazy(() => import("@/view/components/reservation/ReservationPage").then((m) => ({ default: m.ReservationPage })));
const LeaderboardPage = lazy(() => import("@/view/components/leaderboard/LeaderboardPage").then((m) => ({ default: m.LeaderboardPage })));
const MessagesPage = lazy(() => import("@/view/components/messages/MessagesPage").then((m) => ({ default: m.MessagesPage })));
const TopicView = lazy(() => import("@/view/components/messages/TopicView").then((m) => ({ default: m.TopicView })));

export function AppRouter() {
	const auth = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const authRef = useRef(auth);
	authRef.current = auth;

	useEffect(() => {
		setUnauthorizedHandler(() => {
			if (location.pathname === routes.auth.tokenError.path) return;

			void authRef.current.signinSilent().catch(() => {
				clearStoredAuthSession();
				void authRef.current.removeUser().catch(() => undefined);
				void navigate(routes.auth.tokenError.path, { replace: true });
			});
		});
	}, [location.pathname, navigate]);

	if (auth.isLoading) return <SplashScreen />;

	return (
		<Suspense fallback={<RouteFallback />}>
			<Routes>
				<Route path={routes.auth.login.path} element={<LoginPage />} />
				<Route path={routes.auth.callback.path} element={<Navigate to={routes.app.root.path} replace />} />
				<Route path={routes.auth.tokenError.path} element={<TokenErrorPage />} />
				<Route element={<ProtectedRoute />}>
					<Route index element={<Navigate to={routes.app.calendar.path} replace />} />
					<Route path={routes.app.calendar.path} element={<CalendarPage />} />
					<Route path={routes.app.reservation.path} element={<ReservationPage />} />
					<Route path={routes.app.leaderboard.path} element={<LeaderboardPage />} />
					<Route path={routes.app.messages.path} element={<MessagesPage />}>
						<Route path=":topicId" element={<TopicView />} />
					</Route>
				</Route>
				<Route path="*" element={<Navigate to={routes.app.calendar.path} replace />} />
			</Routes>
		</Suspense>
	);
}
