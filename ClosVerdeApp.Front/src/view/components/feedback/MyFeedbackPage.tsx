import { Alert, Box, Button, Chip, Container, Drawer, IconButton, Pagination, Skeleton, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import { AttachFile, CheckCircleOutline, Close, HistoryOutlined, InboxOutlined, OpenInNewOutlined } from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";
import type { Feedback, FeedbackCategory, FeedbackStatus } from "@apis/rest/api/generated";
import { useFeedbackMutations } from "@data/feedback/feedback.mutations";
import { useFeedbackQueries } from "@data/feedback/feedback.queries";
import { downloadWithAuth } from "@data/messages/attachments.hooks";
import { CATEGORY_META } from "./categoryMeta";

const PAGE_SIZE = 10;
const OPEN_STATUSES: FeedbackStatus[] = ["Open"];
const HISTORY_STATUSES: FeedbackStatus[] = ["Resolved", "Discarded"];

type TicketTab = "open" | "history";

export function MyFeedbackPage() {
	const [tab, setTab] = useState<TicketTab>("open");
	const [page, setPage] = useState(1);
	const [selected, setSelected] = useState<Feedback | null>(null);
	const statuses = tab === "open" ? OPEN_STATUSES : HISTORY_STATUSES;
	const listQuery = useFeedbackQueries.mine({ status: statuses, page, pageSize: PAGE_SIZE });

	const totalPages = useMemo(() => Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / PAGE_SIZE)), [listQuery.data?.total]);
	const tickets = listQuery.data?.items ?? [];

	return (
		<Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2.5, md: 5 } }}>
			<Stack spacing={3} data-testid="my-feedback-page">
				<Stack spacing={0.75}>
					<Typography variant="h2">Mes tickets</Typography>
					<Typography variant="body1" color="text.secondary">
						Suivez vos retours envoyés à l'équipe et clôturez ceux qui sont terminés.
					</Typography>
				</Stack>

				<Box sx={{ borderBottom: "1px solid var(--line)" }}>
					<Tabs
						value={tab}
						onChange={(_, value: TicketTab) => {
							setTab(value);
							setPage(1);
							setSelected(null);
						}}
						variant="scrollable"
						scrollButtons={false}
						aria-label="Filtres des tickets"
					>
						<Tab value="open" label="En cours" sx={{ textTransform: "none", fontWeight: 800 }} />
						<Tab value="history" label="Historique" sx={{ textTransform: "none", fontWeight: 800 }} />
					</Tabs>
				</Box>

				{listQuery.isError && <Alert severity="error">Chargement des tickets impossible.</Alert>}

				{listQuery.isPending ? (
					<TicketSkeletonList />
				) : tickets.length === 0 ? (
					<EmptyTickets tab={tab} />
				) : (
					<Stack spacing={1}>
						{tickets.map((ticket) => (
							<TicketRow key={ticket.id} ticket={ticket} onSelect={() => setSelected(ticket)} />
						))}
					</Stack>
				)}

				{totalPages > 1 && (
					<Stack alignItems="center">
						<Pagination count={totalPages} page={page} onChange={(_, next) => setPage(next)} color="primary" />
					</Stack>
				)}
			</Stack>

			<MyFeedbackDrawer feedback={selected} onClose={() => setSelected(null)} onUpdated={setSelected} />
		</Container>
	);
}

