import { AlternateEmail, Close, EventAvailable, NotificationsActive } from "@mui/icons-material";
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, Stack, Typography } from "@mui/material";
import { motion } from "motion/react";

type NotificationPromptDialogProps = {
	open: boolean;
	onAccept: () => void;
	onDecline: () => void;
	onDismiss: () => void;
};

/**
 * First-visit invite to enable desktop notifications.
 * Mint-tinted halo composition; the bell does a brief one-shot wiggle on mount to draw the eye.
 */
export function NotificationPromptDialog({ open, onAccept, onDecline, onDismiss }: NotificationPromptDialogProps) {
	return (
		<Dialog
			open={open}
			onClose={onDismiss}
			maxWidth="xs"
			fullWidth
			slotProps={{
				paper: { sx: { overflow: "hidden", borderColor: "rgba(16, 185, 129, 0.18)" } },
			}}
		>
			<Box
				sx={{
					position: "relative",
					height: 176,
					display: "grid",
					placeItems: "center",
					overflow: "hidden",
					background: "linear-gradient(180deg, #ECFDF5 0%, rgba(236, 253, 245, 0.5) 60%, #FFFFFF 100%)",
				}}
			>
				<IconButton
					onClick={onDismiss}
					aria-label="Fermer"
					sx={{
						position: "absolute",
						top: 10,
						right: 10,
						color: "var(--ink-mute)",
						"&:hover": { color: "var(--ink)", bgcolor: "rgba(255,255,255,0.6)" },
					}}
				>
					<Close fontSize="small" />
				</IconButton>

				{/* Concentric mint halos radiating outward from the bell. */}
				<Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
					{[200, 144, 96].map((size, i) => (
						<Box
							key={size}
							component={motion.div}
							initial={{ opacity: 0, scale: 0.55 }}
							animate={{ opacity: 0.85 - i * 0.18, scale: 1 }}
							transition={{ duration: 0.85, delay: 0.06 + (2 - i) * 0.08, ease: "easeOut" }}
							sx={{
								position: "absolute",
								width: size,
								height: size,
								borderRadius: "50%",
								border: i === 2 ? "none" : "1.5px solid rgba(16, 185, 129, 0.28)",
								background: i === 2 ? "rgba(209, 250, 229, 0.85)" : "transparent",
							}}
						/>
					))}
				</Box>

				{/* Bell. One-shot wiggle for character. */}
				<Box
					component={motion.div}
					initial={{ rotate: 0, scale: 0.55, opacity: 0 }}
					animate={{
						rotate: [0, -10, 10, -6, 6, -2, 0],
						scale: 1,
						opacity: 1,
					}}
					transition={{
						rotate: { duration: 1.6, delay: 0.45, ease: "easeInOut" },
						scale: { duration: 0.45, delay: 0.18 },
						opacity: { duration: 0.3, delay: 0.18 },
					}}
					sx={{
						zIndex: 2,
						width: 68,
						height: 68,
						borderRadius: "50%",
						display: "grid",
						placeItems: "center",
						color: "#FFFFFF",
						background: "linear-gradient(140deg, #10B981 0%, #047857 100%)",
						boxShadow: "0 12px 28px rgba(16, 185, 129, 0.4), inset 0 -3px 0 rgba(0, 0, 0, 0.12)",
					}}
				>
					<NotificationsActive sx={{ fontSize: 32 }} />
				</Box>
			</Box>

			<DialogContent sx={{ pt: 3, pb: 2.5 }}>
				<Stack spacing={2.75}>
					<Box>
						<Typography
							component={motion.h2}
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
							sx={{
								m: 0,
								textAlign: "center",
								fontWeight: 800,
								fontSize: "1.55rem",
								lineHeight: 1.15,
								letterSpacing: "-0.01em",
								color: "var(--ink)",
							}}
						>
							Restez au courant
						</Typography>
						<Typography
							component={motion.p}
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, delay: 0.32, ease: "easeOut" }}
							sx={{
								m: 0,
								mt: 1,
								textAlign: "center",
								color: "var(--ink-soft)",
								fontSize: 14,
								px: 1,
							}}
						>
							Une discrète notification vous prévient dès qu'il se passe quelque chose qui vous concerne.
						</Typography>
					</Box>

					<Stack
						spacing={1.25}
						component={motion.div}
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.45, delay: 0.42, ease: "easeOut" }}
					>
						<FeatureRow icon={<AlternateEmail sx={{ fontSize: 18 }} />} label="Quand on vous mentionne dans une discussion" />
						<FeatureRow icon={<EventAvailable sx={{ fontSize: 18 }} />} label="Quand une nouvelle réservation est créée" />
					</Stack>
				</Stack>
			</DialogContent>

			<DialogActions sx={{ px: 3, pb: 2.75, pt: 1, flexDirection: "column", gap: 1, alignItems: "stretch" }}>
				<Button
					onClick={onAccept}
					variant="contained"
					size="large"
					fullWidth
					data-testid="notification-onboarding-accept"
					sx={{
						background: "linear-gradient(140deg, #10B981 0%, #047857 100%)",
						color: "#FFFFFF",
						boxShadow: "0 8px 18px rgba(16, 185, 129, 0.32)",
						"&:hover": {
							background: "linear-gradient(140deg, #059669 0%, #065F46 100%)",
							boxShadow: "0 10px 22px rgba(16, 185, 129, 0.38)",
						},
					}}
				>
					Activer les notifications
				</Button>
				<Button onClick={onDecline} variant="text" fullWidth data-testid="notification-onboarding-decline">
					Pas maintenant
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function FeatureRow({ icon, label }: { icon: React.ReactNode; label: string }) {
	return (
		<Stack direction="row" alignItems="center" spacing={1.5}>
			<Box
				sx={{
					width: 32,
					height: 32,
					borderRadius: "10px",
					background: "var(--mint-soft)",
					color: "#047857",
					display: "grid",
					placeItems: "center",
					flexShrink: 0,
				}}
			>
				{icon}
			</Box>
			<Typography sx={{ fontSize: 14, color: "var(--ink-soft)", fontWeight: 600, lineHeight: 1.35 }}>{label}</Typography>
		</Stack>
	);
}
