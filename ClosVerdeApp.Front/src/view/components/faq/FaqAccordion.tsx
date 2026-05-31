import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { FAQ_QUESTIONS } from "./faqContent";

/**
 * Compact Q&A block at the bottom of the FAQ. Default MUI Accordion, sober chrome,
 * one expansion per question (controlled to allow a single open panel at a time).
 */
export function FaqAccordion() {
	return (
		<Stack spacing={1.25} data-testid="faq-accordion">
			<Typography variant="h3" sx={{ color: "var(--ink)" }}>
				Questions fréquentes
			</Typography>
			<Typography variant="body2" sx={{ color: "var(--ink-soft)", mb: 1 }}>
				Les réponses courtes aux situations les plus courantes.
			</Typography>
			{FAQ_QUESTIONS.map((entry) => (
				<Accordion
					key={entry.id}
					disableGutters
					elevation={0}
					data-testid={`faq-question-${entry.id}`}
					sx={{
						border: "1px solid var(--line)",
						borderRadius: "12px",
						backgroundColor: "var(--surface)",
						"&::before": { display: "none" },
						"&.Mui-expanded": { borderColor: "var(--primary-blue)" },
					}}
				>
					<AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2, py: 0.5 }}>
						<Typography variant="subtitle1" sx={{ color: "var(--ink)", fontWeight: 700 }}>
							{entry.question}
						</Typography>
					</AccordionSummary>
					<AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
						<Typography variant="body2" sx={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>
							{entry.answer}
						</Typography>
					</AccordionDetails>
				</Accordion>
			))}
		</Stack>
	);
}
