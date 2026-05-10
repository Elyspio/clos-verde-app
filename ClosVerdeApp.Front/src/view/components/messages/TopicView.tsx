import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { DeleteOutline, Edit, NotificationsActive, NotificationsOff } from "@mui/icons-material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchMessages, postMessage, editMessage, deleteMessage, selectMessages, selectMessagesStatus } from "@/store/modules/messages/messages.actions";
import { selectTopicById, deleteTopic, renameTopic, markTopicRead } from "@/store/modules/topics/topics.actions";
import { muteTopic, selectIsTopicMuted, unmuteTopic } from "@/store/modules/notifications/notifications.actions";
import { setFocusedTopic } from "@/store/modules/unread/unread.actions";
import type { Message } from "@apis/rest/api/generated";
import { MessageComposer } from "./MessageComposer";
import { MessageList } from "./MessageList";
import { RenameTopicDialog } from "./RenameTopicDialog";
import { ConfirmDeleteTopicDialog } from "./ConfirmDeleteTopicDialog";

/**
 * Active topic pane: loads messages, marks them as read on arrival, hosts the composer
 * (in post or edit mode), and exposes rename/delete to the topic creator (Custom only).
 */
export function TopicView() {
	const { topicId } = useParams<{ topicId: string }>();
	const dispatch = useAppDispatch();
	const auth = useAuth();
	const navigate = useNavigate();
	const topic = useAppSelector((s) => selectTopicById(s, topicId));
	const messages = useAppSelector((s) => selectMessages(s, topicId));
	const status = useAppSelector((s) => selectMessagesStatus(s, topicId));
	const isMuted = useAppSelector((s) => selectIsTopicMuted(s, topicId));
	const userId = auth.user?.profile?.sub;
	const lastMarkedReadRef = useRef<{ topicId: string | null; at: string | null }>({ topicId: null, at: null });
	const [editingMessage, setEditingMessage] = useState<Message | null>(null);
	const [renameOpen, setRenameOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	useEffect(() => {
		if (!topicId) return;
		// Reset the per-topic mark-read tracker when switching topics.
		if (lastMarkedReadRef.current.topicId !== topicId) {
			lastMarkedReadRef.current = { topicId, at: null };
		}
		setEditingMessage(null);
		dispatch(setFocusedTopic(topicId));
		void dispatch(fetchMessages({ topicId }));
		return () => {
			dispatch(setFocusedTopic(null));
		};
	}, [dispatch, topicId]);

	useEffect(() => {
		if (!topicId || messages.length === 0) return;
		const lastAt = messages[messages.length - 1].createdAt;
		if (lastMarkedReadRef.current.topicId === topicId && lastMarkedReadRef.current.at === lastAt) return;
		lastMarkedReadRef.current = { topicId, at: lastAt };
		void dispatch(markTopicRead({ topicId, at: lastAt }));
	}, [dispatch, messages, topicId]);

	const isOwnerOfCustom = topic?.kind === "Custom" && !!userId && topic.createdByUserId === userId;

	const handleSend = useCallback(
		async (html: string) => {
			if (!topicId) return;
			await dispatch(postMessage({ topicId, contentHtml: html })).unwrap();
		},
		[dispatch, topicId],
	);

	const handleEditMessage = useCallback((m: Message) => {
		setEditingMessage(m);
	}, []);

	const handleDeleteMessage = useCallback(
		async (m: Message) => {
			await dispatch(deleteMessage(m.id));
		},
		[dispatch],
	);

	const handleSubmitEdit = useCallback(
		async (html: string) => {
			if (!editingMessage) return;
			await dispatch(editMessage({ id: editingMessage.id, contentHtml: html })).unwrap();
			setEditingMessage(null);
		},
		[dispatch, editingMessage],
	);

	const handleCancelEdit = useCallback(() => setEditingMessage(null), []);

	const handleRename = useCallback(
		async (name: string) => {
			if (!topic) return;
			await dispatch(renameTopic({ id: topic.id, name })).unwrap();
		},
		[dispatch, topic],
	);

	const handleConfirmDelete = useCallback(async () => {
		if (!topic) return;
		await dispatch(deleteTopic(topic.id)).unwrap();
		void navigate("/messages");
	}, [dispatch, navigate, topic]);

	const handleToggleMute = useCallback(async () => {
		if (!topic) return;
		await dispatch(isMuted ? unmuteTopic(topic.id) : muteTopic(topic.id)).unwrap();
	}, [dispatch, isMuted, topic]);

	if (!topic) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography color="text.secondary">Sélectionnez un topic pour voir les messages.</Typography>
			</Box>
		);
	}

	const composerKey = editingMessage ? `edit:${editingMessage.id}` : `post:${topic.id}`;

	return (
		<Box data-testid="topic-view" data-topic-id={topic.id} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ p: 2, borderBottom: "1px solid var(--line)" }}>
				<Box sx={{ minWidth: 0 }}>
					<Typography data-testid="topic-title" sx={{ fontWeight: 800, fontSize: 18 }}>
						{topic.name}
					</Typography>
					{topic.kind === "Reservation" && <Typography sx={{ fontSize: 11, color: "var(--ink-mute)" }}>Discussion liée à une réservation</Typography>}
				</Box>
				<Stack direction="row" spacing={1}>
					<Button
						data-testid="topic-mute-button"
						size="small"
						startIcon={isMuted ? <NotificationsActive fontSize="inherit" /> : <NotificationsOff fontSize="inherit" />}
						onClick={handleToggleMute}
					>
						{isMuted ? "Réactiver" : "Muter"}
					</Button>
					{isOwnerOfCustom && (
						<>
							<Button data-testid="topic-rename-button" size="small" startIcon={<Edit fontSize="inherit" />} onClick={() => setRenameOpen(true)}>
								Renommer
							</Button>
							<Button
								data-testid="topic-delete-button"
								size="small"
								color="error"
								startIcon={<DeleteOutline fontSize="inherit" />}
								onClick={() => setDeleteOpen(true)}
							>
								Supprimer
							</Button>
						</>
					)}
				</Stack>
			</Stack>
			<Box sx={{ flex: 1, overflowY: "auto", bgcolor: "var(--app-bg)" }}>
				{status === "loading" && messages.length === 0 ? (
					<Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
						<CircularProgress size={24} />
					</Box>
				) : (
					<MessageList
						messages={messages}
						currentUserId={userId}
						onEdit={handleEditMessage}
						onDelete={handleDeleteMessage}
						editingMessageId={editingMessage?.id ?? null}
					/>
				)}
				{messages.length === 0 && status === "ready" && (
					<Typography sx={{ textAlign: "center", color: "var(--ink-mute)", py: 4, fontSize: 13 }}>Aucun message pour l'instant.</Typography>
				)}
			</Box>
			<Box sx={{ p: 2, borderTop: "1px solid var(--line)", bgcolor: "var(--surface)" }}>
				{editingMessage && (
					<Alert data-testid="message-edit-banner" severity="info" sx={{ mb: 1.25 }}>
						Vous modifiez votre message.
					</Alert>
				)}
				<MessageComposer
					key={composerKey}
					initialHtml={editingMessage?.contentHtml ?? ""}
					onSubmit={editingMessage ? handleSubmitEdit : handleSend}
					onCancel={editingMessage ? handleCancelEdit : undefined}
					submitLabel={editingMessage ? "Enregistrer" : "Envoyer"}
					placeholder={editingMessage ? "Modifier le message…" : "Écrivez un message…"}
					clearOnSubmit={!editingMessage}
				/>
			</Box>
			<RenameTopicDialog open={renameOpen} currentName={topic.name} onClose={() => setRenameOpen(false)} onSubmit={handleRename} />
			<ConfirmDeleteTopicDialog open={deleteOpen} topicName={topic.name} onClose={() => setDeleteOpen(false)} onConfirm={handleConfirmDelete} />
		</Box>
	);
}
