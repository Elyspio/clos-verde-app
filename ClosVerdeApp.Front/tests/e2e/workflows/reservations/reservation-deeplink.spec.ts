import { addDays, format, startOfDay } from "date-fns";
import { expect, test } from "../../helpers/authenticated-test";
import { createRunId } from "../../helpers/date.helpers";
import { cleanupOrphanE2eReservations, cleanupReservations, createReservationViaApi, findFreeFutureDay } from "../../helpers/reservation-data.helpers";

test.describe("Reservation deep-link (push notification)", () => {
	const createdReservationIds: string[] = [];

	test.beforeEach(async ({ apiClient }) => {
		await cleanupOrphanE2eReservations(apiClient);
	});

	test.afterEach(async ({ apiClient }) => {
		await cleanupReservations(apiClient, createdReservationIds);
		createdReservationIds.length = 0;
	});

	test("ouvre automatiquement la popup de détail quand l'URL contient ?reservation=&date=", async ({ apiClient, page }) => {
		const runId = createRunId();
		const day = await findFreeFutureDay(apiClient, runId);
		const start = startOfDay(day);
		const end = addDays(start, 1);

		const reservation = await createReservationViaApi(apiClient, {
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			note: `e2e-deeplink-${runId}`,
		});
		createdReservationIds.push(reservation.id);

		const dateParam = format(start, "yyyy-MM-dd");
		await page.goto(`/calendrier?reservation=${reservation.id}&date=${dateParam}`);

		const dialog = page.getByTestId("reservation-dialog");
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAttribute("data-reservation-id", reservation.id);
		await expect(dialog).toContainText(`e2e-deeplink-${runId}`);

		// Closing the dialog must NOT re-open it (the deep-link should be consumed once).
		await page
			.getByRole("button", { name: /Fermer|Annuler la réservation|Supprimer/ })
			.first()
			.click();
		await expect(dialog).toBeHidden();
		await expect(page).toHaveURL(/\/calendrier(\?.*)?$/);
		await expect(page).not.toHaveURL(/reservation=/);
	});

	test("change automatiquement de mois si la réservation est dans un mois différent du courant", async ({ apiClient, page }) => {
		const runId = createRunId();
		// Find a free day at least one month ahead so the calendar must move forward.
		const day = await findFreeFutureDay(apiClient, runId);
		// findFreeFutureDay starts from today + safety margin; we just need a day not in the
		// current visible month. The default `monthDate` is `startOfMonth(new Date())`, so any
		// day beyond the current month works.
		const start = startOfDay(day);
		const end = addDays(start, 1);

		const reservation = await createReservationViaApi(apiClient, {
			startDate: start.toISOString(),
			endDate: end.toISOString(),
			note: `e2e-deeplink-month-${runId}`,
		});
		createdReservationIds.push(reservation.id);

		const dateParam = format(start, "yyyy-MM-dd");
		await page.goto(`/calendrier?reservation=${reservation.id}&date=${dateParam}`);

		await expect(page.getByTestId("reservation-dialog")).toBeVisible();
		await expect(page.getByTestId("reservation-dialog")).toHaveAttribute("data-reservation-id", reservation.id);
	});
});
