import type { Page } from "@playwright/test";
import { parseISO } from "date-fns";
import type { Reservation } from "../../../../src/core/apis/rest/api/generated";
import { expect, test } from "../../helpers/authenticated-test";
import { calendarDayTestId, createRunId, monthsFromCurrentCalendar } from "../../helpers/date.helpers";
import { cleanupOrphanE2eReservations, cleanupReservations, findFreeFutureDay } from "../../helpers/reservation-data.helpers";

async function navigateToReservationMonth(page: Page, reservationDate: Date) {
	const monthsAhead = monthsFromCurrentCalendar(reservationDate);

	for (let index = 0; index < monthsAhead; index += 1) {
		await page.getByRole("button", { name: /→/ }).click();
	}
}

test.describe("Reservation CRUD", () => {
	const createdReservationIds: string[] = [];

	// Reservations from previous failed runs leave Alice booked on every day, which makes
	// `findFreeFutureDay` return a busy day and the form refuses to confirm.
	test.beforeEach(async ({ apiClient }) => {
		await cleanupOrphanE2eReservations(apiClient);
	});

	test.afterEach(async ({ apiClient }) => {
		await cleanupReservations(apiClient, createdReservationIds);
		createdReservationIds.length = 0;
	});

	test("crée, modifie puis supprime une réservation journée complète", async ({ apiClient, page }) => {
		const runId = createRunId();
		const initialNote = `e2e-${runId}`;
		const updatedNote = `${initialNote}-maj`;
		const reservationDay = await findFreeFutureDay(apiClient);

		await page.goto("/calendrier");
		await navigateToReservationMonth(page, reservationDay);
		await page.getByTestId(calendarDayTestId(reservationDay)).click();
		await expect(page).toHaveURL(/\/reserver$/);
		await expect(page.getByTestId("reservation-form")).toBeVisible();
		await page.getByTestId("reservation-note").getByRole("textbox").fill(initialNote);

		const createResponsePromise = page.waitForResponse(
			(response) => response.request().method() === "POST" && response.url().endsWith("/api/reservations") && response.status() === 201,
		);

		await page.getByRole("button", { name: "Confirmer la réservation" }).click();

		const createResponse = await createResponsePromise;
		const createdReservation = (await createResponse.json()) as Reservation;
		createdReservationIds.push(createdReservation.id);
		const createdReservationDay = parseISO(createdReservation.startDate);

		await expect(page).toHaveURL(/\/calendrier$/);

		await navigateToReservationMonth(page, createdReservationDay);
		const dayCell = page.getByTestId(calendarDayTestId(createdReservationDay));
		await expect(dayCell).toBeVisible();
		const reservationPill = dayCell.getByTestId(`reservation-pill-${createdReservation.id}`);
		await expect(reservationPill).toBeVisible();

		await reservationPill.click();
		await page.getByRole("button", { name: "Modifier" }).click();
		await expect(page).toHaveURL(/\/reserver$/);
		await page.getByTestId("reservation-note").getByRole("textbox").fill(updatedNote);

		const updateResponsePromise = page.waitForResponse(
			(response) => response.request().method() === "PUT" && response.url().endsWith(`/api/reservations/${createdReservation.id}`) && response.status() === 200,
		);

		await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
		await updateResponsePromise;
		await expect(page).toHaveURL(/\/calendrier$/);

		await navigateToReservationMonth(page, createdReservationDay);
		await page.getByTestId(calendarDayTestId(createdReservationDay)).getByTestId(`reservation-pill-${createdReservation.id}`).click();
		await expect(page.getByText(updatedNote)).toBeVisible();

		const deleteResponsePromise = page.waitForResponse(
			(response) => response.request().method() === "DELETE" && response.url().endsWith(`/api/reservations/${createdReservation.id}`) && response.status() === 204,
		);

		await page.getByRole("button", { name: "Annuler la réservation" }).click();
		await deleteResponsePromise;
		await expect(page.getByTestId(calendarDayTestId(createdReservationDay)).getByTestId(`reservation-pill-${createdReservation.id}`)).toHaveCount(0);
	});
});
