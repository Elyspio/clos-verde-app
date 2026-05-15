import { Alert, Box, Container } from "@mui/material";
import { getMonth, getYear, parseISO, startOfMonth } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useSearchParams } from "react-router-dom";
import { useReservationsQueries } from "@data/reservations/reservations.queries";
import type { Reservation } from "@apis/rest/api/generated";
import type { AuthUser } from "@/core/auth/auth.types";
import { CalendarGrid } from "./CalendarGrid";
import { DeleteReservationDialog } from "./DeleteReservationDialog";
import { MonthHeader } from "./MonthHeader";

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
	const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
	const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
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
		</Container>
	);
}
