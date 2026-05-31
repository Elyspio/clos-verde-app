import { Box, Paper, Stack, Typography } from "@mui/material";
import { motion } from "motion/react";
import type { FaqSectionContent } from "./faqContent";

type Props = {
	section: FaqSectionContent;
	/** Index in the parent list — drives the stagger reveal delay. */
	index: number;
};

/**
 * One feature card on the FAQ page: accent stripe on the left, icon + title row,
 * intro paragraph, optional bullets, optional emphasised tip. Animates in once
 * scrolled into view (single trigger via `viewport.once`).
 */
export function FaqSection({ section, index }: Props) {
	const Icon = section.icon;
	return (
		<motion.div
			data-testid={`faq-section-${section.id}`}
			initial={{ opacity: 0, y: 16 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.2 }}
			transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
		>
			<Paper
				variant="outlined"
				sx={{
					p: { xs: 2.5, md: 3 },
					borderLeft: `4px solid ${section.accent}`,
					backgroundColor: "var(--surface)",
				}}
			>
				<Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
					<Box
						sx={{
							width: 40,
							height: 40,
							borderRadius: "12px",
							backgroundColor: section.accentSoft,
							color: section.accent,
							display: "grid",
							placeItems: "center",
							flexShrink: 0,
						}}
					>
						<Icon />
					</Box>
					<Typography variant="h4" sx={{ color: "var(--ink)" }}>
						{section.title}
					</Typography>
				</Stack>

				<Typography variant="body1" sx={{ color: "var(--ink-soft)", mb: section.bullets || section.tip ? 1.5 : 0 }}>
					{section.intro}
				</Typography>

				{section.bullets && (
					<Box
						component="ul"
						sx={{
							listStyle: "none",
							m: 0,
							p: 0,
							display: "flex",
							flexDirection: "column",
							gap: 0.85,
						}}
					>
						{section.bullets.map((bullet) => (
							<Box
								key={bullet}
								component="li"
								sx={{
									display: "flex",
									alignItems: "flex-start",
									gap: 1.25,
									color: "var(--ink-soft)",
									fontSize: "0.95rem",
									lineHeight: 1.55,
								}}
							>
								<Box
									aria-hidden
									sx={{
										mt: "9px",
										width: 6,
										height: 6,
										borderRadius: "999px",
										backgroundColor: section.accent,
										flexShrink: 0,
									}}
								/>
								<span>{bullet}</span>
							</Box>
						))}
					</Box>
				)}

				{section.tip && (
					<Box
						sx={{
							mt: 2,
							p: 1.5,
							borderRadius: "10px",
							backgroundColor: section.accentSoft,
							color: section.accent,
							fontSize: "0.9rem",
							fontWeight: 600,
							lineHeight: 1.5,
						}}
					>
						{section.tip}
					</Box>
				)}
			</Paper>
		</motion.div>
	);
}
