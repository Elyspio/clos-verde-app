import { Container, Stack } from "@mui/material";
import { FaqAccordion } from "./FaqAccordion";
import { FaqCta } from "./FaqCta";
import { FaqHero } from "./FaqHero";
import { FaqSection } from "./FaqSection";
import { FAQ_SECTIONS } from "./faqContent";
import { PublicFaqShell } from "./PublicFaqShell";

/**
 * Public help page. Same route serves anonymous visitors (typical onboarding link
 * from the introduction email) and authenticated users (reached via the `?` icon
 * in the AppShell). The shell adapts its CTA based on the auth state.
 */
export function FaqPage() {
	return (
		<PublicFaqShell>
			<Container maxWidth="md" sx={{ px: { xs: 2.5, md: 4 } }} data-testid="faq-page">
				<FaqHero />
				<Stack spacing={{ xs: 2, md: 2.5 }} sx={{ mb: { xs: 5, md: 6 } }}>
					{FAQ_SECTIONS.map((section, index) => (
						<FaqSection key={section.id} section={section} index={index} />
					))}
				</Stack>
				<Stack spacing={{ xs: 3, md: 4 }}>
					<FaqAccordion />
					<FaqCta />
				</Stack>
			</Container>
		</PublicFaqShell>
	);
}
