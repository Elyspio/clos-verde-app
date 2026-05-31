import { CalendarMonth, ConfirmationNumberOutlined, DashboardOutlined, FeedbackOutlined, ForumOutlined, HelpCenterOutlined } from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import { routes } from "@/config/routes";

export type NavGroupKey = "community" | "info" | "admin";

export interface NavItem {
	to: string;
	label: string;
	icon: SvgIconComponent;
	group: NavGroupKey;
	/** admin-only items are filtered out for non-admins */
	adminOnly?: boolean;
	/** show the global unread badge on this item */
	unreadBadge?: boolean;
}

export const NAV_GROUP_LABELS: Record<NavGroupKey, string> = {
	community: "Communauté",
	info: "Informations",
	admin: "Admin",
};

/**
 * Single source of truth for the sidebar. Order here is the render order within each group.
 * Calendrier now hosts the Classement tab and the "Réserver" action, so neither appears here.
 */
export const NAV_ITEMS: NavItem[] = [
	{ to: routes.app.calendar.path, label: "Calendrier", icon: CalendarMonth, group: "community" },
	{ to: routes.app.messages.path, label: "Messages", icon: ForumOutlined, group: "community", unreadBadge: true },
	{ to: routes.app.faq.path, label: "FAQ", icon: HelpCenterOutlined, group: "info" },
	{ to: routes.app.myFeedback.path, label: "Mes tickets", icon: ConfirmationNumberOutlined, group: "info" },
	{ to: routes.app.adminDashboard.path, label: "Tableau de bord", icon: DashboardOutlined, group: "admin", adminOnly: true },
	{ to: routes.app.feedbackAdmin.path, label: "Avis", icon: FeedbackOutlined, group: "admin", adminOnly: true },
];

/** Routes reachable but absent from the sidebar — used to resolve the topbar breadcrumb. */
const EXTRA_CRUMBS: { match: string; group: NavGroupKey; label: string }[] = [{ match: routes.app.reservation.path, group: "community", label: "Réserver" }];

export interface Breadcrumb {
	group: string;
	label: string;
}

/** Resolve the "group › label" breadcrumb shown in the topbar from the current pathname. */
export function resolveBreadcrumb(pathname: string): Breadcrumb {
	const item = NAV_ITEMS.filter((it) => pathname === it.to || pathname.startsWith(`${it.to}/`)).sort((a, b) => b.to.length - a.to.length)[0];
	if (item) return { group: NAV_GROUP_LABELS[item.group], label: item.label };

	const extra = EXTRA_CRUMBS.find((c) => pathname === c.match || pathname.startsWith(`${c.match}/`));
	if (extra) return { group: NAV_GROUP_LABELS[extra.group], label: extra.label };

	return { group: NAV_GROUP_LABELS.community, label: "Calendrier" };
}
