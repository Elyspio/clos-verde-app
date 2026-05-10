import { useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { routes } from "@/config/routes";
import { setUnauthorizedHandler } from "@apis/rest/api/clients/api.client";
import { clearStoredAuthSession } from "@/core/auth/session";
import { startMessagesRealtime, stopMessagesRealtime } from "@/core/apis/websocket/messages";
import { startReservationRealtime, stopReservationRealtime } from "@/core/apis/websocket/reservations";
import { refreshPushSubscriptionStatus } from "@/core/notifications/notifications";
import { useAppDispatch } from "@/store";
import { setCurrentUser } from "@/store/modules/unread/unread.actions";
import { fetchTopics } from "@/store/modules/topics/topics.actions";
import { fetchUsers } from "@/store/modules/users/users.actions";
import { LoginPage } from "@/view/components/auth/LoginPage";
import { TokenErrorPage } from "@/view/components/auth/TokenErrorPage";
import { CalendarPage } from "@/view/components/calendar/CalendarPage";
import { ProtectedRoute } from "@/view/components/layout/ProtectedRoute";
import { SplashScreen } from "@/view/components/layout/SplashScreen";
import { LeaderboardPage } from "@/view/components/leaderboard/LeaderboardPage";
import { ReservationPage } from "@/view/components/reservation/ReservationPage";
import { MessagesPage } from "@/view/components/messages/MessagesPage";
import { TopicView } from "@/view/components/messages/TopicView";

export function AppRouter() {
	const dispatch = useAppDispatch();
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
				void stopReservationRealtime();
				void stopMessagesRealtime();
				dispatch(setCurrentUser(null));
				void navigate(routes.auth.tokenError.path, { replace: true });
			});
		});
	}, [dispatch, location.pathname, navigate]);

	useEffect(() => {
		if (!auth.isAuthenticated) {
			void stopReservationRealtime();
			void stopMessagesRealtime();
			dispatch(setCurrentUser(null));
			return;
		}

		dispatch(setCurrentUser(auth.user?.profile?.sub ?? null));
		void startReservationRealtime(dispatch);
		void startMessagesRealtime(dispatch);
		void refreshPushSubscriptionStatus();
		void dispatch(fetchTopics());
		// Pull the realm directory from Keycloak (cached server-side) at session start so `@mention`
		// candidates are ready before the user opens Messages. Refreshes on the next session.
		void dispatch(fetchUsers());
		return () => {
			void stopReservationRealtime();
			void stopMessagesRealtime();
		};
	}, [auth.isAuthenticated, auth.user?.profile?.sub, dispatch]);

	if (auth.isLoading) return <SplashScreen />;

	return (
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
	);
}
