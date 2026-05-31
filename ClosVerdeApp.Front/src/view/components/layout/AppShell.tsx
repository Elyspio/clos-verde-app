import { Badge, Box, Drawer, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { ChevronRight, Home, HelpOutline, Menu as MenuIcon, NotificationsNoneOutlined, ShieldOutlined } from "@mui/icons-material";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useUnreadQueries } from "@data/unread/unread.queries";
import { useIsAdmin } from "@data/client/useIsAdmin";
import { FeedbackTrigger } from "@/view/components/feedback/FeedbackTrigger";
import { routes } from "@/config/routes";
import { UserMenu } from "./UserMenu";
import { NAV_GROUP_LABELS, NAV_ITEMS, resolveBreadcrumb, type NavGroupKey } from "./navConfig";

const SIDEBAR_WIDTH = 244;
const GROUP_ORDER: NavGroupKey[] = ["community", "info", "admin"];

/**
 * App chrome: a grouped left sidebar (Communauté / Informations / Admin) isolating the admin
 * space, a slim topbar reduced to a breadcrumb + notifications, and a temporary drawer on mobile.
 * The admin group only renders for admins (UI affordance; every admin route is also server-gated).
 */
export function AppShell() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const location = useLocation();
	const isAdmin = useIsAdmin();
	const crumb = resolveBreadcrumb(location.pathname);

	return (
		<Box
			data-testid="app-shell"
			sx={{
				height: "100dvh",
				display: "flex",
				bgcolor: "var(--app-bg)",
				// Shell never scrolls itself; only the main child (and only what it allows).
				overflow: "hidden",
			}}
		>
			{/* Permanent sidebar (desktop) */}
			<Box sx={{ display: { xs: "none", md: "flex" }, flex: `0 0 ${SIDEBAR_WIDTH}px`, width: SIDEBAR_WIDTH }}>
				<SidebarBody isAdmin={isAdmin} />
			</Box>

			{/* Temporary sidebar (mobile) */}
			<Drawer
				open={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH, border: "none" } } }}
				sx={{ display: { xs: "block", md: "none" } }}
			>
				<SidebarBody isAdmin={isAdmin} onNavigate={() => setDrawerOpen(false)} />
			</Drawer>

			{/* Content column */}
			<Box sx={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column" }}>
				<Box
					component="header"
					sx={{
						flex: "0 0 auto",
						zIndex: 10,
						minHeight: 64,
						display: "flex",
						alignItems: "center",
						gap: 1.5,
						px: { xs: 2, md: 3 },
						bgcolor: "rgba(255,255,255,0.92)",
						backdropFilter: "blur(14px)",
						borderBottom: "1px solid var(--line)",
					}}
				>
					<IconButton
						aria-label="Ouvrir le menu"
						onClick={() => setDrawerOpen(true)}
						sx={{ display: { xs: "inline-flex", md: "none" }, border: "1px solid var(--line)", borderRadius: "11px", color: "var(--ink-soft)" }}
					>
						<MenuIcon />
					</IconButton>
					<Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
						<Typography sx={{ fontSize: 12, fontWeight: 700, color: "var(--ink-mute)", display: { xs: "none", sm: "block" } }}>{crumb.group}</Typography>
						<ChevronRight sx={{ fontSize: 16, color: "var(--line-strong)", display: { xs: "none", sm: "block" } }} />
						<Typography noWrap sx={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>
							{crumb.label}
						</Typography>
					</Stack>
					<Stack direction="row" alignItems="center" spacing={1.25} sx={{ ml: "auto" }}>
						<FeedbackTrigger />
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
									borderRadius: "11px",
									"&:hover": { color: "var(--primary-blue)", backgroundColor: "var(--surface-blue)", borderColor: "var(--primary-blue)" },
								}}
							>
								<HelpOutline />
							</IconButton>
						</Tooltip>
						<Tooltip title="Notifications">
							<IconButton
								aria-label="Notifications"
								sx={{ position: "relative", border: "1px solid var(--line)", backgroundColor: "var(--surface)", color: "var(--ink-soft)", borderRadius: "11px" }}
							>
								<NotificationsNoneOutlined />
								<Box component="span" sx={{ position: "absolute", top: 9, right: 10, width: 7, height: 7, borderRadius: "50%", bgcolor: "var(--danger)" }} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Box>
				<Box
					component="main"
					sx={{
						// flex:1 + minHeight:0 lets the main area take the remaining height and constrain
						// its children. overflow:auto keeps document-flow pages scrollable while the shell
						// stays locked; pages that own their scrolling (Messages, Avis) set height:100%.
						flex: "1 1 0",
						minHeight: 0,
						overflow: "auto",
						display: "flex",
						flexDirection: "column",
					}}
				>
					<Outlet />
				</Box>
			</Box>
		</Box>
	);
}

