import { AccessTime } from "@mui/icons-material";
import { Alert, Autocomplete, Box, Button, Checkbox, Container, Divider, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import {
	addHours,
	addMinutes,
	differenceInMinutes,
	endOfDay,
	format,
	getMonth,
	getYear,
	isAfter,
	isBefore,
	isSameDay,
	isValid,
	max,
	min,
	parseISO,
	set,
	startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale/fr";
import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { routes } from "@/config/routes";
import { useReservationsQueries } from "@data/reservations/reservations.queries";
import { useReservationsMutations } from "@data/reservations/reservations.mutations";
import { useUsersQueries } from "@data/users/users.queries";
import { useIsAdmin } from "@data/client/useIsAdmin";
import type { DirectoryUser, Reservation } from "@apis/rest/api/generated";
import { reservationPeriodLabel } from "@/utils/date.utils";

type ReservationLocationState = {
	date?: string;
	mode?: "day" | "slot";
	reservation?: Reservation;
};

type AvailabilitySlot = {
	start: Date;
	end: Date;
	type: "free" | "busy";
	reservation?: Reservation;
};

const serializeDateTime = (date: Date) => date.toISOString();

function durationLabel(minutes: number) {
	const days = Math.floor(minutes / 1440);
	const hours = Math.floor((minutes % 1440) / 60);
	const rest = minutes % 60;
	const parts = [];

	if (days > 0) parts.push(`${days} j`);
	if (hours > 0) parts.push(`${hours} h`);
	if (rest > 0 || parts.length === 0) parts.push(`${rest} min`);

	return parts.join(" ");
}

function nextQuarter(date: Date) {
	const minutes = date.getMinutes();
	const roundedMinutes = Math.ceil(minutes / 15) * 15;
	return set(addMinutes(date, roundedMinutes - minutes), { seconds: 0, milliseconds: 0 });
}

function defaultSlotStart(base: Date) {
	const morning = set(base, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
	const now = new Date();
	if (!isSameDay(base, now) || isBefore(now, morning)) return morning;
	return nextQuarter(now);
}

function isAllDayReservation(reservation: Reservation) {
	const start = parseISO(reservation.startDate);
	const end = parseISO(reservation.endDate);
	return start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59;
}

function initialDates(state: ReservationLocationState | null) {
	if (state?.reservation) {
		return {
			start: parseISO(state.reservation.startDate),
			end: parseISO(state.reservation.endDate),
			precise: !isAllDayReservation(state.reservation),
		};
	}

	const base = state?.date && isValid(parseISO(state.date)) ? parseISO(state.date) : new Date();
	if (state?.mode === "slot") {
		const start = defaultSlotStart(base);
		return {
			start,
			end: min([addHours(start, 1), endOfDay(base)]),
			precise: true,
		};
	}

	return {
		start: startOfDay(base),
		end: endOfDay(base),
		precise: false,
	};
}

function coversDay(reservation: Reservation, day: Date) {
	const start = parseISO(reservation.startDate);
	const end = parseISO(reservation.endDate);
	return isBefore(start, endOfDay(day)) && isAfter(end, startOfDay(day));
}

function buildAvailability(day: Date | null, reservations: Reservation[], editingReservation?: Reservation) {
	if (!day) return [];

	const now = new Date();
	const dayStart = isSameDay(day, now) ? max([startOfDay(day), nextQuarter(now)]) : startOfDay(day);
	const dayEnd = endOfDay(day);
	if (!isAfter(dayEnd, dayStart)) return [];

	const busySlots = reservations
		.filter((reservation) => reservation.id !== editingReservation?.id && coversDay(reservation, day))
		.map((reservation) => ({
			start: max([parseISO(reservation.startDate), dayStart]),
			end: min([parseISO(reservation.endDate), dayEnd]),
			type: "busy" as const,
			reservation,
		}))
		.sort((a, b) => a.start.getTime() - b.start.getTime());

	const slots: AvailabilitySlot[] = [];
	let cursor = dayStart;

	for (const busy of busySlots) {
		if (isAfter(busy.start, cursor)) {
			slots.push({ start: cursor, end: busy.start, type: "free" });
		}

		slots.push(busy);
		if (isAfter(busy.end, cursor)) cursor = busy.end;
	}

	if (isAfter(dayEnd, cursor)) {
		slots.push({ start: cursor, end: dayEnd, type: "free" });
	}

	return slots;
}

export function ReservationPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const routeState = location.state as ReservationLocationState | null;
	const editingReservation = routeState?.reservation;
	const initial = useMemo(() => initialDates(routeState), [routeState]);
	const [startDate, setStartDate] = useState<Date | null>(initial.start);
	const [endDate, setEndDate] = useState<Date | null>(initial.end);
	const [preciseTimes, setPreciseTimes] = useState(initial.precise);
	const [note, setNote] = useState(editingReservation?.note ?? "");
	const isAdmin = useIsAdmin();
	// Admins may book on behalf of another user when creating (not when editing). null = book for self.
	const [onBehalfOf, setOnBehalfOf] = useState<DirectoryUser | null>(null);
	const showUserPicker = isAdmin && !editingReservation;
	const { data: directoryUsers = [] } = useUsersQueries.list();
	const availabilityDay = useMemo(() => (startDate && isValid(startDate) ? startDate : initial.start), [initial.start, startDate]);
	const availabilityYear = getYear(availabilityDay);
	const availabilityMonth = getMonth(availabilityDay) + 1;
	const showAvailability = preciseTimes && !editingReservation && Boolean(availabilityDay);
	const { data: monthReservations = [] } = useReservationsQueries.byMonth(availabilityYear, availabilityMonth);
	const availabilitySlots = useMemo(
		() => (showAvailability ? buildAvailability(availabilityDay, monthReservations, editingReservation) : []),
		[availabilityDay, editingReservation, monthReservations, showAvailability],
	);

	const createMutation = useReservationsMutations.create();
	const updateMutation = useReservationsMutations.update();
	const activeMutation = editingReservation ? updateMutation : createMutation;

	const effectiveStart = useMemo(() => {
		if (!startDate || !isValid(startDate)) return null;
		return preciseTimes ? startDate : startOfDay(startDate);
	}, [preciseTimes, startDate]);

	const effectiveEnd = useMemo(() => {
		if (!endDate || !isValid(endDate)) return null;
		return preciseTimes ? endDate : endOfDay(endDate);
	}, [endDate, preciseTimes]);

	const durationMinutes = useMemo(() => {
		if (!effectiveStart || !effectiveEnd || !isAfter(effectiveEnd, effectiveStart)) return 0;
		return differenceInMinutes(effectiveEnd, effectiveStart);
	}, [effectiveEnd, effectiveStart]);

	const handleStartDateChange = (value: Date | null) => {
		setStartDate(value);
		if (!value) return;
		if (!endDate || isAfter(value, endDate)) setEndDate(preciseTimes ? value : endOfDay(value));
	};

	const handleEndDateChange = (value: Date | null) => {
		setEndDate(value);
	};

	const handlePreciseChange = (checked: boolean) => {
		setPreciseTimes(checked);
		if (!checked) {
			if (startDate) setStartDate(startOfDay(startDate));
			if (endDate) setEndDate(endOfDay(endDate));
			return;
		}

		if (startDate && endDate && !isAfter(endDate, startDate)) {
			setEndDate(set(isSameDay(startDate, endDate) ? startDate : endDate, { hours: 23, minutes: 59, seconds: 0, milliseconds: 0 }));
		}
	};

	const handleSelectAvailability = (slot: AvailabilitySlot) => {
		if (slot.type !== "free") return;
		setPreciseTimes(true);
		setStartDate(slot.start);
		setEndDate(slot.end);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!effectiveStart || !effectiveEnd || durationMinutes <= 0) return;

		const payload = {
			startDate: serializeDateTime(effectiveStart),
			endDate: serializeDateTime(effectiveEnd),
			note: note.trim() || undefined,
			onBehalfOfUserId: showUserPicker ? (onBehalfOf?.id ?? undefined) : undefined,
		};

		try {
			if (editingReservation) {
				await updateMutation.mutateAsync({ id: editingReservation.id, payload });
			} else {
				await createMutation.mutateAsync(payload);
			}
			void navigate(routes.app.calendar.path, { replace: true });
		} catch {
			// error surfaces via activeMutation.error below; nothing else to do here.
		}
	};

	return (
		<Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2.5, md: 5 } }}>
			<Button variant="outlined" onClick={() => navigate(routes.app.calendar.path)} sx={{ mb: 4 }}>
				← Retour au calendrier
			</Button>
			<Box maxWidth={720}>
				<Typography variant="h1">{editingReservation ? "Modifier la réservation" : "Réserver la place"}</Typography>
				<Typography variant="body1" color="text.secondary" mt={1.5} mb={4}>
					{preciseTimes ? "Choisissez un créneau précis pour éviter les chevauchements." : "Par défaut, la réservation couvre la journée entière."}
				</Typography>
			</Box>
			<Stack component="form" data-testid="reservation-form" spacing={3.5} onSubmit={handleSubmit} maxWidth={720}>
				{activeMutation.isError && <Alert severity="warning">{activeMutation.error?.message}</Alert>}
				{showUserPicker && (
					<Autocomplete
						options={directoryUsers}
						value={onBehalfOf}
						onChange={(_event, value) => setOnBehalfOf(value)}
						getOptionLabel={(option) => option.displayName}
						isOptionEqualToValue={(option, value) => option.id === value.id}
						renderInput={(params) => (
							<TextField {...params} label="Réserver pour" placeholder="Vous-même" helperText="Administrateur : choisissez un membre pour réserver à sa place." />
						)}
					/>
				)}
				<FormControlLabel
					control={<Checkbox checked={preciseTimes} onChange={(event) => handlePreciseChange(event.target.checked)} color="primary" />}
					label="Préciser les heures de début et de fin"
					sx={{
						alignSelf: "flex-start",
						border: "1px solid var(--line)",
						bgcolor: "var(--surface)",
						borderRadius: "14px",
						px: 1.4,
						py: 0.6,
						m: 0,
						"& .MuiFormControlLabel-label": { color: "var(--ink-soft)", fontSize: 13, fontWeight: 700 },
					}}
				/>
				<Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
					{preciseTimes ? (
						<>
							<DateTimePicker
								label="Début"
								value={startDate}
								onChange={handleStartDateChange}
								format="dd/MM/yyyy HH:mm"
								ampm={false}
								timeSteps={{ minutes: 15 }}
								slots={{ openPickerIcon: AccessTime }}
								slotProps={{ textField: { fullWidth: true, required: true, variant: "outlined" } }}
							/>
							<DateTimePicker
								label="Fin"
								value={endDate}
								onChange={handleEndDateChange}
								minDateTime={startDate ?? undefined}
								format="dd/MM/yyyy HH:mm"
								ampm={false}
								timeSteps={{ minutes: 15 }}
								slots={{ openPickerIcon: AccessTime }}
								slotProps={{ textField: { fullWidth: true, required: true, variant: "outlined" } }}
							/>
						</>
					) : (
						<>
							<DatePicker
								label="Date de début"
								value={startDate}
								onChange={handleStartDateChange}
								format="dd/MM/yyyy"
								slotProps={{ textField: { fullWidth: true, required: true, variant: "outlined" } }}
							/>
							<DatePicker
								label="Date de fin"
								value={endDate}
								onChange={handleEndDateChange}
								minDate={startDate ?? undefined}
								format="dd/MM/yyyy"
								slotProps={{ textField: { fullWidth: true, required: true, variant: "outlined" } }}
							/>
						</>
					)}
				</Stack>
				{showAvailability && (
					<Box
						sx={{
							border: "1px solid var(--line)",
							bgcolor: "var(--surface)",
							borderRadius: "16px",
							p: { xs: 2, sm: 2.5 },
						}}
					>
						<Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} mb={2}>
							<Box>
								<Typography sx={{ fontSize: 16, fontWeight: 900 }}>Disponibilités du jour</Typography>
								<Typography sx={{ color: "var(--ink-soft)", fontSize: 13 }}>
									{format(availabilityDay, "EEEE d MMMM", { locale: fr })} - cliquez une plage libre pour la sélectionner.
								</Typography>
							</Box>
							<Typography className="kicker" sx={{ color: "var(--primary-blue)" }}>
								00h00 - 23h59
							</Typography>
						</Stack>
						<Stack spacing={1}>
							{availabilitySlots.map((slot, index) => {
								const free = slot.type === "free";
								return (
									<Box key={`${slot.type}-${slot.start.toISOString()}-${index}`}>
										<Box
											component={free ? "button" : "div"}
											type={free ? "button" : undefined}
											onClick={free ? () => handleSelectAvailability(slot) : undefined}
											sx={{
												width: "100%",
												display: "grid",
												gridTemplateColumns: { xs: "1fr", sm: "150px 1fr auto" },
												alignItems: "center",
												gap: 1.5,
												border: "1px solid",
												borderColor: free ? "rgba(16, 185, 129, 0.28)" : "var(--line)",
												bgcolor: free ? "var(--mint-soft)" : "var(--surface-soft)",
												borderRadius: "12px",
												px: 1.5,
												py: 1.25,
												textAlign: "left",
												cursor: free ? "pointer" : "default",
												color: "var(--ink)",
												transition: "border-color 160ms ease, transform 160ms ease",
												"&:hover": free ? { borderColor: "var(--mint)", transform: "translateY(-1px)" } : undefined,
											}}
										>
											<Typography sx={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800 }}>
												{format(slot.start, "HH'h'mm")} - {format(slot.end, "HH'h'mm")}
											</Typography>
											<Typography sx={{ fontWeight: 800, color: free ? "#047857" : "var(--ink-soft)" }}>
												{free ? "Libre" : `Occupé par ${slot.reservation?.user.displayName ?? "un utilisateur"}`}
											</Typography>
											<Typography sx={{ color: "var(--ink-mute)", fontSize: 12 }}>
												{free
													? durationLabel(differenceInMinutes(slot.end, slot.start))
													: reservationPeriodLabel(slot.reservation!.startDate, slot.reservation!.endDate)}
											</Typography>
										</Box>
										{index < availabilitySlots.length - 1 && <Divider sx={{ my: 0.5, borderColor: "transparent" }} />}
									</Box>
								);
							})}
							{availabilitySlots.length === 0 && (
								<Typography sx={{ color: "var(--ink-soft)", fontSize: 13 }}>Aucune disponibilité trouvée pour cette journée.</Typography>
							)}
						</Stack>
					</Box>
				)}
				<TextField
					data-testid="reservation-note"
					label="Note"
					multiline
					rows={3}
					value={note}
					onChange={(event) => setNote(event.target.value)}
					placeholder="Optionnel - ex : famille en visite ce week-end"
				/>
				<Button type="submit" variant="contained" fullWidth disabled={activeMutation.isPending || durationMinutes <= 0}>
					{editingReservation ? "Enregistrer les modifications" : "Confirmer la réservation"}
				</Button>
			</Stack>
		</Container>
	);
}