function TicketRow({ ticket, onSelect }: { ticket: Feedback; onSelect: () => void }) {
	const meta = CATEGORY_META[ticket.category];
	const Icon = meta.icon;
	return (
		<Box
			component="button"
			type="button"
			data-testid={`my-feedback-row-${ticket.id}`}
			onClick={onSelect}
			sx={{
				all: "unset",
				boxSizing: "border-box",
				width: "100%",
				display: "grid",
				gridTemplateColumns: { xs: "1fr", sm: "auto 1fr auto" },
				gap: { xs: 1.25, sm: 1.75 },
				alignItems: "center",
				p: { xs: 1.5, md: 1.75 },
				border: "1px solid var(--line)",
				borderRadius: "12px",
				bgcolor: "var(--surface)",
				cursor: "pointer",
				transition: "transform 160ms ease, border-color 160ms ease, background-color 160ms ease",
				"&:hover": { borderColor: "var(--primary-blue)", bgcolor: "var(--surface-blue)" },
				"&:active": { transform: "translateY(1px)" },
				"&:focus-visible": { outline: "2px solid var(--primary-blue)", outlineOffset: 2 },
			}}
		>
			<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
				<Chip
					icon={<Icon sx={{ fontSize: 14 }} />}
					label={meta.label}
					size="small"
					sx={{ bgcolor: meta.accentSoft, color: meta.accent, fontWeight: 700, "& .MuiChip-icon": { color: meta.accent } }}
				/>
				<StatusChip status={ticket.status} />
			</Stack>
			<Stack spacing={0.35} sx={{ minWidth: 0 }}>
				<Typography sx={{ color: "var(--ink)", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticket.title}</Typography>
				<Typography
					variant="body2"
					sx={{
						color: "var(--ink-soft)",
						display: "-webkit-box",
						WebkitLineClamp: 1,
						WebkitBoxOrient: "vertical",
						overflow: "hidden",
					}}
				>
					{ticket.body}
				</Typography>
			</Stack>
			<Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: "space-between", sm: "flex-end" }}>
				{ticket.attachments.length > 0 && <AttachmentCount count={ticket.attachments.length} />}
				<Typography variant="caption" sx={{ color: "var(--ink-mute)", whiteSpace: "nowrap" }}>
					{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: fr })}
				</Typography>
			</Stack>
		</Box>
	);
}

function MyFeedbackDrawer({ feedback, onClose, onUpdated }: { feedback: Feedback | null; onClose: () => void; onUpdated: (next: Feedback) => void }) {
	const closeMutation = useFeedbackMutations.closeMine();

	const closeTicket = async () => {
		if (!feedback) return;
		const updated = await closeMutation.mutateAsync(feedback.id);
		onUpdated(updated);
	};

	return (
		<Drawer anchor="right" open={!!feedback} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: "100%", sm: 540 }, p: 3 } } }} data-testid="my-feedback-drawer">
			{feedback && (
				<Stack spacing={2.5}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Typography variant="overline">Ticket</Typography>
						<IconButton size="small" onClick={onClose} aria-label="Fermer" sx={{ color: "var(--ink-soft)" }}>
							<Close />
						</IconButton>
					</Stack>

					<Stack spacing={1}>
						<Typography variant="h4">{feedback.title}</Typography>
						<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
							<CategoryChip category={feedback.category} />
							<StatusChip status={feedback.status} />
						</Stack>
						<Typography variant="caption" sx={{ color: "var(--ink-mute)" }}>
							Envoyé {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true, locale: fr })}
							{feedback.resolvedAt ? ` · clôturé ${formatDistanceToNow(new Date(feedback.resolvedAt), { addSuffix: true, locale: fr })}` : ""}
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
							lineHeight: 1.55,
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
									endIcon={<OpenInNewOutlined sx={{ fontSize: 16 }} />}
									onClick={() => void downloadWithAuth(attachment.downloadUrl, attachment.fileName)}
									sx={{ justifyContent: "space-between", textTransform: "none", borderRadius: "10px" }}
								>
									{attachment.fileName}
								</Button>
							))}
						</Stack>
					)}

					{feedback.context && (feedback.context.url || feedback.context.appVersion) && (
						<Stack spacing={0.5}>
							<Typography variant="overline">Contexte</Typography>
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
						</Stack>
					)}

					{feedback.replies.length > 0 && (
						<Stack spacing={1} data-testid="my-feedback-replies">
							<Typography variant="overline">Réponse de l'équipe</Typography>
							{feedback.replies.map((reply) => (
								<Box key={reply.id} sx={{ bgcolor: "var(--surface-blue)", border: "1px solid var(--primary-blue-soft)", borderRadius: "12px", p: 1.5 }}>
									<Typography sx={{ fontSize: 12, fontWeight: 800, color: "var(--ink)" }}>
										{reply.authorDisplayName}{" "}
										<Box component="span" sx={{ color: "var(--ink-mute)", fontWeight: 600 }}>
											· {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: fr })}
										</Box>
									</Typography>
									<Typography sx={{ fontSize: 13.5, color: "var(--ink)", mt: 0.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{reply.body}</Typography>
								</Box>
							))}
						</Stack>
					)}

					{feedback.status === "Open" && (
						<Stack spacing={1}>
							<Button
								variant="contained"
								startIcon={<CheckCircleOutline />}
								onClick={() => void closeTicket()}
								disabled={closeMutation.isPending}
								data-testid="my-feedback-close-ticket"
								sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 800 }}
							>
								{closeMutation.isPending ? "Clôture…" : "Clore le ticket"}
							</Button>
							{closeMutation.isError && <Alert severity="error">Clôture impossible. Veuillez réessayer.</Alert>}
						</Stack>
					)}
				</Stack>
			)}
		</Drawer>
	);
}

