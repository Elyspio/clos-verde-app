import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { Navigate, Route, Routes } from "react-router-dom";
import { routes } from "@/config/routes";
import { setUnauthorizedHandler } from "@/core/api/client";
import { startReservationRealtime, stopReservationRealtime } from "@/core/realtime/reservations";
import { useAppDispatch } from "@/store";
import { LoginPage } from "@/view/components/auth/LoginPage";
import { CalendarPage } from "@/view/components/calendar/CalendarPage";
import { ProtectedRoute } from "@/view/components/layout/ProtectedRoute";
import { SplashScreen } from "@/view/components/layout/SplashScreen";
import { LeaderboardPage } from "@/view/components/leaderboard/LeaderboardPage";
import { ReservationPage } from "@/view/components/reservation/ReservationPage";

export function AppRouter() {
	const dispatch = useAppDispatch();
	const auth = useAuth();

	useEffect(() => {
		setUnauthorizedHandler(() => {
			void auth.signinSilent().catch(() => auth.signinRedirect());
		});
	}, [auth]);

	useEffect(() => {
		if (!auth.isAuthenticated) {
			void stopReservationRealtime();
			return;
		}

		void startReservationRealtime(dispatch);
		return () => {
			void stopReservationRealtime();
		};
	}, [auth.isAuthenticated, dispatch]);

	if (auth.isLoading) return <SplashScreen />;

	return (
		<Routes>
			<Route path={routes.auth.login.path} element={<LoginPage />} />
			<Route path={routes.auth.callback.path} element={<Navigate to={routes.app.root.path} replace />} />
			<Route element={<ProtectedRoute />}>
				<Route index element={<Navigate to={routes.app.calendar.path} replace />} />
				<Route path={routes.app.calendar.path} element={<CalendarPage />} />
				<Route path={routes.app.reservation.path} element={<ReservationPage />} />
				<Route path={routes.app.leaderboard.path} element={<LeaderboardPage />} />
			</Route>
			<Route path="*" element={<Navigate to={routes.app.root.path} replace />} />
		</Routes>
	);
}
