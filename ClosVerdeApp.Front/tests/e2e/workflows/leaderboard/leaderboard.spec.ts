import { readAuthenticatedSessionData } from "../../helpers/api-client.helpers";
import { expect, test } from "../../helpers/authenticated-test";
import { cleanupReservations, createReservationViaApi, findFreeFutureDay } from "../../helpers/reservation-data.helpers";
import { createRunId, toApiDateTime } from "../../helpers/date.helpers";

test.describe("Leaderboard", () => {
	const createdReservationIds: string[] = [];

	test.afterEach(async ({ apiClient }) => {
		await cleanupReservations(apiClient, createdReservationIds);
		createdReservationIds.length = 0;
	});

	test("affiche l'utilisateur connecté et ses valeurs agrégées", async ({ apiClient, page }) => {
		const runId = createRunId();
		const freeDay = await findFreeFutureDay(apiClient);
		const session = readAuthenticatedSessionData();
		const userId = session.profile.sub;
		const displayName = session.profile.name ?? session.profile.preferred_username ?? session.profile.email;

		if (!userId || !displayName) {
			throw new Error("Le profil OIDC capturé est incomplet. Relancez `pnpm e2e:auth`.");
		}

		const reservation = await createReservationViaApi(apiClient, {
			startDate: toApiDateTime(freeDay),
			endDate: toApiDateTime(new Date(freeDay.getFullYear(), freeDay.getMonth(), freeDay.getDate(), 23, 59, 0, 0)),
			note: `e2e-classement-${runId}`,
		});
		createdReservationIds.push(reservation.id);

		await page.goto("/classement");

		const row = page.getByTestId(`leaderboard-row-${userId}`);
		await expect(page.getByTestId("leaderboard-list")).toBeVisible();
		await expect(row).toBeVisible();
		await expect(row).toContainText(displayName);
		await expect(row).toContainText(/\d/);
	});
});