function TicketSkeletonList() {
	return (
		<Stack spacing={1} data-testid="my-feedback-loading">
			{[0, 1, 2, 3].map((i) => (
				<Box key={i} sx={{ p: 1.75, border: "1px solid var(--line)", borderRadius: "12px", bgcolor: "var(--surface)" }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<Skeleton variant="rounded" width={86} height={24} />
						<Skeleton variant="rounded" width={72} height={24} />
					</Stack>
					<Skeleton variant="text" sx={{ mt: 1, fontSize: "1.1rem", maxWidth: 520 }} />
					<Skeleton variant="text" sx={{ fontSize: "0.9rem", maxWidth: 680 }} />
				</Box>
			))}
		</Stack>
	);
}

function EmptyTickets({ tab }: { tab: TicketTab }) {
	const isOpen = tab === "open";
	return (
		<Stack
			alignItems="center"
			spacing={1.5}
			sx={{ py: 7, px: 2, border: "1px solid var(--line)", borderRadius: "12px", bgcolor: "var(--surface)" }}
			data-testid="my-feedback-empty"
		>
			<Box sx={{ width: 42, height: 42, borderRadius: "12px", display: "grid", placeItems: "center", bgcolor: "var(--surface-soft)", color: "var(--ink-soft)" }}>
				{isOpen ? <InboxOutlined /> : <HistoryOutlined />}
			</Box>
			<Typography variant="h5" sx={{ color: "var(--ink)", textAlign: "center" }}>
				{isOpen ? "Aucun ticket en cours." : "Aucun ticket dans l'historique."}
			</Typography>
			<Typography variant="body2" sx={{ color: "var(--ink-soft)", textAlign: "center", maxWidth: 420 }}>
				{isOpen ? "Les retours envoyés apparaîtront ici tant qu'ils ne sont pas clôturés." : "Les tickets clôturés ou écartés seront visibles ici."}
			</Typography>
		</Stack>
	);
}

function CategoryChip({ category }: { category: FeedbackCategory }) {
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

function StatusChip({ status }: { status: FeedbackStatus }) {
	const config: Record<FeedbackStatus, { label: string; color: string; bg: string }> = {
		Open: { label: "En cours", color: "var(--primary-blue)", bg: "var(--primary-blue-soft)" },
		Resolved: { label: "Clôturé", color: "#047857", bg: "var(--mint-soft)" },
		Discarded: { label: "Écarté", color: "var(--ink-soft)", bg: "var(--surface-soft)" },
	};
	const c = config[status];
	return <Chip label={c.label} size="small" sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700 }} />;
}

function AttachmentCount({ count }: { count: number }) {
	return (
		<Tooltip title={`${count} pièce${count > 1 ? "s" : ""} jointe${count > 1 ? "s" : ""}`}>
			<Chip icon={<AttachFile sx={{ fontSize: 14 }} />} label={count} size="small" sx={{ bgcolor: "var(--surface-soft)", color: "var(--ink-soft)", fontWeight: 700 }} />
		</Tooltip>
	);
}
