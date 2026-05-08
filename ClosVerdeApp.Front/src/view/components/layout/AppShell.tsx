import { Box, Container, Stack, Typography } from "@mui/material";
import { NavLink, Outlet } from "react-router-dom";
import { UserMenu } from "./UserMenu";
import { Home } from "@mui/icons-material";

const navItems = [
	{ to: "/calendrier", label: "Calendrier" },
	{ to: "/reserver", label: "Réserver" },
	{ to: "/classement", label: "Classement" },
];

export function AppShell() {
	return (
		<Box minHeight="100vh" display="flex" flexDirection="column" bgcolor="var(--app-bg)">
			<Box
				component="header"
				data-testid="app-shell"
				sx={{
					position: "sticky",
					top: 0,
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
								{item.label}
							</NavLink>
						))}
					</Stack>
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
			<Box component="main" flex={1}>
				<Outlet />
			</Box>
			<Box component="footer" sx={{ borderTop: "1px solid var(--line)", py: 2.5, bgcolor: "var(--surface)" }}>
				<Container maxWidth="xl" sx={{ maxWidth: "1280px", px: { xs: 2.5, md: 5 } }}>
					<Typography variant="caption">© 2026 - Jonathan GUICHARD - Clos Verde</Typography>
				</Container>
			</Box>
		</Box>
	);
}
