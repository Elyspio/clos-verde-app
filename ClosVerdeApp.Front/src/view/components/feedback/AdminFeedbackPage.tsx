import { Alert, Avatar, Box, Chip, CircularProgress, Container, Drawer, IconButton, Pagination, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import { AttachFile, CheckCircleOutline, Close, DoNotDisturbAltOutlined, ReplayOutlined } from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import type { Feedback, FeedbackCategory, FeedbackStatus } from "@apis/rest/api/generated";
import { useFeedbackMutations } from "@data/feedback/feedback.mutations";
import { useFeedbackQueries } from "@data/feedback/feedback.queries";
import { useIsAdmin } from "@data/client/useIsAdmin";
import { downloadWithAuth } from "@data/messages/attachments.hooks";
import { routes } from "@/config/routes";
import { ALL_CATEGORIES, CATEGORY_META } from "./categoryMeta";

const STATUS_TABS: { label: string; value: FeedbackStatus | undefined }[] = [
	{ label: "Tous", value: undefined },
	{ label: "Ouverts", value: "Open" },
	{ label: "Résolus", value: "Resolved" },
	{ label: "Écartés", value: "Discarded" },
];

const PAGE_SIZE = 20;

/**
 * Admin-only back-office for triaging feedback. Hard-redirects non-admins back to
 * the calendar — the route is also gated by the SignalR hub and the API endpoint,
 * but bouncing in the UI avoids a hostile blank screen.
 */
export function AdminFeedbackPage() {
	const isAdmin = useIsAdmin();
	const [category, setCategory] = useState<FeedbackCategory | undefined>(undefined);
	const [status, setStatus] = useState<FeedbackStatus | undefined>("Open");
	const [page, setPage] = useState(1);
	const [selected, setSelected] = useState<Feedback | null>(null);

	const listQuery = useFeedbackQueries.adminList({ category, status, page, pageSize: PAGE_SIZE });

	const totalPages = useMemo(() => {
		const total = listQuery.data?.total ?? 0;
		return Math.max(1, Math.ceil(total / PAGE_SIZE));
	}, [listQuery.data?.total]);

	if (!isAdmin) return <Navigate to={routes.app.calendar.path} replace />;

	return (
		<Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2.5, md: 5 } }}>
			<Stack spacing={3} data-testid="admin-feedback-page">
				<Stack spacing={0.75}>
					<Typography variant="h2">Avis</Typography>
					<Typography variant="body1" color="text.secondary">
						Bug reports, suggestions et questions envoyés par les utilisateurs.
					</Typography>
				</Stack>

				<Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
					<Tabs
						value={status ?? "all"}
						onChange={(_, value) => {
							const next = STATUS_TABS.find((tab) => (tab.value ?? "all") === value)?.value;
							setStatus(next);
							setPage(1);
						}}
						sx={{ minHeight: 36 }}
					>
						{STATUS_TABS.map((tab) => (
							<Tab key={tab.label} label={tab.label} value={tab.value ?? "all"} sx={{ minHeight: 36, textTransform: "none", fontWeight: 700 }} />
						))}
					</Tabs>

					<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
						<CategoryFilterChip
							selected={category === undefined}
							onClick={() => {
								setCategory(undefined);
								setPage(1);
							}}
							label="Toutes"
							accent="var(--ink-soft)"
							accentSoft="var(--surface-soft)"
						/>
						{ALL_CATEGORIES.map((cat) => {
							const meta = CATEGORY_META[cat];
							return (
								<CategoryFilterChip
									key={cat}
									selected={category === cat}
									onClick={() => {
										setCategory(cat);
										setPage(1);
									}}
									label={meta.label}
									accent={meta.accent}
									accentSoft={meta.accentSoft}
								/>
							);
						})}
					</Stack>
				</Stack>

				{listQuery.isError && <Alert severity="error">Chargement impossible.</Alert>}

				{listQuery.isPending ? (
					<Stack alignItems="center" sx={{ py: 6 }}>
						<CircularProgress size={28} />
					</Stack>
				) : listQuery.data && listQuery.data.items.length === 0 ? (
					<Alert severity="info" data-testid="admin-feedback-empty">
						Aucun retour pour ces filtres.
					</Alert>
				) : (
					<Stack spacing={1.25}>
						{listQuery.data?.items.map((item) => (
							<FeedbackRow key={item.id} feedback={item} onSelect={() => setSelected(item)} />
						))}
					</Stack>
				)}

				{totalPages > 1 && (
					<Stack alignItems="center">
						<Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
					</Stack>
				)}
			</Stack>

			<FeedbackDetailDrawer feedback={selected} onClose={() => setSelected(null)} onUpdated={setSelected} />
		</Container>
	);
}

