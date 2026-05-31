import { Alert, Box, Button, Chip, CircularProgress, Container, IconButton, Pagination, Stack, TextField, Typography } from "@mui/material";
import { ArrowBack, AttachFile, CheckCircleOutline, Close, DoNotDisturbAltOutlined, ReplayOutlined, Search, Send, TouchAppOutlined } from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import type { Feedback, FeedbackCategory, FeedbackStatus } from "@apis/rest/api/generated";
import { useFeedbackMutations } from "@data/feedback/feedback.mutations";
import { useFeedbackQueries } from "@data/feedback/feedback.queries";
import { useIsAdmin } from "@data/client/useIsAdmin";
import { downloadWithAuth } from "@data/messages/attachments.hooks";
import { routes } from "@/config/routes";
import { ALL_CATEGORIES, CATEGORY_META } from "./categoryMeta";

const STATUS_TABS: { label: string; value: FeedbackStatus | "all" }[] = [
	{ label: "Ouverts", value: "Open" },
	{ label: "Résolus", value: "Resolved" },
	{ label: "Écartés", value: "Discarded" },
	{ label: "Tous", value: "all" },
];

const PAGE_SIZE = 50;

/**
 * Admin-only back-office for triaging feedback, laid out as a master-detail: the list on the left,
 * the selected ticket (with its reply thread) on the right. Mobile collapses to a single pane that
 * swaps based on whether a ticket is selected. Hard-redirects non-admins.
 */
export function AdminFeedbackPage() {
	const isAdmin = useIsAdmin();
	const [searchParams, setSearchParams] = useSearchParams();
	const [category, setCategory] = useState<FeedbackCategory | undefined>(undefined);
	const [status, setStatus] = useState<FeedbackStatus | "all">("Open");
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<Feedback | null>(null);

	const statusFilter = status === "all" ? undefined : status;
	const listQuery = useFeedbackQueries.adminList({ category, status: statusFilter, page, pageSize: PAGE_SIZE });

	// Status-tab counters, scoped to the active category filter. pageSize:1 keeps them cheap.
	const openCount = useFeedbackQueries.adminList({ category, status: "Open", page: 1, pageSize: 1 });
	const resolvedCount = useFeedbackQueries.adminList({ category, status: "Resolved", page: 1, pageSize: 1 });
	const discardedCount = useFeedbackQueries.adminList({ category, status: "Discarded", page: 1, pageSize: 1 });
	const allCount = useFeedbackQueries.adminList({ category, page: 1, pageSize: 1 });
	const counts: Record<FeedbackStatus | "all", number> = {
		Open: openCount.data?.total ?? 0,
		Resolved: resolvedCount.data?.total ?? 0,
		Discarded: discardedCount.data?.total ?? 0,
		all: allCount.data?.total ?? 0,
	};

	const totalPages = useMemo(() => Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / PAGE_SIZE)), [listQuery.data?.total]);

	const items = listQuery.data?.items ?? [];
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return items;
		return items.filter((f) => f.title.toLowerCase().includes(q) || f.body.toLowerCase().includes(q) || f.author.displayName.toLowerCase().includes(q));
	}, [items, search]);

	// Deep-link from the dashboard: ?selected=<id> opens that ticket once it lands in the list.
	const targetId = searchParams.get("selected");
	useEffect(() => {
		if (!targetId || selected) return;
		const found = items.find((f) => f.id === targetId);
		if (!found) return;
		setSelected(found);
		const next = new URLSearchParams(searchParams);
		next.delete("selected");
		setSearchParams(next, { replace: true });
	}, [targetId, selected, items, searchParams, setSearchParams]);

	if (!isAdmin) return <Navigate to={routes.app.calendar.path} replace />;

	const master = (
		<MasterPane
			status={status}
			counts={counts}
			onStatus={(value) => {
				setStatus(value);
				setPage(1);
			}}
			category={category}
			onCategory={(value) => {
				setCategory(value);
				setPage(1);
			}}
			search={search}
			onSearch={setSearch}
			items={filtered}
			isPending={listQuery.isPending}
			isError={listQuery.isError}
			selectedId={selected?.id ?? null}
			onSelect={setSelected}
			page={page}
			totalPages={totalPages}
			onPage={setPage}
		/>
	);

	return (
		<Container
			data-testid="admin-feedback-page"
			maxWidth="xl"
			sx={{ maxWidth: "1280px", px: { xs: 0, md: 3 }, py: { xs: 0, md: 3 }, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
		>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", md: "392px 1fr" },
					flex: "1 1 0",
					minHeight: 0,
					border: { md: "1px solid var(--line)" },
					borderRadius: { md: 2 },
					overflow: "hidden",
					bgcolor: "var(--surface)",
				}}
			>
				<Box sx={{ display: { xs: selected ? "none" : "flex", md: "flex" }, flexDirection: "column", minHeight: 0, borderRight: { md: "1px solid var(--line)" } }}>
					{master}
				</Box>
				<Box sx={{ display: { xs: selected ? "flex" : "none", md: "flex" }, minHeight: 0 }}>
					<DetailPane feedback={selected} onUpdated={setSelected} onBack={() => setSelected(null)} />
				</Box>
			</Box>
		</Container>
	);
}

