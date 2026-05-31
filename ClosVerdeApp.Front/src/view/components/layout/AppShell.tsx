import { Badge, Box, Container, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { NavLink, Outlet } from "react-router-dom";
import { UserMenu } from "./UserMenu";
import { HelpOutline, Home } from "@mui/icons-material";
import { useUnreadQueries } from "@data/unread/unread.queries";
import { useIsAdmin } from "@data/client/useIsAdmin";
import { FeedbackTrigger } from "@/view/components/feedback/FeedbackTrigger";
import { routes } from "@/config/routes";

const baseNavItems = [
	{ to: "/calendrier", label: "Calendrier", badge: false },
	{ to: "/reserver", label: "Réserver", badge: false },
	{ to: "/classement", label: "Classement", badge: false },
	{ to: "/messages", label: "Messages", badge: true },
	{ to: "/mes-tickets", label: "Mes tickets", badge: false },
];

const adminNavItem = { to: "/admin/feedback", label: "Avis", badge: false };

export function AppShell() {
	const unreadTotal = useUnreadQueries.total();
	const isAdmin = useIsAdmin();
	const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;
	return (
		<Box
			sx={{
				height: "100dvh",
				display: "flex",
				flexDirection: "column",
				bgcolor: "var(--app-bg)",
				// Shell never scrolls itself; only the main child (and only what it allows).
				overflow: "hidden",
			}}
		>
			<Box
				component="header"
				data-testid="app-shell"
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
					<Stack component={NavLink} to="/calendrier" direction="row" alignItems="center" spacing={1.2} sx={{ flexShrink: 0 }}>
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
								Gestion de la place partagée
							</Typography>
						</Box>
					</Stack>
					<Stack
						component="nav"
						data-testid="main-navigation"
						direction="row"
						spacing={0.5}
						sx={{
							ml: "auto",
							display: { xs: "none", sm: "flex" },
							p: 0.5,
							border: "1px solid var(--line)",
							borderRadius: "999px",
							bgcolor: "var(--surface)",
							"& a": {
								borderRadius: "999px",
								px: { sm: 1.6, md: 2 },
								py: 1,
								fontSize: "0.82rem",
								fontWeight: 800,
								color: "var(--ink-soft)",
								transition: "background-color 180ms ease, color 180ms ease",
							},
							"& a.active": { color: "var(--primary-blue)", bgcolor: "var(--surface-blue)" },
							"& a:hover": { color: "var(--primary-blue)", bgcolor: "var(--surface-soft)" },
						}}
					>
						{navItems.map((item) => (
							<NavLink key={item.to} to={item.to}>
								{item.badge && unreadTotal > 0 ? (
									<Badge badgeContent={unreadTotal} color="error" sx={{ "& .MuiBadge-badge": { right: -10, top: 4, fontSize: 10, height: 16, minWidth: 16 } }}>
										<Box component="span" sx={{ pr: 0.5 }}>
											{item.label}
										</Box>
									</Badge>
								) : (
									item.label
								)}
							</NavLink>
						))}
					</Stack>
					<Tooltip title="Aide">
						<IconButton
							component={NavLink}
							to={routes.app.faq.path}
							aria-label="Aide"
							data-testid="faq-trigger"
							sx={{
								border: "1px solid var(--line)",
								backgroundColor: "var(--surface)",
								color: "var(--ink-soft)",
								transition: "color 180ms ease, background-color 180ms ease, border-color 180ms ease",
								"&:hover": {
									color: "var(--primary-blue)",
									backgroundColor: "var(--surface-blue)",
									borderColor: "var(--primary-blue)",
								},
							}}
						>
							<HelpOutline />
						</IconButton>
					</Tooltip>
					<FeedbackTrigger />
					<UserMenu />
				</Container>
				<Stack
					component="nav"
					direction="row"
					spacing={0.75}
					sx={{
						display: { xs: "flex", sm: "none" },
						overflowX: "auto",
						px: 2.5,
						pb: 1.25,
						"& a": {
							flex: "1 0 auto",
							borderRadius: "999px",
							bgcolor: "var(--surface)",
							border: "1px solid var(--line)",
							px: 1.4,
							py: 0.85,
							textAlign: "center",
							color: "var(--ink-soft)",
							fontSize: 12,
							fontWeight: 800,
						},
						"& a.active": { color: "var(--primary-blue)", bgcolor: "var(--surface-blue)", borderColor: "var(--primary-blue-soft)" },
					}}
				>
					{navItems.map((item) => (
						<NavLink key={item.to} to={item.to}>
							{item.label}
						</NavLink>
					))}
				</Stack>
			</Box>
			<Box
				component="main"
				sx={{
					// flex: 1 + minHeight: 0 is the canonical combo that lets a flex child
					// (a) take all remaining vertical space and (b) actually constrain its
					// own children so they can declare their own overflow.
					// `overflow: auto` keeps document-flow pages (calendar, reservation, etc.)
					// scrollable while the body stays locked — only the main area scrolls.
					// Pages that want to own their scrolling (Messages) set themselves to
					// `height: 100%` + internal overflow so this wrapper never scrolls.
					flex: "1 1 0",
					minHeight: 0,
					overflow: "auto",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Outlet />
			</Box>
			<Box
				component="footer"
				sx={{
					flex: "0 0 auto",
					borderTop: "1px solid var(--line)",
					// Visual "rail": minimal vertical weight so the messages thread keeps the room.
					// Flat border-top (no shadow) — a drop-shadow would compete with the message
					// composer that already sits right above on /messages.
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