function CategoryFilterChip({ selected, onClick, label, accent, accentSoft }: { selected: boolean; onClick: () => void; label: string; accent: string; accentSoft: string }) {
	return (
		<Chip
			label={label}
			onClick={onClick}
			variant={selected ? "filled" : "outlined"}
			size="small"
			sx={{
				fontWeight: 700,
				borderRadius: "999px",
				...(selected
					? { backgroundColor: accentSoft, color: accent, borderColor: "transparent" }
					: { color: "var(--ink-soft)", borderColor: "var(--line)", backgroundColor: "var(--surface)" }),
			}}
		/>
	);
}

function FeedbackRow({ feedback, onSelect }: { feedback: Feedback; onSelect: () => void }) {
	const meta = CATEGORY_META[feedback.category];
	const Icon = meta.icon;
	const initials = feedback.author.displayName
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");

	return (
		<Box
			data-testid={`admin-feedback-row-${feedback.id}`}
			onClick={onSelect}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect();
				}
			}}
			sx={{
				display: "flex",
				gap: 2,
				p: 2,
				border: "1px solid var(--line)",
				borderRadius: "14px",
				backgroundColor: "var(--surface)",
				cursor: "pointer",
				transition: "border-color 180ms ease, background-color 180ms ease",
				"&:hover": { borderColor: "var(--primary-blue)", backgroundColor: "var(--surface-blue)" },
				"&:focus-visible": { outline: "2px solid var(--primary-blue)", outlineOffset: 2 },
			}}
		>
			<Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700, bgcolor: "var(--surface-soft)", color: "var(--ink)" }}>{initials || "?"}</Avatar>
			<Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.5}>
				<Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
					<Chip
						icon={<Icon sx={{ fontSize: 14 }} />}
						label={meta.label}
						size="small"
						sx={{ bgcolor: meta.accentSoft, color: meta.accent, fontWeight: 700, "& .MuiChip-icon": { color: meta.accent } }}
					/>
					<StatusChip status={feedback.status} />
					{feedback.attachments.length > 0 && (
						<Chip
							icon={<AttachFile sx={{ fontSize: 14 }} />}
							label={feedback.attachments.length}
							size="small"
							sx={{ bgcolor: "var(--surface-soft)", color: "var(--ink-soft)", fontWeight: 700 }}
						/>
					)}
				</Stack>
				<Typography sx={{ fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{feedback.title}</Typography>
				<Typography
					variant="body2"
					sx={{
						color: "var(--ink-soft)",
						display: "-webkit-box",
						WebkitLineClamp: 2,
						WebkitBoxOrient: "vertical",
						overflow: "hidden",
					}}
				>
					{feedback.body}
				</Typography>
				<Typography variant="caption" sx={{ color: "var(--ink-mute)" }}>
					{feedback.author.displayName} · {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true, locale: fr })}
				</Typography>
			</Stack>
		</Box>
	);
}

function StatusChip({ status }: { status: FeedbackStatus }) {
	const config: Record<FeedbackStatus, { label: string; color: string; bg: string }> = {
		Open: { label: "Ouvert", color: "var(--primary-blue)", bg: "var(--primary-blue-soft)" },
		Resolved: { label: "Résolu", color: "#047857", bg: "var(--mint-soft)" },
		Discarded: { label: "Écarté", color: "var(--ink-soft)", bg: "var(--surface-soft)" },
	};
	const c = config[status];
	return <Chip label={c.label} size="small" sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700 }} />;
}