function MasterPane({
	status,
	counts,
	onStatus,
	category,
	onCategory,
	search,
	onSearch,
	items,
	isPending,
	isError,
	selectedId,
	onSelect,
	page,
	totalPages,
	onPage,
}: {
	status: FeedbackStatus | "all";
	counts: Record<FeedbackStatus | "all", number>;
	onStatus: (value: FeedbackStatus | "all") => void;
	category: FeedbackCategory | undefined;
	onCategory: (value: FeedbackCategory | undefined) => void;
	search: string;
	onSearch: (value: string) => void;
	items: Feedback[];
	isPending: boolean;
	isError: boolean;
	selectedId: string | null;
	onSelect: (feedback: Feedback) => void;
	page: number;
	totalPages: number;
	onPage: (page: number) => void;
}) {
	return (
		<>
			<Stack spacing={1.25} sx={{ p: 1.75, borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
				<TextField
					size="small"
					value={search}
					onChange={(e) => onSearch(e.target.value)}
					placeholder="Rechercher un ticket…"
					data-testid="admin-feedback-search"
					slotProps={{
						input: {
							startAdornment: <Search sx={{ fontSize: 18, color: "var(--ink-mute)", mr: 1 }} />,
							endAdornment: search ? (
								<IconButton size="small" onClick={() => onSearch("")} aria-label="Effacer">
									<Close sx={{ fontSize: 16 }} />
								</IconButton>
							) : undefined,
						},
					}}
				/>
				<Stack direction="row" spacing={0.5}>
					{STATUS_TABS.map((tab) => {
						const on = status === tab.value;
						return (
							<Box
								key={tab.value}
								component="button"
								type="button"
								data-testid={`admin-feedback-tab-${tab.value}`}
								onClick={() => onStatus(tab.value)}
								sx={{
									all: "unset",
									flex: 1,
									textAlign: "center",
									py: 0.85,
									borderRadius: "8px",
									cursor: "pointer",
									fontSize: 12,
									fontWeight: 800,
									bgcolor: on ? "var(--ink)" : "var(--surface-soft)",
									color: on ? "#fff" : "var(--ink-soft)",
								}}
							>
								{tab.label}{" "}
								<Box component="span" sx={{ opacity: 0.6 }}>
									{counts[tab.value]}
								</Box>
							</Box>
						);
					})}
				</Stack>
				<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
					<CategoryChip
						selected={category === undefined}
						onClick={() => onCategory(undefined)}
						label="Toutes"
						accent="var(--ink-soft)"
						accentSoft="var(--surface-soft)"
					/>
					{ALL_CATEGORIES.map((cat) => {
						const meta = CATEGORY_META[cat];
						return (
							<CategoryChip
								key={cat}
								selected={category === cat}
								onClick={() => onCategory(cat)}
								label={meta.label}
								accent={meta.accent}
								accentSoft={meta.accentSoft}
							/>
						);
					})}
				</Stack>
			</Stack>

			<Box sx={{ flex: "1 1 0", minHeight: 0, overflowY: "auto", p: 1 }}>
				{isError ? (
					<Alert severity="error" sx={{ m: 1 }}>
						Chargement impossible.
					</Alert>
				) : isPending ? (
					<Stack alignItems="center" sx={{ py: 6 }}>
						<CircularProgress size={26} />
					</Stack>
				) : items.length === 0 ? (
					<Stack alignItems="center" spacing={1} sx={{ py: 6, color: "var(--ink-mute)" }} data-testid="admin-feedback-empty">
						<Typography sx={{ fontWeight: 700 }}>Aucun ticket pour ces filtres.</Typography>
					</Stack>
				) : (
					<Stack spacing={0.5}>
						{items.map((feedback) => (
							<MasterRow key={feedback.id} feedback={feedback} active={feedback.id === selectedId} onClick={() => onSelect(feedback)} />
						))}
					</Stack>
				)}
			</Box>

			{totalPages > 1 && (
				<Stack alignItems="center" sx={{ p: 1, borderTop: "1px solid var(--line)", flexShrink: 0 }}>
					<Pagination count={totalPages} page={page} onChange={(_, p) => onPage(p)} color="primary" size="small" />
				</Stack>
			)}
		</>
	);
}

function MasterRow({ feedback, active, onClick }: { feedback: Feedback; active: boolean; onClick: () => void }) {
	const meta = CATEGORY_META[feedback.category];
	return (
		<Box
			data-testid={`admin-feedback-row-${feedback.id}`}
			role="button"
			tabIndex={0}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			}}
			sx={{
				display: "flex",
				gap: 1.25,
				p: 1.5,
				borderRadius: "11px",
				cursor: "pointer",
				border: active ? "1px solid var(--primary-blue-soft)" : "1px solid transparent",
				bgcolor: active ? "var(--surface-blue)" : "transparent",
				transition: "background-color 150ms ease, border-color 150ms ease",
				"&:hover": { bgcolor: active ? "var(--surface-blue)" : "var(--surface-soft)" },
				"&:focus-visible": { outline: "2px solid var(--primary-blue)", outlineOffset: 2 },
			}}
		>
			<Box sx={{ mt: 0.6, flexShrink: 0, width: 8, height: 8, borderRadius: "50%", bgcolor: meta.accent }} />
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Stack direction="row" alignItems="center" spacing={0.75}>
					<Typography
						sx={{
							flex: 1,
							minWidth: 0,
							fontSize: 13.5,
							fontWeight: 800,
							color: active ? "var(--primary-blue)" : "var(--ink)",
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
						}}
					>
						{feedback.title}
					</Typography>
					{feedback.attachments.length > 0 && <AttachFile sx={{ fontSize: 14, color: "var(--ink-mute)" }} />}
				</Stack>
				<Typography sx={{ fontSize: 12, color: "var(--ink-soft)", mt: 0.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
					{feedback.body}
				</Typography>
				<Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
					<Typography sx={{ fontSize: 11, fontWeight: 600, color: "var(--ink-mute)", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
						{feedback.author.displayName} · {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true, locale: fr })}
					</Typography>
					{feedback.status !== "Open" && (
						<Box sx={{ ml: "auto" }}>
							<StatusChip status={feedback.status} />
						</Box>
					)}
				</Stack>
			</Box>
		</Box>
	);
}

function CategoryChip({ selected, onClick, label, accent, accentSoft }: { selected: boolean; onClick: () => void; label: string; accent: string; accentSoft: string }) {
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

function DetailPane({ feedback, onUpdated, onBack }: { feedback: Feedback | null; onUpdated: (next: Feedback) => void; onBack: () => void }) {
	const updateMutation = useFeedbackMutations.updateStatus();
	const replyMutation = useFeedbackMutations.addReply();
	const [reply, setReply] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setReply("");
		if (scrollRef.current) scrollRef.current.scrollTop = 0;
	}, [feedback?.id]);

	if (!feedback) {
		return (
			<Box sx={{ flex: 1, display: "grid", placeItems: "center", color: "var(--ink-mute)", p: 4 }}>
				<Stack alignItems="center" spacing={1.5} textAlign="center">
					<Box sx={{ width: 52, height: 52, borderRadius: "14px", bgcolor: "var(--surface-soft)", display: "grid", placeItems: "center" }}>
						<TouchAppOutlined sx={{ fontSize: 26, color: "var(--ink-mute)" }} />
					</Box>
					<Typography sx={{ fontSize: 14.5, fontWeight: 800, color: "var(--ink-soft)" }}>Sélectionnez un ticket</Typography>
					<Typography variant="body2" sx={{ color: "var(--ink-mute)" }}>
						Choisissez un avis dans la liste pour le traiter ici.
					</Typography>
				</Stack>
			</Box>
		);
	}

	const handleStatus = async (next: FeedbackStatus) => {
		const updated = await updateMutation.mutateAsync({ id: feedback.id, status: next });
		onUpdated(updated);
	};

	const handleReply = async () => {
		const body = reply.trim();
		if (!body) return;
		const updated = await replyMutation.mutateAsync({ id: feedback.id, body });
		onUpdated(updated);
		setReply("");
	};

	return (
		<Box ref={scrollRef} data-testid="admin-feedback-detail" sx={{ flex: 1, minWidth: 0, overflowY: "auto", p: { xs: 2.25, md: 3 } }}>
			<Stack spacing={2} sx={{ maxWidth: 760 }}>
				<Stack direction="row" alignItems="center" justifyContent="space-between">
					<Button onClick={onBack} startIcon={<ArrowBack />} variant="text" sx={{ display: { xs: "inline-flex", md: "none" }, minHeight: 0, p: 0.5 }}>
						Liste
					</Button>
					<Typography variant="overline" sx={{ display: { xs: "none", md: "block" } }}>
						Détail du ticket
					</Typography>
				</Stack>

				<Stack spacing={1}>
					<Typography variant="h4">{feedback.title}</Typography>
					<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
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
						bgcolor: "var(--surface-soft)",
						color: "var(--ink)",
						lineHeight: 1.6,
					}}
				>
					{feedback.body}
				</Box>

				{feedback.attachments.length > 0 && (
					<Stack spacing={1}>
						<Typography variant="overline">Pièces jointes</Typography>
						{feedback.attachments.map((attachment) => (
							<Button
								key={attachment.id}
								variant="outlined"
								startIcon={<AttachFile sx={{ fontSize: 18 }} />}
								onClick={() => void downloadWithAuth(attachment.downloadUrl, attachment.fileName)}
								sx={{ justifyContent: "flex-start", textTransform: "none", borderRadius: "10px" }}
							>
								{attachment.fileName}
							</Button>
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

				<Box sx={{ borderTop: "1px solid var(--line)", pt: 2 }}>
					<Typography variant="overline" sx={{ display: "block", mb: 1.25 }}>
						Échanges {feedback.replies.length > 0 ? `(${feedback.replies.length})` : ""}
					</Typography>
					{feedback.replies.length === 0 && (
						<Typography variant="body2" sx={{ color: "var(--ink-mute)", mb: 1.5 }}>
							Aucune réponse pour l'instant.
						</Typography>
					)}
					<Stack spacing={1.25} sx={{ mb: 1.75 }}>
						{feedback.replies.map((r) => (
							<Box
								key={r.id}
								sx={{
									bgcolor: r.isAdmin ? "var(--surface-blue)" : "var(--surface-soft)",
									border: `1px solid ${r.isAdmin ? "var(--primary-blue-soft)" : "var(--line)"}`,
									borderRadius: "12px",
									p: 1.5,
								}}
							>
								<Typography sx={{ fontSize: 12, fontWeight: 800, color: "var(--ink)" }}>
									{r.authorDisplayName}
									{r.isAdmin ? " · admin" : ""}{" "}
									<Box component="span" sx={{ color: "var(--ink-mute)", fontWeight: 600 }}>
										· {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: fr })}
									</Box>
								</Typography>
								<Typography sx={{ fontSize: 13.5, color: "var(--ink)", mt: 0.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{r.body}</Typography>
							</Box>
						))}
					</Stack>
					<Stack spacing={1}>
						<TextField
							value={reply}
							onChange={(e) => setReply(e.target.value)}
							placeholder="Répondre au copropriétaire…"
							multiline
							minRows={2}
							fullWidth
							data-testid="admin-feedback-reply"
						/>
						<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
							<Button
								data-testid="admin-feedback-reply-send"
								variant="contained"
								startIcon={<Send />}
								onClick={() => void handleReply()}
								disabled={!reply.trim() || replyMutation.isPending}
							>
								Envoyer
							</Button>
						</Box>
						{replyMutation.isError && <Alert severity="error">Envoi de la réponse impossible.</Alert>}
					</Stack>
				</Box>

				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ borderTop: "1px solid var(--line)", pt: 2 }}>
					{feedback.status !== "Resolved" && (
						<Button
							variant="contained"
							color="secondary"
							startIcon={<CheckCircleOutline />}
							onClick={() => void handleStatus("Resolved")}
							disabled={updateMutation.isPending}
							sx={{ bgcolor: "var(--mint-soft)", color: "#047857", "&:hover": { bgcolor: "var(--mint-soft)" } }}
						>
							Marquer résolu
						</Button>
					)}
					{feedback.status !== "Discarded" && (
						<Button variant="outlined" startIcon={<DoNotDisturbAltOutlined />} onClick={() => void handleStatus("Discarded")} disabled={updateMutation.isPending}>
							Écarter
						</Button>
					)}
					{feedback.status !== "Open" && (
						<Button variant="outlined" startIcon={<ReplayOutlined />} onClick={() => void handleStatus("Open")} disabled={updateMutation.isPending}>
							Ré-ouvrir
						</Button>
					)}
					{updateMutation.isError && (
						<Typography variant="caption" sx={{ color: "var(--danger)", alignSelf: "center" }}>
							Mise à jour impossible.
						</Typography>
					)}
				</Stack>
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
