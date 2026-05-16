import { addDays, addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, isBefore, startOfMonth } from "date-fns";
import type { APIRequestContext } from "@playwright/test";
import type { CreateReservationRequest, Reservation } from "../../../src/core/apis/rest/api/generated";
import { futureSearchStartDate } from "./date.helpers";

function coversDay(reservation: Reservation, day: Date) {
	const start = new Date(reservation.startDate);
	const end = new Date(reservation.endDate);
	const dayStart = new Date(day);
	dayStart.setHours(0, 0, 0, 0);
	const dayEnd = new Date(day);
	dayEnd.setHours(23, 59, 59, 999);

	return start < dayEnd && end > dayStart;
}

async function parseJsonResponse<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>, context: string): Promise<T> {
	if (!response.ok()) {
		throw new Error(`${context} a échoué (${response.status()}) : ${await response.text()}`);
	}

	return (await response.json()) as T;
}

export async function createReservationViaApi(request: APIRequestContext, payload: CreateReservationRequest) {
	const response = await request.post("/api/reservations", { data: payload });
	return parseJsonResponse<Reservation>(response, "La création de réservation");
}

export async function deleteReservationViaApi(request: APIRequestContext, id: string) {
	const response = await request.delete(`/api/reservations/${id}`);
	if (response.status() === 404) return;

	if (!response.ok()) {
		throw new Error(`La suppression de la réservation ${id} a échoué (${response.status()}) : ${await response.text()}`);
	}
}

export async function getMonthReservations(request: APIRequestContext, year: number, month: number) {
	const response = await request.get("/api/reservations", { params: { year: String(year), month: String(month) } });
	return parseJsonResponse<Reservation[]>(response, `Le chargement des réservations ${year}-${String(month).padStart(2, "0")}`);
}

function hashSeed(seed: string): number {
	let hash = 2166136261;
	for (let index = 0; index < seed.length; index += 1) {
		hash ^= seed.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

function seededRandom(seed: string) {
	let state = hashSeed(seed) || 1;
	return () => {
		state = Math.imul(1664525, state) + 1013904223;
		return (state >>> 0) / 0x100000000;
	};
}

function shuffledFutureDays(seed: string): Date[] {
	const searchStart = futureSearchStartDate();
	const searchEnd = addMonths(searchStart, 12);
	const dayCount = differenceInCalendarDays(searchEnd, searchStart);
	const days = Array.from({ length: dayCount }, (_, index) => addDays(searchStart, index));
	const random = seededRandom(seed);

	for (let index = days.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(random() * (index + 1));
		[days[index], days[swapIndex]] = [days[swapIndex], days[index]];
	}

	return days;
}

async function findFreeDayInCandidates(request: APIRequestContext, candidates: Date[]) {
	const reservationsByMonth = new Map<string, Reservation[]>();

	for (const day of candidates) {
		const key = `${day.getFullYear()}-${day.getMonth() + 1}`;
		let reservations = reservationsByMonth.get(key);
		if (!reservations) {
			reservations = await getMonthReservations(request, day.getFullYear(), day.getMonth() + 1);
			reservationsByMonth.set(key, reservations);
		}

		if (reservations.some((reservation) => coversDay(reservation, day))) continue;
		return day;
	}

	return null;
}

export async function findFreeFutureDay(request: APIRequestContext, seed = `${Date.now()}-${Math.random()}`) {
	const searchStart = futureSearchStartDate();
	const workerScopedSeed = `${process.env.TEST_PARALLEL_INDEX ?? process.env.TEST_WORKER_INDEX ?? "0"}-${seed}`;
	const randomDay = await findFreeDayInCandidates(request, shuffledFutureDays(workerScopedSeed));
	if (randomDay) return randomDay;

	for (let offset = 0; offset < 12; offset += 1) {
		const monthDate = addMonths(searchStart, offset);
		const intervalStart = offset === 0 ? searchStart : startOfMonth(monthDate);
		const intervalEnd = endOfMonth(monthDate);
		const fallbackDay = await findFreeDayInCandidates(
			request,
			eachDayOfInterval({ start: intervalStart, end: intervalEnd }).filter((day) => !isBefore(day, searchStart)),
		);
		if (fallbackDay) return fallbackDay;
	}

	throw new Error("Aucun jour futur entièrement libre n'a été trouvé sur les 12 prochains mois.");
}

export async function cleanupReservations(request: APIRequestContext, ids: string[]) {
	const uniqueIds = [...new Set(ids.filter(Boolean))];
	const failures: string[] = [];

	for (const id of uniqueIds) {
		const response = await request.delete(`/api/reservations/${id}`);
		if (response.status() === 404 || response.ok()) continue;

		failures.push(`${id} (${response.status()}) ${await response.text()}`);
	}

	if (failures.length > 0) {
		throw new Error(`Le nettoyage E2E a échoué : ${failures.join(" | ")}`);
	}
}

/**
 * Best-effort cleanup of every reservation whose note starts with `e2e-`. Run this in a
 * `beforeEach` hook so previously failed runs don't poison the day-search.
 */
export async function cleanupOrphanE2eReservations(request: APIRequestContext) {
	const response = await request.get("/api/reservations");
	if (!response.ok()) return;
	const list = (await response.json()) as { id: string; note?: string | null; createdAt?: string | null }[];
	const cutoff = Date.now() - 60 * 60 * 1_000;
	const ids = list
		.filter((r) => {
			if (typeof r.note !== "string" || !r.note.startsWith("e2e-")) return false;
			if (!r.createdAt) return false;
			return new Date(r.createdAt).getTime() < cutoff;
		})
		.map((r) => r.id);
	if (ids.length === 0) return;
	await cleanupReservations(request, ids);
}