function FeedbackDetailDrawer({ feedback, onClose, onUpdated }: { feedback: Feedback | null; onClose: () => void; onUpdated: (next: Feedback) => void }) {
	const updateMutation = useFeedbackMutations.updateStatus();

	const handleStatus = async (status: FeedbackStatus) => {
		if (!feedback) return;
		// Lift the freshly-returned Feedback back to the parent so the drawer's status chip,
		// resolvedAt, and the visible "Marquer résolu / Écarter / Ré-ouvrir" buttons reflect
		// the new state immediately. The list query is invalidated by the mutation's
		// onSuccess; this keeps the drawer in sync without waiting for that round-trip.
		const updated = await updateMutation.mutateAsync({ id: feedback.id, status });
		onUpdated(updated);
	};

	return (
		<Drawer anchor="right" open={!!feedback} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: "100%", sm: 520 }, p: 3 } } }} data-testid="admin-feedback-drawer">
			{feedback && (
				<Stack spacing={2.5}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Typography variant="overline">Détail</Typography>
						<IconButton size="small" onClick={onClose} aria-label="Fermer" sx={{ color: "var(--ink-soft)" }}>
							<Close />
						</IconButton>
					</Stack>

					<Stack spacing={1}>
						<Typography variant="h4">{feedback.title}</Typography>
						<Stack direction="row" spacing={0.75} flexWrap="wrap">
							<DetailCategoryChip category={feedback.category} />
							<StatusChip status={feedback.status} />
						</Stack>
						<Typography variant="caption" sx={{ color: "var(--ink-mute)" }}>
							{feedback.author.displayName}
							{feedback.author.email ? ` · ${feedback.author.email}` : ""} · {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true, locale: fr })}
						</Typography>
					</Stack>

					<Box
						sx={{
							whiteSpace: "pre-wrap",
							p: 2,
							borderRadius: "12px",
							border: "1px solid var(--line)",
							backgroundColor: "var(--surface-soft)",
							color: "var(--ink)",
							fontSize: "0.92rem",
							lineHeight: 1.55,
						}}
					>
						{feedback.body}
					</Box>

					{feedback.attachments.length > 0 && (
						<Stack spacing={1}>
							<Typography variant="overline">Pièces jointes</Typography>
							{feedback.attachments.map((attachment) => (
								<Box
									key={attachment.id}
									component="button"
									type="button"
									onClick={() => {
										// The download endpoint is `[Authorize]` and `downloadUrl` is a relative path
										// served by the API host — a plain <a href> hits the front origin (port 3000)
										// without the Bearer header. Routing through the axios interceptor handles both.
										void downloadWithAuth(attachment.downloadUrl, attachment.fileName);
									}}
									sx={{
										all: "unset",
										display: "flex",
										alignItems: "center",
										gap: 1,
										p: 1,
										borderRadius: "10px",
										border: "1px solid var(--line)",
										color: "var(--ink)",
										cursor: "pointer",
										transition: "border-color 160ms ease, color 160ms ease, background-color 160ms ease",
										"&:hover": { borderColor: "var(--primary-blue)", color: "var(--primary-blue)", backgroundColor: "var(--surface-blue)" },
										"&:focus-visible": { outline: "2px solid var(--primary-blue)", outlineOffset: 2 },
									}}
								>
									<AttachFile sx={{ fontSize: 18 }} />
									<Typography sx={{ fontSize: 13, fontWeight: 600 }}>{attachment.fileName}</Typography>
								</Box>
							))}
						</Stack>
					)}

					{feedback.context && (feedback.context.url || feedback.context.userAgent || feedback.context.appVersion) && (
						<Stack spacing={0.5}>
							<Typography variant="overline">Contexte technique</Typography>
							{feedback.context.url && (
								<Typography variant="caption" sx={{ color: "var(--ink-soft)", wordBreak: "break-all" }}>
									URL : {feedback.context.url}
								</Typography>
							)}
							{feedback.context.appVersion && (
								<Typography variant="caption" sx={{ color: "var(--ink-soft)" }}>
									Version : {feedback.context.appVersion}
								</Typography>
							)}
							{feedback.context.userAgent && (
								<Typography variant="caption" sx={{ color: "var(--ink-mute)", wordBreak: "break-all" }}>
									{feedback.context.userAgent}
								</Typography>
							)}
						</Stack>
					)}

					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						{feedback.status !== "Resolved" && (
							<Chip
								icon={<CheckCircleOutline sx={{ fontSize: 16 }} />}
								label="Marquer résolu"
								onClick={() => void handleStatus("Resolved")}
								disabled={updateMutation.isPending}
								sx={{ bgcolor: "var(--mint-soft)", color: "#047857", fontWeight: 700, "& .MuiChip-icon": { color: "#047857" } }}
							/>
						)}
						{feedback.status !== "Discarded" && (
							<Chip
								icon={<DoNotDisturbAltOutlined sx={{ fontSize: 16 }} />}
								label="Écarter"
								onClick={() => void handleStatus("Discarded")}
								disabled={updateMutation.isPending}
								sx={{ bgcolor: "var(--surface-soft)", color: "var(--ink-soft)", fontWeight: 700 }}
							/>
						)}
						{feedback.status !== "Open" && (
							<Tooltip title="Ré-ouvrir">
								<Chip
									icon={<ReplayOutlined sx={{ fontSize: 16 }} />}
									label="Ré-ouvrir"
									onClick={() => void handleStatus("Open")}
									disabled={updateMutation.isPending}
									sx={{ bgcolor: "var(--primary-blue-soft)", color: "var(--primary-blue)", fontWeight: 700, "& .MuiChip-icon": { color: "var(--primary-blue)" } }}
								/>
							</Tooltip>
						)}
						{updateMutation.isError && (
							<Typography variant="caption" sx={{ color: "var(--danger)", alignSelf: "center" }}>
								Mise à jour impossible. Veuillez réessayer.
							</Typography>
						)}
					</Stack>
				</Stack>
			)}
		</Drawer>
	);
}

function DetailCategoryChip({ category }: { category: FeedbackCategory }) {
	const meta = CATEGORY_META[category];
	const Icon = meta.icon;
	return (
		<Chip
			icon={<Icon sx={{ fontSize: 14 }} />}
			label={meta.label}
			size="small"
			sx={{ bgcolor: meta.accentSoft, color: meta.accent, fontWeight: 700, "& .MuiChip-icon": { color: meta.accent } }}
		/>
	);
}
