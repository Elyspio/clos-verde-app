import { set } from "date-fns";
import { expect, test } from "../../helpers/authenticated-test";
import { cleanupReservations, createReservationViaApi, findFreeFutureDay } from "../../helpers/reservation-data.helpers";
import { createRunId, toApiDateTime, toDateInputValue } from "../../helpers/date.helpers";
import { fillPickerField } from "../../helpers/picker.helpers";

test.describe("Reservation conflict", () => {
	const createdReservationIds: string[] = [];

	test.afterEach(async ({ apiClient }) => {
		await cleanupReservations(apiClient, createdReservationIds);
		createdReservationIds.length = 0;
	});

	test("affiche le message de conflit en français", async ({ apiClient, page }) => {
		const runId = createRunId();
		const reservationDay = await findFreeFutureDay(apiClient, runId);
		const existingStart = set(reservationDay, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
		const existingEnd = set(reservationDay, { hours: 11, minutes: 0, seconds: 0, milliseconds: 0 });

		const existingReservation = await createReservationViaApi(apiClient, {
			startDate: toApiDateTime(existingStart),
			endDate: toApiDateTime(existingEnd),
			note: `e2e-conflit-${runId}`,
		});
		createdReservationIds.push(existingReservation.id);

		await page.goto("/reserver");
		await fillPickerField(page, "Date de début", toDateInputValue(reservationDay));
		await fillPickerField(page, "Date de fin", toDateInputValue(reservationDay));
		await page.getByTestId("reservation-note").getByRole("textbox").fill(`e2e-conflit-ui-${runId}`);

		await page.getByRole("button", { name: "Confirmer la réservation" }).click();

		await expect(page.getByRole("alert")).toContainText("La place est déjà réservée");
	});
});
