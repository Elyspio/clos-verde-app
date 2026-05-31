import { Button, Paper, Stack, Typography } from "@mui/material";
import { FeedbackOutlined, LoginOutlined } from "@mui/icons-material";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { FeedbackDialog } from "@/view/components/feedback/FeedbackDialog";

/**
 * Closing card on the FAQ. If the user is authenticated, the primary CTA opens the
 * existing `FeedbackDialog` so the same submission flow is reused. If anonymous,
 * the CTA invites them to sign in first — we cannot route a feedback to the admin
 * without an authenticated author.
 */
export function FaqCta() {
	const auth = useAuth();
	const [open, setOpen] = useState(false);

	return (
		<>
			<Paper
				variant="outlined"
				data-testid="faq-cta"
				sx={{
					p: { xs: 2.5, md: 3 },
					backgroundColor: "var(--surface-soft)",
					borderColor: "var(--line)",
				}}
			>
				<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
					<Stack spacing={0.5} sx={{ maxWidth: 480 }}>
						<Typography variant="h4" sx={{ color: "var(--ink)" }}>
							Une question sans réponse ?
						</Typography>
						<Typography variant="body2" sx={{ color: "var(--ink-soft)" }}>
							{auth.isAuthenticated
								? "Envoyez votre retour directement à l'équipe via le formulaire « Avis »."
								: "Connectez-vous pour envoyer votre retour à l'équipe."}
						</Typography>
					</Stack>
					{auth.isAuthenticated ? (
						<Button
							variant="contained"
							color="primary"
							startIcon={<FeedbackOutlined />}
							onClick={() => setOpen(true)}
							data-testid="faq-cta-feedback"
							sx={{ flexShrink: 0 }}
						>
							Envoyer un retour
						</Button>
					) : (
						<Button
							variant="contained"
							color="primary"
							startIcon={<LoginOutlined />}
							onClick={() => void auth.signinRedirect()}
							data-testid="faq-cta-login"
							sx={{ flexShrink: 0 }}
						>
							Se connecter
						</Button>
					)}
				</Stack>
			</Paper>
			<FeedbackDialog open={open} onClose={() => setOpen(false)} />
		</>
	);
}
