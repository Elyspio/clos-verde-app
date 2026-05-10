import { Box, Typography } from "@mui/material";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale/fr";
import type { Reservation } from "@apis/rest/api/generated";
import type { AuthUser } from "@/core/auth/auth.types";
import { DayCell } from "./DayCell";

type CalendarGridProps = {
	monthDate: Date;
	reservations: Reservation[];
	currentUser: AuthUser | null;
	onSelectReservation: (reservation: Reservation) => void;
};

export function CalendarGrid({ monthDate, reservations, currentUser, onSelectReservation }: CalendarGridProps) {
	const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
	const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
	const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
	const weekdays = days.slice(0, 7);

	return (
		<Box sx={{ overflowX: "auto", pb: 1 }}>
			<Box sx={{ minWidth: 760 }}>
				<Box display="grid" gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap="1px" mb="1px">
					{weekdays.map((day) => (
						<Typography key={day.toISOString()} className="kicker" sx={{ py: 1, textAlign: "center", color: "var(--ink-mute)" }}>
							{format(day, "eee", { locale: fr })}
						</Typography>
					))}
				</Box>
				<Box
					data-testid="calendar-grid"
					sx={{
						display: "grid",
						gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
						gap: "1px",
						bgcolor: "var(--line)",
						border: "1px solid var(--line)",
						borderRadius: "18px",
						overflow: "hidden",
					}}
				>
					{days.map((day) => (
						<DayCell
							key={day.toISOString()}
							day={day}
							currentMonth={monthDate}
							reservations={reservations}
							currentUser={currentUser}
							onSelectReservation={onSelectReservation}
						/>
					))}
				</Box>
			</Box>
		</Box>
	);
}
