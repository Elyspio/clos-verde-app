import { Box, Chip, Container, Stack, Typography } from "@mui/material";
import { CheckCircleOutline, ChevronRight, FeedbackOutlined, GroupsOutlined, ScheduleOutlined } from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Feedback } from "@apis/rest/api/generated";
import { useFeedbackQueries } from "@data/feedback/feedback.queries";
import { useIsAdmin } from "@data/client/useIsAdmin";
import { routes } from "@/config/routes";
import { ALL_CATEGORIES, CATEGORY_META } from "./categoryMeta";

/**
 * Admin landing page: at-a-glance KPIs, the open queue, and a per-category breakdown.
 * KPIs without a backend source ("délai médian") show a neutral "—" rather than a fabricated value.
 */
export function AdminDashboardPage() {
	const isAdmin = useIsAdmin();
	const navigate = useNavigate();
	const auth = useAuth();
	const firstName = (auth.user?.profile?.name ?? auth.user?.profile?.preferred_username ?? "").split(/\s+/)[0] ?? "";

	const openQuery = useFeedbackQueries.adminList({ status: "Open", page: 1, pageSize: 100 });
	const resolvedQuery = useFeedbackQueries.adminList({ status: "Resolved", page: 1, pageSize: 1 });
	const allQuery = useFeedbackQueries.adminList({ page: 1, pageSize: 100 });

	const open = openQuery.data?.items ?? [];
	const all = allQuery.data?.items ?? [];

	const byCategory = useMemo(() => ALL_CATEGORIES.map((category) => ({ category, count: all.filter((f) => f.category === category).length })), [all]);
	const maxCategory = Math.max(1, ...byCategory.map((b) => b.count));
	const activeMembers = useMemo(() => new Set(all.map((f) => f.author.id)).size, [all]);

	if (!isAdmin) return <Navigate to={routes.app.calendar.path} replace />;

	const goToFeedback = (id?: string) => void navigate(id ? `${routes.app.feedbackAdmin.path}?selected=${id}` : routes.app.feedbackAdmin.path);

	return (
		<Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2.5, md: 5 } }}>
			<Stack spacing={3} data-testid="admin-dashboard-page">
				<Stack spacing={0.5}>
					<Typography variant="h2">Bonjour {firstName} 👋</Typography>
					<Typography variant="body1" color="text.secondary">
						Voici l'état de la copropriété aujourd'hui.
					</Typography>
				</Stack>

				<Stack direction="row" flexWrap="wrap" useFlexGap gap={1.5}>
					<KpiCard label="Tickets ouverts" value={openQuery.data?.total ?? 0} icon={FeedbackOutlined} accent="var(--coral)" />
					<KpiCard label="Résolus" value={resolvedQuery.data?.total ?? 0} icon={CheckCircleOutline} accent="#047857" />
					<KpiCard label="Délai médian" value="—" icon={ScheduleOutlined} />
					<KpiCard label="Membres actifs" value={activeMembers} icon={GroupsOutlined} />
				</Stack>

				<Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
					<Box sx={{ flex: "2 1 460px", minWidth: 0, p: 2.25, border: "1px solid var(--line)", borderRadius: "16px", bgcolor: "var(--surface)" }}>
						<Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
							<Typography sx={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>À traiter</Typography>
							<Box
								component="button"
								type="button"
								data-testid="admin-dashboard-see-all"
								onClick={() => goToFeedback()}
								sx={{
									all: "unset",
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: 0.5,
									color: "var(--primary-blue)",
									fontSize: 12.5,
									fontWeight: 800,
								}}
							>
								Tout voir <ChevronRight sx={{ fontSize: 16 }} />
							</Box>
						</Stack>
						{open.length === 0 ? (
							<Typography variant="body2" sx={{ py: 3, color: "var(--ink-mute)" }}>
								{openQuery.isPending ? "Chargement…" : "Aucun ticket ouvert. Tout est traité 🎉"}
							</Typography>
						) : (
							<Stack spacing={1}>
								{open.slice(0, 5).map((feedback) => (
									<OpenRow key={feedback.id} feedback={feedback} onSelect={() => goToFeedback(feedback.id)} />
								))}
							</Stack>
						)}
					</Box>

					<Box sx={{ flex: "1 1 240px", minWidth: 0, p: 2.25, border: "1px solid var(--line)", borderRadius: "16px", bgcolor: "var(--surface)" }}>
						<Typography sx={{ fontSize: 15, fontWeight: 800, color: "var(--ink)", mb: 2 }}>Par catégorie</Typography>
						<Stack spacing={1.75}>
							{byCategory.map(({ category, count }) => {
								const meta = CATEGORY_META[category];
								return (
									<Box key={category}>
										<Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", mb: 0.75 }}>
											<span>{meta.label}</span>
											<span>{count}</span>
										</Stack>
										<Box sx={{ height: 8, borderRadius: "999px", bgcolor: "var(--surface-soft)", overflow: "hidden" }}>
											<Box sx={{ width: `${(count / maxCategory) * 100}%`, height: "100%", borderRadius: "999px", bgcolor: meta.accent }} />
										</Box>
									</Box>
								);
							})}
						</Stack>
					</Box>
				</Stack>
			</Stack>
		</Container>
	);
}

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: SvgIconComponent; accent?: string }) {
	return (
		<Box sx={{ flex: "1 1 160px", minWidth: 150, p: 2, border: "1px solid var(--line)", borderRadius: "14px", bgcolor: "var(--surface)" }}>
			<Stack direction="row" alignItems="center" spacing={1}>
				<Box sx={{ width: 30, height: 30, borderRadius: "9px", bgcolor: "var(--surface-soft)", display: "grid", placeItems: "center" }}>
					<Icon sx={{ fontSize: 18, color: accent ?? "var(--ink-soft)" }} />
				</Box>
				<Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)" }}>{label}</Typography>
			</Stack>
			<Typography sx={{ mt: 1.25, fontSize: 28, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>{value}</Typography>
		</Box>
	);
}

function OpenRow({ feedback, onSelect }: { feedback: Feedback; onSelect: () => void }) {
	const meta = CATEGORY_META[feedback.category];
	const Icon = meta.icon;
	return (
		<Box
			component="button"
			type="button"
			data-testid={`admin-dashboard-open-${feedback.id}`}
			onClick={onSelect}
			sx={{
				all: "unset",
				boxSizing: "border-box",
				width: "100%",
				display: "flex",
				alignItems: "center",
				gap: 1.5,
				p: 1.5,
				border: "1px solid var(--line)",
				borderRadius: "12px",
				cursor: "pointer",
				transition: "border-color 160ms ease, background-color 160ms ease",
				"&:hover": { borderColor: "var(--primary-blue)", bgcolor: "var(--surface-blue)" },
				"&:focus-visible": { outline: "2px solid var(--primary-blue)", outlineOffset: 2 },
			}}
		>
			<Box sx={{ minWidth: 0, flex: 1 }}>
				<Typography sx={{ fontWeight: 800, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{feedback.title}</Typography>
				<Typography variant="caption" sx={{ color: "var(--ink-mute)" }}>
					{feedback.author.displayName} · {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true, locale: fr })}
				</Typography>
			</Box>
			<Chip
				icon={<Icon sx={{ fontSize: 14 }} />}
				label={meta.label}
				size="small"
				sx={{ bgcolor: meta.accentSoft, color: meta.accent, fontWeight: 700, "& .MuiChip-icon": { color: meta.accent } }}
			/>
		</Box>
	);
}
