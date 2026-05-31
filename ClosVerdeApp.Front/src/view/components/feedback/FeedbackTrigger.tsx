import { Button } from "@mui/material";
import { FeedbackOutlined } from "@mui/icons-material";
import { useState } from "react";
import { FeedbackDialog } from "./FeedbackDialog";

/**
 * Pill button slotted into the AppShell header right before the user menu.
 * Mirrors the NavLink hover language so it reads as part of the header chrome
 * rather than a CTA bolted on top.
 */
export function FeedbackTrigger() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				data-testid="feedback-trigger"
				onClick={() => setOpen(true)}
				variant="text"
				startIcon={<FeedbackOutlined sx={{ fontSize: 18 }} />}
				sx={{
					borderRadius: "999px",
					border: "1px solid var(--line)",
					backgroundColor: "var(--surface)",
					color: "var(--ink-soft)",
					px: 1.5,
					py: 0.85,
					minHeight: 0,
					fontSize: "0.82rem",
					fontWeight: 700,
					"&:hover": {
						backgroundColor: "var(--surface-blue)",
						borderColor: "var(--primary-blue)",
						color: "var(--primary-blue)",
					},
					// Hide the label on very small screens; keep the icon as a visual anchor.
					"& .MuiButton-startIcon": { marginRight: { xs: 0, sm: 1 } },
					"& .MuiButton-startIcon + .MuiButton-label, & .feedback-trigger-label": {
						display: { xs: "none", sm: "inline" },
					},
				}}
			>
				<span className="feedback-trigger-label">Avis</span>
			</Button>
			<FeedbackDialog open={open} onClose={() => setOpen(false)} />
		</>
	);
}
