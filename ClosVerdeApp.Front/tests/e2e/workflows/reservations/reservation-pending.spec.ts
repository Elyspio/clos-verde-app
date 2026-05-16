import { parseISO, set } from "date-fns";
import type { Page } from "@playwright/test";
import { expect, test } from "../../helpers/authenticated-test";
import { calendarDayTestId, createRunId, monthsFromCurrentCalendar } from "../../helpers/date.helpers";
import { cleanupOrphanE2eReservations, cleanupReservations, findFreeFutureDay } from "../../helpers/reservation-data.helpers";
import type { ReservationFull } from "../../helpers/reservation-types";

async function navigateToReservationMonth(page: Page, reservationDate: Date) {
	const monthsAhead = monthsFromCurrentCalendar(reservationDate);
	for (let index = 0; index < monthsAhead; index += 1) {
		await page.getByRole("button", { name: /→/ }).click();
	}
}

test.describe("Reservation pending status", () => {
	const createdReservationIds: string[] = [];

	test.beforeEach(async ({ apiClient }) => {
		// Self-heal against orphan e2e reservations from previously failed runs.
		await cleanupOrphanE2eReservations(apiClient);
	});

	test.afterEach(async ({ apiClient }) => {
		await cleanupReservations(apiClient, createdReservationIds);
		createdReservationIds.length = 0;
	});

	test("crée une réservation future en statut Pending avec badge En attente", async ({ apiClient, page }) => {
		const runId = createRunId();
		const reservationDay = await findFreeFutureDay(apiClient, runId);

		await page.goto("/calendrier");
		await navigateToReservationMonth(page, reservationDay);
		await page.getByTestId(calendarDayTestId(reservationDay)).click();
		await expect(page).toHaveURL(/\/reserver$/);

		await page.getByTestId("reservation-note").getByRole("textbox").fill(`e2e-pending-${runId}`);

		const submitButton = page.getByRole("button", { name: "Confirmer la réservation" });
		await expect(submitButton).toBeEnabled();

		// Capture any POST /api/reservations response (success or failure) and assert status separately
		// for clearer diagnostics than a strict matcher silently timing out.
		const createResponsePromise = page.waitForResponse((response) => {
			if (response.request().method() !== "POST") return false;
			const url = new URL(response.url());
			return url.pathname === "/api/reservations";
		});
		await submitButton.click();
		const createResponse = await createResponsePromise;
		expect(createResponse.status(), `POST /api/reservations a échoué : ${await createResponse.text()}`).toBe(201);
		const created = (await createResponse.json()) as ReservationFull;
		createdReservationIds.push(created.id);

		expect(created.validation.status).toBe("Pending");
		expect(created.objection ?? null).toBeNull();
		expect(typeof created.validation.deadline).toBe("string");

		// Calendar reflects the Pending state.
		await expect(page).toHaveURL(/\/calendrier$/);
		await navigateToReservationMonth(page, parseISO(created.startDate));
		const dayCell = page.getByTestId(calendarDayTestId(parseISO(created.startDate)));
		const pill = dayCell.getByTestId(`reservation-pill-${created.id}`);
		await expect(pill).toBeVisible();

		// Open the reservation detail dialog and confirm the badge is rendered.
		await pill.click();
		await expect(page.getByTestId("pending-badge")).toBeVisible();
		await expect(page.getByTestId("pending-badge")).toContainText(/en attente/i);
	});

	test("le créateur peut forcer la validation depuis la décision (CreatorDecisionPanel)", async ({ apiClient, page }) => {
		const runId = createRunId();
		const reservationDay = await findFreeFutureDay(apiClient, runId);

		const start = set(reservationDay, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
		const end = set(reservationDay, { hours: 11, minutes: 0, seconds: 0, milliseconds: 0 });

		const createResponse = await apiClient.post("/api/reservations", {
			data: {
				startDate: start.toISOString(),
				endDate: end.toISOString(),
				note: `e2e-decision-${runId}`,
			},
		});
		expect(createResponse.status(), `Création API: ${await createResponse.text()}`).toBe(201);
		const reservation = (await createResponse.json()) as ReservationFull;
		createdReservationIds.push(reservation.id);
		expect(reservation.validation.status).toBe("Pending");

		// Stub GETs used by the calendar and the panel to inject an objection scenario without
		// needing a second authenticated user. The force-validate POST flows through to the real backend.
		await page.route("**/api/reservations**", async (route) => {
			const url = new URL(route.request().url());
			if (route.request().method() !== "GET" || !url.pathname.startsWith("/api/reservations")) {
				await route.continue();
				return;
			}

			const original = await route.fetch();
			if (!original.ok()) {
				await route.fulfill({ response: original });
				return;
			}

			const ct = original.headers()["content-type"] ?? "";
			if (!ct.includes("application/json")) {
				await route.fulfill({ response: original });
				return;
			}

			const body = (await original.json()) as ReservationFull[] | ReservationFull;
			const enrich = (r: ReservationFull): ReservationFull =>
				r.id === reservation.id
					? {
							...r,
							validation: {
								...r.validation,
								status: "Pending",
							},
							objection: {
								id: reservation.id,
								reservationId: reservation.id,
								user: {
									id: "00000000-0000-0000-0000-000000000aaa",
									displayName: "Test Objector",
								},
								reason: `e2e-objection-${runId}`,
								createdAt: new Date().toISOString(),
							},
							topicId: "00000000-0000-0000-0000-000000000001",
						}
					: r;

			const enriched = Array.isArray(body) ? body.map(enrich) : enrich(body);
			await route.fulfill({ json: enriched });
		});

		await page.goto("/calendrier");
		await navigateToReservationMonth(page, parseISO(reservation.startDate));
		const dayCell = page.getByTestId(calendarDayTestId(parseISO(reservation.startDate)));
		await dayCell.getByTestId(`reservation-pill-${reservation.id}`).click();

		await expect(page.getByTestId("creator-decision-panel")).toBeVisible();
		await expect(page.getByTestId("creator-decision-panel")).toContainText("Une objection");
		await expect(page.getByTestId("creator-decision-panel")).toContainText(`e2e-objection-${runId}`);

		const validatePromise = page.waitForResponse((response) => {
			if (response.request().method() !== "POST") return false;
			return new URL(response.url()).pathname === `/api/reservations/${reservation.id}/validate`;
		});
		await page.getByTestId("validate-anyway-button").click();
		const validateResponse = await validatePromise;
		expect(validateResponse.status(), `POST /validate: ${await validateResponse.text()}`).toBe(200);
		const validated = (await validateResponse.json()) as ReservationFull;
		expect(validated.validation.status).toBe("Validated");
	});
});