function SidebarBody({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
	const unreadTotal = useUnreadQueries.total();
	const visible = NAV_ITEMS.filter((it) => !it.adminOnly || isAdmin);

	return (
		<Box
			sx={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				bgcolor: "var(--surface)",
				borderRight: "1px solid var(--line)",
				p: 1.75,
			}}
		>
			<Stack
				component={NavLink}
				to={routes.app.calendar.path}
				direction="row"
				alignItems="center"
				spacing={1.25}
				onClick={onNavigate}
				sx={{ px: 0.5, pb: 0.5, flexShrink: 0 }}
			>
				<Box
					aria-hidden
					sx={{
						width: 32,
						height: 32,
						borderRadius: "11px",
						bgcolor: "var(--primary-blue)",
						color: "var(--surface)",
						display: "grid",
						placeItems: "center",
						flexShrink: 0,
					}}
				>
					<Home sx={{ fontSize: 20 }} />
				</Box>
				<Box>
					<Typography sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1, color: "var(--ink)" }}>Clos Verde</Typography>
					<Typography sx={{ fontSize: 10.5, color: "var(--ink-mute)", fontWeight: 700, mt: 0.3 }}>Place partagée</Typography>
				</Box>
			</Stack>

			<Box component="nav" data-testid="main-navigation" sx={{ flex: 1, overflowY: "auto", mt: 0.5 }}>
				{GROUP_ORDER.map((group) => {
					const items = visible.filter((it) => it.group === group);
					if (items.length === 0) return null;
					const isAdminGroup = group === "admin";
					return (
						<Box key={group}>
							<Stack direction="row" alignItems="center" spacing={0.5} sx={{ px: 1.5, pt: 1.75, pb: 0.75 }}>
								{isAdminGroup && <ShieldOutlined sx={{ fontSize: 13, color: "var(--warning)" }} />}
								<Typography
									sx={{
										fontSize: 10.5,
										fontWeight: 800,
										letterSpacing: "0.06em",
										textTransform: "uppercase",
										color: isAdminGroup ? "var(--warning)" : "var(--ink-mute)",
									}}
								>
									{NAV_GROUP_LABELS[group]}
								</Typography>
							</Stack>
							{items.map((item) => {
								const Icon = item.icon;
								const badge = item.unreadBadge ? unreadTotal : 0;
								return (
									<Box
										key={item.to}
										component={NavLink}
										to={item.to}
										onClick={onNavigate}
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 1.4,
											px: 1.4,
											py: 1.1,
											mb: 0.25,
											borderRadius: "10px",
											color: "var(--ink-soft)",
											fontSize: "0.84rem",
											fontWeight: 700,
											transition: "background-color 160ms ease, color 160ms ease",
											"& .nav-icon": { color: "var(--ink-mute)", transition: "color 160ms ease" },
											"&:hover": { backgroundColor: "var(--surface-soft)" },
											"&.active": { backgroundColor: "var(--surface-blue)", color: "var(--primary-blue)", fontWeight: 800 },
											"&.active .nav-icon": { color: "var(--primary-blue)" },
										}}
									>
										<Icon className="nav-icon" sx={{ fontSize: 20 }} />
										<Box component="span" sx={{ flex: 1, minWidth: 0 }}>
											{item.label}
										</Box>
										{badge > 0 && (
											<Badge
												badgeContent={badge}
												color="error"
												sx={{ "& .MuiBadge-badge": { position: "static", transform: "none", fontSize: 10, height: 18, minWidth: 18, fontWeight: 800 } }}
											/>
										)}
									</Box>
								);
							})}
						</Box>
					);
				})}
			</Box>

			<Box sx={{ flexShrink: 0, pt: 1, borderTop: "1px solid var(--line)" }}>
				<UserMenu />
			</Box>
		</Box>
	);
}
