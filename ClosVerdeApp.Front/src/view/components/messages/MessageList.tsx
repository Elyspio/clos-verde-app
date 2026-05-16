import { Avatar, Box, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { Bolt, MoreHoriz } from "@mui/icons-material";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@apis/rest/api/generated";

type Props = {
	messages: readonly Message[];
	currentUserId?: string | null;
	onEdit: (message: Message) => void;
	onDelete: (message: Message) => void;
	/** Highlight the message currently being edited (if any). */
	editingMessageId?: string | null;
	/** Message id to scroll to AND flash with an orange highlight (e.g. push notification click). */
	highlightedMessageId?: string | null;
	/** Message id to scroll to silently on first render (e.g. first unread on topic open). */
	initialScrollMessageId?: string | null;
};

const HIGHLIGHT_DURATION_MS = 2500;
const SCROLL_RETRY_LIMIT = 20;

function initialOf(name: string) {
	return name.trim().slice(0, 1).toUpperCase() || "?";
}

const messageContentSx = {
	fontSize: 14,
	color: "var(--ink)",
	"& p": { my: 0.25 },
	"& a": { color: "var(--primary-blue)" },
	"& blockquote": { borderLeft: "3px solid var(--line)", pl: 1.25, color: "var(--ink-soft)", my: 0.5 },
	"& .mention": {
		bgcolor: "var(--surface-blue)",
		color: "var(--primary-blue)",
		borderRadius: "6px",
		padding: "0 4px",
		fontWeight: 700,
	},
	"& code": { bgcolor: "var(--surface-soft)", px: 0.5, borderRadius: 0.75 },
	"& pre": { bgcolor: "var(--surface-soft)", p: 1, borderRadius: 1.5 },
} as const;

function scrollMessageIntoContainer(node: HTMLDivElement, behavior: ScrollBehavior) {
	const container = node.closest<HTMLElement>('[data-message-scroll-root="true"]');
	if (!container) {
		node.scrollIntoView({ block: "center", behavior });
		return;
	}

	const containerRect = container.getBoundingClientRect();
	const nodeRect = node.getBoundingClientRect();
	const top = container.scrollTop + (nodeRect.top - containerRect.top) - container.clientHeight / 2 + nodeRect.height / 2;
	container.scrollTo({ top: Math.max(0, top), behavior });
}

function scheduleMessageScroll(node: HTMLDivElement, behavior: ScrollBehavior, onScrolled?: () => void) {
	let innerRaf = 0;
	const outerRaf = requestAnimationFrame(() => {
		innerRaf = requestAnimationFrame(() => {
			scrollMessageIntoContainer(node, behavior);
			onScrolled?.();
		});
	});

	return () => {
		cancelAnimationFrame(outerRaf);
		cancelAnimationFrame(innerRaf);
	};
}

/**
 * Renders messages as bubbles with author avatar, timestamp, and the (already-sanitised)
 * HTML content. System messages get a distinct, muted styling. Edit/delete actions are
 * exposed to the author via an overflow menu.
 */
function MessageListImpl({ messages, currentUserId, onEdit, onDelete, editingMessageId, highlightedMessageId, initialScrollMessageId }: Props) {
	const [anchorEl, setAnchorEl] = useState<null | { el: HTMLElement; message: Message }>(null);
	const closeMenu = useCallback(() => setAnchorEl(null), []);

	// Per-message DOM refs, keyed by message id. Using a Map (rather than a single ref) makes
	// scroll/highlight robust across re-renders and across switches between targets.
	const itemRefs = useRef(new Map<string, HTMLDivElement>());
	const setItemRef = useCallback(
		(id: string) => (el: HTMLDivElement | null) => {
			if (el) itemRefs.current.set(id, el);
			else itemRefs.current.delete(id);
		},
		[],
	);

	const [flashingId, setFlashingId] = useState<string | null>(null);
	const initialScrollDoneRef = useRef<string | null>(null);

	// Notification highlight: scroll + orange flash that fades out.
	useEffect(() => {
		if (!highlightedMessageId) return;
		if (!messages.some((m) => m.id === highlightedMessageId)) return;
		const node = itemRefs.current.get(highlightedMessageId);
		if (!node) return;
		const cancelScroll = scheduleMessageScroll(node, "smooth");
		setFlashingId(highlightedMessageId);
		const t = window.setTimeout(() => setFlashingId(null), HIGHLIGHT_DURATION_MS);
		return () => {
			cancelScroll();
			window.clearTimeout(t);
		};
	}, [highlightedMessageId, messages]);

	// Silent initial scroll to the first unread message (or last) when the topic opens.
	// Runs once per `initialScrollMessageId` value; the notification highlight takes priority.
	useEffect(() => {
		if (highlightedMessageId) return;
		if (!initialScrollMessageId) return;
		if (initialScrollDoneRef.current === initialScrollMessageId) return;
		let cancelled = false;
		let cancelScroll: () => void = () => undefined;
		let attempts = 0;
		const tryScroll = () => {
			if (cancelled) return;
			const node = itemRefs.current.get(initialScrollMessageId);
			if (node) {
				cancelScroll = scheduleMessageScroll(node, "auto", () => {
					initialScrollDoneRef.current = initialScrollMessageId;
				});
				return;
			}
			if (attempts >= SCROLL_RETRY_LIMIT) return;
			attempts += 1;
			window.setTimeout(tryScroll, 50);
		};
		tryScroll();
		return () => {
			cancelled = true;
			cancelScroll();
		};
	}, [initialScrollMessageId, highlightedMessageId, messages]);

	return (
		<Stack data-testid="message-list" spacing={1.25} sx={{ p: { xs: 1, sm: 2 } }}>
			{messages.map((m) => {
				const isMe = !!currentUserId && m.authorUserId === currentUserId;
				const isEditing = m.id === editingMessageId;
				const isFlashing = m.id === flashingId;

				if (m.isSystem) {
					return (
						<Stack
							key={m.id}
							ref={setItemRef(m.id)}
							data-testid={`message-${m.id}`}
							data-message-system="true"
							data-message-highlighted={isFlashing ? "true" : undefined}
							direction="row"
							spacing={1}
							alignItems="center"
							sx={{
								mx: "auto",
								maxWidth: "80%",
								px: 1.5,
								py: 0.75,
								borderRadius: 999,
								bgcolor: isFlashing ? "rgba(245, 158, 11, 0.35)" : "rgba(245, 158, 11, 0.10)",
								border: "1px solid rgba(245, 158, 11, 0.25)",
								color: "#92400e",
								transition: "background-color 400ms ease",
							}}
						>
							<Bolt sx={{ fontSize: 14, opacity: 0.75 }} />
							<Box
								className="message-content"
								sx={{
									...messageContentSx,
									flex: 1,
									minWidth: 0,
									fontSize: 12.5,
									color: "#7c2d12",
									"& p": { my: 0 },
									"& blockquote": { borderLeftColor: "rgba(245, 158, 11, 0.5)", color: "#92400e", my: 0.25 },
								}}
								dangerouslySetInnerHTML={{ __html: m.contentHtml }}
							/>
							<Typography sx={{ fontSize: 10, color: "#b45309", flexShrink: 0 }}>{format(new Date(m.createdAt), "dd/MM HH:mm", { locale: fr })}</Typography>
						</Stack>
					);
				}

				return (
					<Stack
						key={m.id}
						ref={setItemRef(m.id)}
						data-testid={`message-${m.id}`}
						data-message-deleted={m.isDeleted ? "true" : undefined}
						data-message-edited={m.editedAt && !m.isDeleted ? "true" : undefined}
						data-message-mine={isMe ? "true" : undefined}
						data-message-highlighted={isFlashing ? "true" : undefined}
						direction={isMe ? "row-reverse" : "row"}
						spacing={1.25}
						alignItems="flex-start"
						sx={{
							alignSelf: isMe ? "flex-end" : "flex-start",
							maxWidth: { xs: "92%", sm: "85%" },
							p: isFlashing || isEditing ? 1 : 0,
							ml: isFlashing || isEditing ? -1 : 0,
							mr: isFlashing || isEditing ? -1 : 0,
							borderRadius: 1.5,
							bgcolor: isFlashing ? "rgba(245, 158, 11, 0.30)" : isEditing ? "var(--surface-blue)" : "transparent",
							boxShadow: isFlashing ? "0 0 0 2px rgba(245, 158, 11, 0.55)" : "none",
							transition: "background-color 400ms ease, box-shadow 400ms ease",
						}}
					>
						<Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: isMe ? "var(--primary-blue)" : "var(--mint)" }}>{initialOf(m.authorDisplayName)}</Avatar>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Stack direction={isMe ? "row-reverse" : "row"} spacing={1} alignItems="baseline" sx={{ mb: 0.25 }}>
								<Typography sx={{ fontWeight: 700, fontSize: 13 }}>{m.authorDisplayName}</Typography>
								<Typography sx={{ fontSize: 11, color: "var(--ink-mute)" }}>
									{format(new Date(m.createdAt), "dd/MM HH:mm", { locale: fr })}
									{m.editedAt && !m.isDeleted ? " · modifié" : ""}
								</Typography>
								{isMe && !m.isDeleted && (
									<IconButton
										data-testid={`message-actions-${m.id}`}
										size="small"
										onClick={(e) => setAnchorEl({ el: e.currentTarget, message: m })}
										sx={{ mr: "auto" }}
										aria-label="Actions sur ce message"
									>
										<MoreHoriz fontSize="inherit" />
									</IconButton>
								)}
							</Stack>
							{m.isDeleted ? (
								<Typography sx={{ fontStyle: "italic", color: "var(--ink-mute)", fontSize: 13, textAlign: isMe ? "right" : "left" }}>Message supprimé</Typography>
							) : (
								<Box
									className="message-content"
									sx={{ ...messageContentSx, textAlign: isMe ? "right" : "left" }}
									dangerouslySetInnerHTML={{ __html: m.contentHtml }}
								/>
							)}
						</Box>
					</Stack>
				);
			})}
			<Menu anchorEl={anchorEl?.el ?? null} open={!!anchorEl} onClose={closeMenu}>
				<MenuItem
					data-testid="message-menu-edit"
					onClick={() => {
						if (anchorEl) onEdit(anchorEl.message);
						closeMenu();
					}}
				>
					Modifier
				</MenuItem>
				<MenuItem
					data-testid="message-menu-delete"
					onClick={() => {
						if (anchorEl) onDelete(anchorEl.message);
						closeMenu();
					}}
				>
					Supprimer
				</MenuItem>
			</Menu>
		</Stack>
	);
}

export const MessageList = memo(MessageListImpl);
