import { addDays, differenceInCalendarMonths, format, startOfDay, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale/fr";

export function createRunId() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatCalendarDayValue(date: Date) {
	return format(date, "yyyy-MM-dd");
}

export function calendarDayTestId(date: Date) {
	return `calendar-day-${formatCalendarDayValue(date)}`;
}

export function addSlotTestId(date: Date) {
	return `add-slot-${formatCalendarDayValue(date)}`;
}

export function monthsFromCurrentCalendar(date: Date) {
	return differenceInCalendarMonths(startOfMonth(date), startOfMonth(new Date()));
}

export function toDateInputValue(date: Date) {
	return format(date, "dd/MM/yyyy");
}

export function toDateTimeInputValue(date: Date) {
	return format(date, "dd/MM/yyyy HH:mm");
}

export function toApiDateTime(date: Date) {
	return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

export function futureSearchStartDate() {
	return addDays(startOfDay(new Date()), 45);
}

export function monthHeadingLabel(date: Date) {
	const label = format(date, "MMMM yyyy", { locale: fr });
	return label.charAt(0).toUpperCase() + label.slice(1);
}
