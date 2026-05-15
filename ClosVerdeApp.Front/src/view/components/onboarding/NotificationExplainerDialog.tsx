import { ArrowRightAlt, Logout, NotificationsActive } from "@mui/icons-material";
import { Box, Button, Dialog, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { motion } from "motion/react";

type NotificationExplainerDialogProps = {
	open: boolean;
	onClose: () => void;
};

/**
 * Reassurance dialog shown after the user declines the first invite.
 * Explains exactly *where* they can re-enable notifications, with a tiny mock
 * of the user menu pointing at the relevant item.
 */
export function NotificationExplainerDialog({ open, onClose }: NotificationExplainerDialogProps) {
	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="xs"
			fullWidth
			slotProps={{
				paper: { sx: { overflow: "hidden", borderColor: "rgba(37, 99, 235, 0.18)" } },
			}}
		>
			<Box
				sx={{
					position: "relative",
					px: 3,
					pt: 4,
					pb: 2.5,
					textAlign: "center",
					background: "linear-gradient(180deg, #EFF6FF 0%, rgba(239, 246, 255, 0.4) 60%, #FFFFFF 100%)",
				}}
			>
				<Typography
					component={motion.div}
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
					sx={{
						fontSize: 11,
						fontWeight: 800,
						letterSpacing: "0.18em",
						color: "var(--primary-blue)",
						textTransform: "uppercase",
						mb: 1.25,
					}}
				>
					Pas de pression
				</Typography>
				<Typography
					component={motion.h2}
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" }}
					sx={{
						m: 0,
						fontWeight: 800,
						fontSize: "1.65rem",
						lineHeight: 1.15,
						letterSpacing: "-0.01em",
						color: "var(--ink)",
					}}
				>
					Vous pouvez{" "}
					<Box
						component="span"
						sx={{
							background: "linear-gradient(120deg, #2563EB 0%, #10B981 100%)",
							backgroundClip: "text",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
							whiteSpace: "nowrap",
						}}
					>
						changer d'avis
					</Box>
					<br />
					quand vous voulez.
				</Typography>
			</Box>

			<DialogContent sx={{ pt: 1.5, pb: 1 }}>
				<Stack spacing={2.5}>
					<Typography sx={{ color: "var(--ink-soft)", fontSize: 14, textAlign: "center", px: 1 }}>
						L'option vit dans votre menu compte, en haut à droite de l'écran.
					</Typography>

					{/* Tiny mock of the actual user menu, with a pulsing highlight on the bell row. */}
					<Box sx={{ position: "relative", py: 0.5 }}>
						<Box
							component={motion.div}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
							sx={{
								maxWidth: 244,
								mx: "auto",
								border: "1px solid var(--line)",
								borderRadius: "14px",
								bgcolor: "var(--surface)",
								boxShadow: "0 18px 40px rgba(15, 23, 42, 0.10)",
								overflow: "hidden",
							}}
						>
							<Box
								component={motion.div}
								animate={{
									backgroundColor: ["rgba(239, 246, 255, 0)", "rgba(239, 246, 255, 1)", "rgba(239, 246, 255, 0)"],
								}}
								transition={{
									duration: 2.4,
									repeat: Infinity,
									ease: "easeInOut",
									delay: 0.6,
								}}
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 1.25,
									px: 1.75,
									py: 1.5,
								}}
							>
								<NotificationsActive sx={{ fontSize: 18, color: "var(--primary-blue)" }} />
								<Typography sx={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Activer les notifications</Typography>
							</Box>
							<Box
								sx={{
									borderTop: "1px solid var(--line)",
									display: "flex",
									alignItems: "center",
									gap: 1.25,
									px: 1.75,
									py: 1.5,
									opacity: 0.5,
								}}
							>
								<Logout sx={{ fontSize: 16, color: "var(--ink-mute)" }} />
								<Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--ink-mute)" }}>Se déconnecter</Typography>
							</Box>
						</Box>

						{/* Pointer arrow nudging toward the highlighted row. */}
						<Box
							component={motion.div}
							initial={{ opacity: 0 }}
							animate={{
								opacity: 1,
								x: [-4, 2, -4],
							}}
							transition={{
								opacity: { duration: 0.45, delay: 0.55 },
								x: { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.55 },
							}}
							sx={{
								position: "absolute",
								right: { xs: 6, sm: 16 },
								top: 16,
								display: "flex",
								alignItems: "center",
								gap: 0.5,
								color: "var(--primary-blue)",
								pointerEvents: "none",
							}}
						>
							<ArrowRightAlt sx={{ fontSize: 26, transform: "rotate(180deg)" }} />
							<Typography
								sx={{
									fontSize: 10,
									fontWeight: 800,
									letterSpacing: "0.12em",
									textTransform: "uppercase",
									color: "var(--primary-blue)",
								}}
							>
								Ici
							</Typography>
						</Box>
					</Box>

					<Typography sx={{ color: "var(--ink-mute)", fontSize: 12.5, textAlign: "center", px: 1.5, fontStyle: "italic" }}>
						Sans notifications, pas de signal hors-onglet — il faudra ouvrir Clos Verde pour voir les nouveautés.
					</Typography>
				</Stack>
			</DialogContent>

			<DialogActions sx={{ px: 3, pb: 2.75, pt: 1.5 }}>
				<Button onClick={onClose} variant="contained" fullWidth size="large" data-testid="notification-onboarding-explainer-close">
					Compris, merci
				</Button>
			</DialogActions>
		</Dialog>
	);
}
