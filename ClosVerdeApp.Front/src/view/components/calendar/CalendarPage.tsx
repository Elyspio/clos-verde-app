import { Alert, Box, Button, Container, Stack } from "@mui/material";
import { Add, CalendarMonth, LeaderboardOutlined } from "@mui/icons-material";
import { getMonth, getYear, parseISO, startOfMonth } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReservationsQueries } from "@data/reservations/reservations.queries";
import type { Reservation } from "@apis/rest/api/generated";
import type { AuthUser } from "@/core/auth/auth.types";
import { routes } from "@/config/routes";
import { LeaderboardList } from "@/view/components/leaderboard/LeaderboardList";
import { CalendarGrid } from "./CalendarGrid";
import { DeleteReservationDialog } from "./DeleteReservationDialog";
import { MonthHeader } from "./MonthHeader";

type CalendarTab = "calendar" | "leaderboard";

export function CalendarPage() {
	const auth = useAuth();
	const currentUser = useMemo<AuthUser | null>(() => {
		const profile = auth.user?.profile;
		if (!profile?.sub) return null;
		return {
			id: profile.sub,
			displayName: profile.name ?? profile.preferred_username,
			email: profile.email,
		};
	}, [auth.user?.profile]);
	const navigate = useNavigate();
	const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
	const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
	const [tab, setTab] = useState<CalendarTab>(() => (new URLSearchParams(window.location.search).get("tab") === "leaderboard" ? "leaderboard" : "calendar"));
	const year = getYear(monthDate);
	const month = getMonth(monthDate) + 1;
	const { data: reservations = [], isPending, isError } = useReservationsQueries.byMonth(year, month);

	// Deep-link: when arriving from a "reservation-created" push, the URL carries the
	// reservation id and its start date. Jump the calendar to that month and open the
	// detail dialog as soon as the reservation lands in the cache.
	const [searchParams, setSearchParams] = useSearchParams();
	const targetReservationId = searchParams.get("reservation");
	const targetReservationDate = searchParams.get("date");
	const consumedDeepLinkRef = useRef<string | null>(null);

	useEffect(() => {
		if (!targetReservationId || !targetReservationDate) return;
		if (consumedDeepLinkRef.current === targetReservationId) return;
		const targetMonth = startOfMonth(parseISO(targetReservationDate));
		if (targetMonth.getTime() !== monthDate.getTime()) {
			setMonthDate(targetMonth);
		}
	}, [targetReservationId, targetReservationDate, monthDate]);

	useEffect(() => {
		if (!targetReservationId) return;
		if (consumedDeepLinkRef.current === targetReservationId) return;
		const found = reservations.find((r) => r.id === targetReservationId);
		if (!found) return;
		consumedDeepLinkRef.current = targetReservationId;
		setSelectedReservation(found);
		// Strip the params so a refresh doesn't re-open the dialog endlessly.
		const next = new URLSearchParams(searchParams);
		next.delete("reservation");
		next.delete("date");
		setSearchParams(next, { replace: true });
	}, [reservations, targetReservationId, searchParams, setSearchParams]);

	return (
		<Container maxWidth="xl" sx={{ maxWidth: "1280px", px: { xs: 2.5, md: 5 }, py: { xs: 4, md: 6 } }}>
			<Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
				<CalendarTabs tab={tab} onChange={setTab} />
				<Button variant="contained" startIcon={<Add />} onClick={() => void navigate(routes.app.reservation.path)} data-testid="reserve-day">
					Réserver un jour
				</Button>
			</Stack>
			{tab === "calendar" ? (
				<>
					<MonthHeader monthDate={monthDate} onChangeMonth={(date) => setMonthDate(startOfMonth(date))} />
					{isError && (
						<Alert severity="error" sx={{ mb: 3 }}>
							Impossible de charger les réservations.
						</Alert>
					)}
					<Box sx={{ opacity: isPending ? 0.62 : 1, transition: "opacity 180ms ease" }}>
						<CalendarGrid monthDate={monthDate} reservations={reservations} currentUser={currentUser} onSelectReservation={setSelectedReservation} />
					</Box>
					<DeleteReservationDialog reservation={selectedReservation} currentUser={currentUser} onClose={() => setSelectedReservation(null)} />
				</>
			) : (
				<LeaderboardList />
			)}
		</Container>
	);
}

function CalendarTabs({ tab, onChange }: { tab: CalendarTab; onChange: (tab: CalendarTab) => void }) {
	const options: { key: CalendarTab; label: string; icon: typeof CalendarMonth }[] = [
		{ key: "calendar", label: "Calendrier", icon: CalendarMonth },
		{ key: "leaderboard", label: "Classement", icon: LeaderboardOutlined },
	];
	return (
		<Stack direction="row" spacing={0.5} sx={{ p: 0.5, borderRadius: "999px", border: "1px solid var(--line)", bgcolor: "var(--surface-soft)" }}>
			{options.map(({ key, label, icon: Icon }) => {
				const active = tab === key;
				return (
					<Button
						key={key}
						onClick={() => onChange(key)}
						startIcon={<Icon sx={{ fontSize: 17 }} />}
						sx={{
							borderRadius: "999px",
							px: 1.75,
							py: 0.75,
							minHeight: 0,
							fontSize: "0.82rem",
							fontWeight: 800,
							color: active ? "var(--primary-blue)" : "var(--ink-mute)",
							bgcolor: active ? "var(--surface)" : "transparent",
							boxShadow: active ? "0 6px 16px rgba(15,23,42,0.06)" : "none",
							"&:hover": { bgcolor: active ? "var(--surface)" : "transparent", color: "var(--primary-blue)" },
						}}
					>
						{label}
					</Button>
				);
			})}
		</Stack>
	);
}
