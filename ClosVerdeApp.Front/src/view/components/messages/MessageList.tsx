import { Avatar, Box, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { Bolt, MoreHoriz } from "@mui/icons-material";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { memo, useCallback, useState } from "react";
import type { Message } from "@/types/models";

type Props = {
	messages: readonly Message[];
	currentUserId?: string | null;
	onEdit: (message: Message) => void;
	onDelete: (message: Message) => void;
	/** Highlight the message currently being edited (if any). */
	editingMessageId?: string | null;
};

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

/**
 * Renders messages as bubbles with author avatar, timestamp, and the (already-sanitised)
 * HTML content. System messages get a distinct, muted styling. Edit/delete actions are
 * exposed to the author via an overflow menu.
 */
function MessageListImpl({ messages, currentUserId, onEdit, onDelete, editingMessageId }: Props) {
	const [anchorEl, setAnchorEl] = useState<null | { el: HTMLElement; message: Message }>(null);
	const closeMenu = useCallback(() => setAnchorEl(null), []);

	return (
		<Stack data-testid="message-list" spacing={1.25} sx={{ p: { xs: 1, sm: 2 } }}>
			{messages.map((m) => {
				const isMe = !!currentUserId && m.authorUserId === currentUserId;
				const isEditing = m.id === editingMessageId;

				if (m.isSystem) {
					return (
						<Stack
							key={m.id}
							data-testid={`message-${m.id}`}
							data-message-system="true"
							direction="row"
							spacing={1}
							alignItems="center"
							sx={{
								mx: "auto",
								maxWidth: "80%",
								px: 1.5,
								py: 0.75,
								borderRadius: 999,
								bgcolor: "rgba(245, 158, 11, 0.10)",
								border: "1px solid rgba(245, 158, 11, 0.25)",
								color: "#92400e",
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
						data-testid={`message-${m.id}`}
						data-message-deleted={m.isDeleted ? "true" : undefined}
						data-message-edited={m.editedAt && !m.isDeleted ? "true" : undefined}
						direction="row"
						spacing={1.25}
						alignItems="flex-start"
						sx={{
							p: isEditing ? 1 : 0,
							ml: isEditing ? -1 : 0,
							mr: isEditing ? -1 : 0,
							borderRadius: 1.5,
							bgcolor: isEditing ? "var(--surface-blue)" : "transparent",
							transition: "background-color 160ms ease",
						}}
					>
						<Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: isMe ? "var(--primary-blue)" : "var(--mint)" }}>{initialOf(m.authorDisplayName)}</Avatar>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 0.25 }}>
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
										sx={{ ml: "auto" }}
										aria-label="Actions sur ce message"
									>
										<MoreHoriz fontSize="inherit" />
									</IconButton>
								)}
							</Stack>
							{m.isDeleted ? (
								<Typography sx={{ fontStyle: "italic", color: "var(--ink-mute)", fontSize: 13 }}>Message supprimé</Typography>
							) : (
								<Box className="message-content" sx={messageContentSx} dangerouslySetInnerHTML={{ __html: m.contentHtml }} />
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
