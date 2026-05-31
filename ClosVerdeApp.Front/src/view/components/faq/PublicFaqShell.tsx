import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { ArrowBack, Home, LoginOutlined } from "@mui/icons-material";
import type { ReactNode } from "react";
import { useAuth } from "react-oidc-context";
import { Link as RouterLink } from "react-router-dom";
import { routes } from "@/config/routes";

type Props = {
	children: ReactNode;
};

/**
 * Self-contained chrome for the FAQ page. Reused both by anonymous visitors
 * (the FAQ route is public) and authenticated users — instead of nesting under
 * `AppShell`, we render a minimal header so the FAQ never depends on auth-only
 * bridges (SignalR, push state, query subscriptions).
 *
 * The right-side CTA adapts to the auth state: anonymous users get a "Se connecter"
 * button, authenticated users get a "Retour à Clos Verde" link to the calendar.
 */
export function PublicFaqShell({ children }: Props) {
	const auth = useAuth();
	const isAuthenticated = auth.isAuthenticated;

	return (
		<Box
			sx={{
				// The global body is locked to 100dvh with overflow:hidden (cf. index.scss),
				// so the FAQ shell must constrain itself to the same viewport box and delegate
				// scrolling to its inner <main> — mirroring what AppShell does. Without this
				// fixed height, the page content overflows the body and silently gets clipped.
				height: "100dvh",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
				bgcolor: "var(--app-bg)",
			}}
		>
			<Box
				component="header"
				data-testid="faq-shell-header"
				sx={{
					flex: "0 0 auto",
					zIndex: 10,
					bgcolor: "rgba(255,255,255,0.92)",
					backdropFilter: "blur(14px)",
					borderBottom: "1px solid var(--line)",
				}}
			>
				<Container
					maxWidth="xl"
					sx={{
						maxWidth: "1280px",
						px: { xs: 2.5, md: 5 },
						minHeight: { xs: 68, md: 76 },
						display: "flex",
						alignItems: "center",
						gap: 2,
					}}
				>
					<Stack
						component={RouterLink}
						to={isAuthenticated ? routes.app.calendar.path : routes.app.faq.path}
						direction="row"
						alignItems="center"
						spacing={1.2}
						sx={{ flexShrink: 0, textDecoration: "none" }}
					>
						<Box
							aria-hidden
							sx={{
								width: 34,
								height: 34,
								borderRadius: "12px",
								bgcolor: "var(--primary-blue)",
								color: "var(--surface)",
								display: "grid",
								placeItems: "center",
								fontWeight: 800,
							}}
						>
							<Home />
						</Box>
						<Box>
							<Typography sx={{ fontWeight: 800, fontSize: { xs: 17, md: 19 }, lineHeight: 1, color: "var(--ink)" }}>Clos Verde</Typography>
							<Typography sx={{ display: { xs: "none", md: "block" }, color: "var(--ink-mute)", fontSize: 11, fontWeight: 700 }}>
								Aide & questions fréquentes
							</Typography>
						</Box>
					</Stack>
					<Box sx={{ ml: "auto" }}>
						{isAuthenticated ? (
							<Button component={RouterLink} to={routes.app.calendar.path} variant="outlined" color="primary" startIcon={<ArrowBack />} data-testid="faq-back-to-app">
								Retour à Clos Verde
							</Button>
						) : (
							<Button variant="contained" color="primary" startIcon={<LoginOutlined />} onClick={() => void auth.signinRedirect()} data-testid="faq-sign-in">
								Se connecter
							</Button>
						)}
					</Box>
				</Container>
			</Box>

			<Box
				component="main"
				sx={{
					// flex 1 + minHeight 0 lets this child take all remaining vertical space
					// AND constrain its children so its own `overflow: auto` actually kicks in.
					flex: "1 1 0",
					minHeight: 0,
					overflow: "auto",
					py: { xs: 4, md: 6 },
				}}
			>
				{children}
			</Box>

			<Box
				component="footer"
				sx={{
					flex: "0 0 auto",
					borderTop: "1px solid var(--line)",
					py: 0.75,
					bgcolor: "var(--surface)",
				}}
			>
				<Container maxWidth="xl" sx={{ maxWidth: "1280px", px: { xs: 2.5, md: 5 } }}>
					<Typography variant="caption" sx={{ color: "var(--ink-mute)", fontSize: 11, letterSpacing: 0.1 }}>
						© 2026 — Jonathan GUICHARD · Clos Verde
					</Typography>
				</Container>
			</Box>
		</Box>
	);
}
