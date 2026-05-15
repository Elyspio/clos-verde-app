import { differenceInMinutes, endOfDay, format, isAfter, isBefore, isSameDay, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import type { Reservation } from "@apis/rest/api/generated";

const NB_MINUTES_PER_DAY = 24 * 60 - 1;

export function parseReservationDate(value: string) {
	return parseISO(value);
}

export function reservationDurationLabel(startDate: string, endDate: string) {
	let minutes = Math.max(0, differenceInMinutes(parseReservationDate(endDate), parseReservationDate(startDate)));

	if (minutes % 60 === 59) minutes++;

	const days = Math.floor(minutes / 1440);
	const hours = Math.floor((minutes % 1440) / 60);
	const remainingMinutes = minutes % 60;
	const parts = [];

	if (days > 0) parts.push(`${days} j`);
	if (hours > 0) parts.push(`${hours} h`);
	if (remainingMinutes > 0 || parts.length === 0) parts.push(`${remainingMinutes} min`);

	return parts.join(" ");
}

function isStartOfDay(date: Date) {
	return date.getHours() === 0 && date.getMinutes() === 0;
}

function isEndOfDay(date: Date) {
	return date.getHours() === 23 && date.getMinutes() === 59;
}

function formatDay(date: Date) {
	return format(date, "dd/MM", { locale: fr });
}

function formatDayTime(date: Date) {
	return format(date, "dd/MM 'à' HH'h'mm", { locale: fr });
}

export function reservationPeriodLabel(startDate: string, endDate: string) {
	const start = parseReservationDate(startDate);
	const end = parseReservationDate(endDate);
	const startLabel = isStartOfDay(start) ? formatDay(start) : formatDayTime(start);

	if (isSameDay(start, end) && isEndOfDay(end)) {
		return `Le ${startLabel} jusqu'à la fin de la journée`;
	}

	if (isEndOfDay(end)) {
		return `Du ${startLabel} au ${formatDay(end)}`;
	}

	const endLabel = isStartOfDay(end) ? formatDay(end) : formatDayTime(end);
	return `Du ${startLabel} au ${endLabel}`;
}

export function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}
export function coversDay(reservation: Reservation, day: Date) {
	const start = parseISO(reservation.startDate);
	const end = parseISO(reservation.endDate);
	return isBefore(start, endOfDay(day)) && isAfter(end, startOfDay(day));
}

export const isFullDay = (reservation: Reservation) => differenceInMinutes(reservation.endDate, reservation.startDate) === NB_MINUTES_PER_DAY;

export function hasEmptySpaceInReservation(day: Date, data: Reservation[]) {
	const sumMinutes = data.reduce((sum, r) => {
		const endDate = isAfter(r.endDate, day) ? endOfDay(day) : r.endDate;
		const startDate = isBefore(r.startDate, day) ? startOfDay(day) : r.startDate;

		sum += differenceInMinutes(endDate, startDate);

		return sum;
	}, 0);

	return sumMinutes < NB_MINUTES_PER_DAY; // Nombre de minutes par jours
}
