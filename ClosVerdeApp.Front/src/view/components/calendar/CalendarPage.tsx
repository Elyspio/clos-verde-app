import { Alert, Box, Container } from "@mui/material";
import { getMonth, getYear, startOfMonth } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchMonthReservations, selectMonth, selectMonthStatus } from "@/store/modules/reservations/reservations.actions";
import type { AuthUser, Reservation } from "@/types/models";
import { CalendarGrid } from "./CalendarGrid";
import { DeleteReservationDialog } from "./DeleteReservationDialog";
import { MonthHeader } from "./MonthHeader";

export function CalendarPage() {
	const dispatch = useAppDispatch();
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
	const reservations = useAppSelector((state) => selectMonth(state, year, month));
	const status = useAppSelector((state) => selectMonthStatus(state, year, month));

	useEffect(() => {
		void dispatch(fetchMonthReservations({ year, month }));
	}, [dispatch, month, year]);

	const refetch = () => {
		void dispatch(fetchMonthReservations({ year, month }));
	};

	return (
		<Container maxWidth="xl" sx={{ maxWidth: "1280px", px: { xs: 2.5, md: 5 }, py: { xs: 4, md: 6 } }}>
			<MonthHeader monthDate={monthDate} onChangeMonth={(date) => setMonthDate(startOfMonth(date))} />
			{status === "error" && (
				<Alert severity="error" sx={{ mb: 3 }}>
					Impossible de charger les réservations.
				</Alert>
			)}
			<Box sx={{ opacity: status === "loading" ? 0.62 : 1, transition: "opacity 180ms ease" }}>
				<CalendarGrid monthDate={monthDate} reservations={reservations} currentUser={currentUser} onSelectReservation={setSelectedReservation} />
			</Box>
			<DeleteReservationDialog reservation={selectedReservation} currentUser={currentUser} onClose={() => setSelectedReservation(null)} onDeleted={refetch} />
		</Container>
	);
}
