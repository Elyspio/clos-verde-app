import { Stack, Typography } from "@mui/material";

/**
 * Sober hero: a title and a short subtitle. No image, no gradient — the FAQ is here
 * to inform, not to dazzle.
 */
export function FaqHero() {
	return (
		<Stack spacing={1.5} sx={{ mb: { xs: 4, md: 5 } }} data-testid="faq-hero">
			<Typography variant="h1" sx={{ color: "var(--ink)" }}>
				Bienvenue dans Clos Verde
			</Typography>
			<Typography variant="body1" sx={{ color: "var(--ink-soft)", maxWidth: 640 }}>
				L'essentiel pour comprendre comment réserver la place, suivre les discussions et envoyer vos retours à l'équipe. Faites défiler la page ou consultez les questions
				fréquentes en bas pour trouver rapidement votre réponse.
			</Typography>
		</Stack>
	);
}
