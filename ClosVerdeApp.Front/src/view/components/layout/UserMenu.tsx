import { Logout, Notifications } from "@mui/icons-material";
import { Avatar, Box, IconButton, ListItemIcon, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { requestNotificationPermission } from "@/core/notifications/notifications";
import { useAppSelector } from "@/store";
import { selectPushNotificationStatus } from "@/store/modules/notifications/notifications.actions";

export function UserMenu() {
	const auth = useAuth();
	const pushStatus = useAppSelector(selectPushNotificationStatus);
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	const open = Boolean(anchor);
	const profile = auth.user?.profile;
	const label = profile?.name ?? profile?.preferred_username ?? profile?.email ?? "Compte";
	const initial = label.trim().charAt(0).toUpperCase() || "B";

	const handleLogout = () => {
		setAnchor(null);
		void auth.signoutRedirect();
	};

	const handleEnableNotifications = () => {
		void requestNotificationPermission();
	};

	return (
		<>
			<Tooltip title="Menu du compte">
				<IconButton
					onClick={(event) => setAnchor(event.currentTarget)}
					aria-label="Menu du compte"
					aria-controls={open ? "user-menu" : undefined}
					aria-haspopup="menu"
					aria-expanded={open ? "true" : undefined}
					sx={{ borderRadius: "999px", gap: 1, p: 0.4, border: "1px solid var(--line)", bgcolor: "var(--surface)" }}
				>
					<Avatar
						sx={{
							width: 34,
							height: 34,
							bgcolor: "var(--surface-blue)",
							color: "var(--primary-blue)",
							fontWeight: 800,
						}}
					>
						{initial}
					</Avatar>
					<Box sx={{ display: { xs: "none", md: "block" }, maxWidth: 150 }}>
						<Typography noWrap variant="body2" color="text.primary">
							{label}
						</Typography>
					</Box>
				</IconButton>
			</Tooltip>
			<Menu
				id="user-menu"
				anchorEl={anchor}
				open={open}
				onClose={() => setAnchor(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
				slotProps={{ paper: { sx: { mt: 1, minWidth: 210, border: "1px solid var(--line)", borderRadius: "14px" } } }}
			>
				<MenuItem onClick={handleEnableNotifications} disabled={pushStatus === "subscribed" || pushStatus === "subscribing" || pushStatus === "unsupported"}>
					<ListItemIcon>
						<Notifications fontSize="small" />
					</ListItemIcon>
					{pushStatus === "subscribed" ? "Notifications activées" : pushStatus === "subscribing" ? "Activation..." : "Activer les notifications"}
				</MenuItem>
				<MenuItem onClick={handleLogout}>
					<ListItemIcon>
						<Logout fontSize="small" />
					</ListItemIcon>
					Se déconnecter
				</MenuItem>
			</Menu>
		</>
	);
}
