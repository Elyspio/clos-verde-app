import { Box, Stack, Typography } from "@mui/material";
import { motion } from "motion/react";
import type { FeedbackCategory } from "@apis/rest/api/generated";
import { ALL_CATEGORIES, CATEGORY_META } from "./categoryMeta";

type Props = {
	onPick: (category: FeedbackCategory) => void;
};

/**
 * Step 1 of the feedback flow: choose a category. Each tile reuses the NavLink
 * hover language from the AppShell (border + soft blue fill on hover) so the
 * component reads as part of the app, not a special-cased modal.
 */
export function CategoryPicker({ onPick }: Props) {
	return (
		<Stack spacing={2.5} data-testid="feedback-picker">
			<Stack spacing={0.5}>
				<Typography variant="h4" sx={{ color: "var(--ink)" }}>
					Quel est l'objet de votre retour ?
				</Typography>
				<Typography variant="body2" sx={{ color: "var(--ink-soft)" }}>
					Sélectionnez la catégorie la plus appropriée. Chaque retour est ensuite acheminé en conséquence.
				</Typography>
			</Stack>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
					gap: 1.5,
				}}
			>
				{ALL_CATEGORIES.map((category, index) => {
					const meta = CATEGORY_META[category];
					const Icon = meta.icon;
					return (
						<motion.button
							key={category}
							data-testid={`feedback-category-${category.toLowerCase()}`}
							type="button"
							onClick={() => onPick(category)}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.22, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
							style={{
								all: "unset",
								cursor: "pointer",
								display: "block",
							}}
						>
							<Box
								sx={{
									minHeight: 124,
									border: "1px solid var(--line)",
									borderRadius: "14px",
									backgroundColor: "var(--surface)",
									p: 2.25,
									display: "flex",
									flexDirection: "column",
									gap: 0.75,
									transition: "border-color 180ms ease, background-color 180ms ease, transform 180ms ease",
									"&:hover": {
										borderColor: "var(--primary-blue)",
										backgroundColor: "var(--surface-blue)",
										transform: "translateY(-1px)",
									},
									"&:focus-visible": {
										outline: "2px solid var(--primary-blue)",
										outlineOffset: 2,
									},
								}}
							>
								<Box
									sx={{
										width: 36,
										height: 36,
										borderRadius: "10px",
										backgroundColor: meta.accentSoft,
										display: "grid",
										placeItems: "center",
										color: meta.accent,
									}}
								>
									<Icon sx={{ fontSize: 22 }} />
								</Box>
								<Typography variant="subtitle1" sx={{ color: "var(--ink)", lineHeight: 1.2 }}>
									{meta.label}
								</Typography>
								<Typography variant="body2" sx={{ color: "var(--ink-soft)" }}>
									{meta.tagline}
								</Typography>
							</Box>
						</motion.button>
					);
				})}
			</Box>
		</Stack>
	);
}
