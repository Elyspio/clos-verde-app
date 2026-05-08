import { differenceInCalendarDays, differenceInMinutes, format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale/fr";

export function parseReservationDate(value: string) {
	return parseISO(value);
}

export function reservationDayCount(startDate: string, endDate: string) {
	return differenceInCalendarDays(parseReservationDate(endDate), parseReservationDate(startDate)) + 1;
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
