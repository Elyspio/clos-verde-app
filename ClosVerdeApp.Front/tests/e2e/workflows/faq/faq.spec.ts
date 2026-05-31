import { expect, test as base } from "@playwright/test";
import { expect as authedExpect, test as authedTest } from "../../helpers/authenticated-test";

const publicTest = base.extend({});

publicTest.describe("FAQ — accès public", () => {
	publicTest.use({ storageState: { cookies: [], origins: [] } });

	publicTest("rend la page sans authentification et propose la connexion", async ({ page }) => {
		await page.goto("/faq");

		await expect(page.getByTestId("faq-page")).toBeVisible();
		await expect(page.getByTestId("faq-hero")).toBeVisible();
		await expect(page.getByTestId("faq-sign-in")).toBeVisible();
		// The "Retour à Clos Verde" CTA must not appear for anonymous visitors.
		await expect(page.getByTestId("faq-back-to-app")).toHaveCount(0);

		// Toutes les sections narratives sont rendues.
		for (const id of ["calendar", "reservation", "leaderboard", "messages", "tickets"]) {
			await expect(page.getByTestId(`faq-section-${id}`)).toBeVisible();
		}
	});

	publicTest("permet d'ouvrir une entrée de l'accordéon Q&R", async ({ page }) => {
		await page.goto("/faq");

		const accordion = page.getByTestId("faq-accordion");
		await expect(accordion).toBeVisible();

		// L'accordéon affiche l'intitulé immédiatement, mais la réponse ne doit être visible
		// qu'après ouverture du panneau (MUI Accordion garde le contenu dans le DOM mais le replie via collapse).
		const entry = page.getByTestId("faq-question-enable-notifications");
		const summary = entry.getByText("Comment activer les notifications ?");
		await summary.click();
		await expect(entry.getByText(/menu de compte/i)).toBeVisible();
	});

	publicTest("le CTA non authentifié déclenche la connexion", async ({ page }) => {
		await page.goto("/faq");

		await expect(page.getByTestId("faq-cta")).toBeVisible();
		await expect(page.getByTestId("faq-cta-login")).toBeVisible();
		// Le CTA "Envoyer un retour" est réservé aux utilisateurs authentifiés.
		await expect(page.getByTestId("faq-cta-feedback")).toHaveCount(0);
	});
});

authedTest.describe("FAQ — utilisateur authentifié", () => {
	authedTest("expose un retour vers l'app et un CTA d'envoi de retour", async ({ page }) => {
		await page.goto("/faq");

		await authedExpect(page.getByTestId("faq-page")).toBeVisible();
		await authedExpect(page.getByTestId("faq-back-to-app")).toBeVisible();
		await authedExpect(page.getByTestId("faq-cta-feedback")).toBeVisible();
		// La connexion est inutile pour un user déjà authentifié.
		await authedExpect(page.getByTestId("faq-sign-in")).toHaveCount(0);
	});

	authedTest("le CTA « Envoyer un retour » ouvre le FeedbackDialog", async ({ page }) => {
		await page.goto("/faq");

		await page.getByTestId("faq-cta-feedback").click();
		await authedExpect(page.getByTestId("feedback-dialog")).toBeVisible();
		await authedExpect(page.getByTestId("feedback-picker")).toBeVisible();
	});

	authedTest("l'icône d'aide du header ouvre la FAQ depuis n'importe quelle page", async ({ page }) => {
		await page.goto("/calendrier");

		await page.getByTestId("faq-trigger").click();
		await authedExpect(page).toHaveURL(/\/faq$/);
		await authedExpect(page.getByTestId("faq-page")).toBeVisible();
	});
});
