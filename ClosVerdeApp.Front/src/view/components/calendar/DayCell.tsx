import { Add } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { format, isBefore, isSameMonth, isToday, parseISO, startOfToday } from "date-fns";
import { useNavigate } from "react-router-dom";
import type { Reservation } from "@apis/rest/api/generated";
import type { AuthUser } from "@/core/auth/auth.types";
import { coversDay, hasEmptySpaceInReservation, isFullDay } from "@/utils/date.utils";

type DayCellProps = {
	day: Date;
	currentMonth: Date;
	reservations: Reservation[];
	currentUser: AuthUser | null;
	onSelectReservation: (reservation: Reservation) => void;
};

export function DayCell({ day, currentMonth, reservations, currentUser, onSelectReservation }: DayCellProps) {
	const navigate = useNavigate();
	const sameMonth = isSameMonth(day, currentMonth);
	const past = isBefore(day, startOfToday());
	const dayReservations = reservations.filter((reservation) => coversDay(reservation, day));
	const free = dayReservations.length === 0;

	const handleClick = () => {
		if (past || !sameMonth) return;
		if (free) void navigate("/reserver", { state: { date: format(day, "yyyy-MM-dd"), mode: "day" } });
	};

	const handleAddSlot = () => {
		if (past || !sameMonth) return;
		void navigate("/reserver", { state: { date: format(day, "yyyy-MM-dd"), mode: "slot" } });
	};

	const anySpaceInDay = hasEmptySpaceInReservation(day, dayReservations);
	return (
		<Box
			data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
			role={free && !past && sameMonth ? "button" : undefined}
			tabIndex={free && !past && sameMonth ? 0 : undefined}
			onClick={handleClick}
			onKeyDown={(event) => {
				if ((event.key === "Enter" || event.key === " ") && free) {
					event.preventDefault();
					handleClick();
				}
			}}
			sx={{
				minHeight: { xs: 96, md: 120 },
				p: { xs: 1.25, md: 1.5 },
				border: 0,
				textAlign: "left",
				bgcolor: "var(--surface)",
				color: "var(--ink)",
				opacity: sameMonth ? (past ? 0.45 : 1) : 0.35,
				boxShadow: isToday(day) ? "inset 0 0 0 2px var(--primary-blue)" : "none",
				cursor: free && !past && sameMonth ? "pointer" : "default",
				transition: "background-color 180ms ease, box-shadow 180ms ease",
				"&:hover": free && !past && sameMonth ? { bgcolor: "var(--surface-blue)" } : undefined,
			}}
		>
			<Stack minHeight="100%" justifyContent="space-between" spacing={1}>
				<Typography
					sx={{
						fontSize: { xs: 18, md: 20 },
						lineHeight: 1,
						fontWeight: 800,
						color: isToday(day) ? "var(--primary-blue)" : "var(--ink)",
					}}
				>
					{format(day, "d")}
				</Typography>
				<Stack spacing={0.5}>
					{dayReservations.map((reservation) => {
						const own = reservation.user.id === currentUser?.id;
						const pending = reservation.validation.status === "Pending";
						const hasObjection = pending && Boolean(reservation.objection);
						return (
							<Box
								component="button"
								type="button"
								data-testid={`reservation-pill-${reservation.id}`}
								key={reservation.id}
								onClick={(event) => {
									event.stopPropagation();
									onSelectReservation(reservation);
								}}
								sx={{
									bgcolor: hasObjection ? "rgba(245, 158, 11, 0.18)" : own ? "var(--primary-blue)" : "var(--mint-soft)",
									color: hasObjection ? "#b45309" : own ? "var(--surface)" : "#047857",
									border: hasObjection
										? "1px dashed #b45309"
										: pending
											? own
												? "1px dashed var(--primary-blue)"
												: "1px dashed #047857"
											: own
												? "1px solid var(--primary-blue)"
												: "1px solid rgba(16, 185, 129, 0.28)",
									borderRadius: "8px",
									fontSize: 11,
									fontWeight: 800,
									px: 1,
									py: 0.55,
									minWidth: 0,
									textAlign: "left",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									cursor: "pointer",
									opacity: pending && !hasObjection ? 0.85 : 1,
									transition: "filter 160ms ease, transform 160ms ease",
									"&:hover": { filter: "brightness(0.97)", transform: "translateY(-1px)" },
								}}
							>
								{pending ? "⏳ " : ""}
								{!isFullDay(reservation) ? format(parseISO(reservation.startDate), "HH:mm") : ""} {reservation.user.displayName}
							</Box>
						);
					})}
					{!free && !past && sameMonth && anySpaceInDay && (
						<Button
							data-testid={`add-slot-${format(day, "yyyy-MM-dd")}`}
							size="small"
							startIcon={<Add sx={{ fontSize: 15 }} />}
							onClick={(event) => {
								event.stopPropagation();
								handleAddSlot();
							}}
							sx={{
								justifyContent: "flex-start",
								minHeight: 28,
								px: 0.85,
								borderRadius: "8px",
								fontSize: 11,
								fontWeight: 900,
								color: "var(--primary-blue)",
								bgcolor: "var(--surface-blue)",
							}}
						>
							Ajouter
						</Button>
					)}
				</Stack>
			</Stack>
		</Box>
	);
}
