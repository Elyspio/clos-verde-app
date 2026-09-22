import { Box, Button, Stack, Typography } from "@mui/material";
import { CheckCircleOutlined } from "@mui/icons-material";
import { motion } from "motion/react";

type Props = {
	onClose: () => void;
};

/**
 * Step 3 of the feedback flow. Sober confirmation aligned with the rest of the
 * design system — no theatrical motion, just a clear "we got it" and a way out.
 */
export function FeedbackSent({ onClose }: Props) {
	return (
		<Stack
			spacing={2.5}
			data-testid="feedback-sent"
			sx={{
				alignItems: "center",
				py: 3,
			}}
		>
			<Box sx={{ position: "relative", width: 88, height: 88 }}>
				<Box
					sx={{
						position: "absolute",
						inset: 0,
						borderRadius: "50%",
						backgroundColor: "var(--mint-soft)",
					}}
				/>
				<motion.div
					initial={{ scale: 0.6, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
					style={{
						position: "absolute",
						inset: 0,
						display: "grid",
						placeItems: "center",
					}}
				>
					<CheckCircleOutlined sx={{ fontSize: 56, color: "var(--mint)" }} />
				</motion.div>
			</Box>
			<Stack
				spacing={0.75}
				sx={{
					alignItems: "center",
					textAlign: "center",
				}}
			>
				<Typography variant="h4" sx={{ color: "var(--ink)" }}>
					Votre retour a bien été reçu.
				</Typography>
				<Typography variant="body1" sx={{ color: "var(--ink-soft)", maxWidth: 420 }}>
					Il sera examiné avec attention. Vous serez recontacté par email si des informations complémentaires sont nécessaires.
				</Typography>
			</Stack>
			<Button variant="outlined" onClick={onClose} data-testid="feedback-close">
				Fermer
			</Button>
		</Stack>
	);
}
