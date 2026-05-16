import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { DeleteOutline, Edit, NotificationsActive, NotificationsOff } from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate, useParams } from "react-router-dom";
import { useClientStore } from "@data/client/clientStore";
import { useMessagesQueries } from "@data/messages/messages.queries";
import { useMessagesMutations } from "@data/messages/messages.mutations";
import { useTopicsQueries } from "@data/topics/topics.queries";
import { useTopicsMutations } from "@data/topics/topics.mutations";
import type { Attachment, Message } from "@apis/rest/api/generated";
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
	const auth = useAuth();
	const navigate = useNavigate();
	const hash = useUrlHash();
	const highlightedMessageId = useMemo(() => {
		const match = /^#message-(.+)$/.exec(hash);
		return match ? match[1] : null;
	}, [hash]);
	const topic = useTopicsQueries.byId(topicId);
	const topicDetails = useTopicsQueries.details(topicId);
	const { messages, isLoading } = useMessagesQueries.list(topicId);
	const isMuted = useTopicsQueries.isMuted(topicId);
	const userId = auth.user?.profile?.sub;
	const lastMarkedReadRef = useRef<{ topicId: string | null; at: string | null }>({ topicId: null, at: null });
	// Captured *before* auto-markRead runs so the initial scroll target reflects the user's
	// real last-read position. Stored as state (not a ref) so React re-renders downstream
	// memos when capture lands on a render where messages had not yet loaded.
	const [capturedLastReadAt, setCapturedLastReadAt] = useState<{ topicId: string; at: string | null } | null>(null);
	const [editingMessage, setEditingMessage] = useState<Message | null>(null);
	const [renameOpen, setRenameOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const initialScrollMessageId = useMemo(() => {
		if (highlightedMessageId) return null; // notification takes precedence
		if (!topicId || messages.length === 0) return null;
		if (capturedLastReadAt?.topicId !== topicId) return null;
		const lastReadAt = capturedLastReadAt.at;
		if (!lastReadAt) return messages[messages.length - 1].id; // never visited → bottom
		const firstUnread = messages.find((m) => new Date(m.createdAt).getTime() > new Date(lastReadAt).getTime());
		return firstUnread ? firstUnread.id : messages[messages.length - 1].id;
	}, [highlightedMessageId, messages, topicId, capturedLastReadAt]);

	const postMutation = useMessagesMutations.post(topicId ?? "");
	const editMutation = useMessagesMutations.edit();
	const deleteMessageMutation = useMessagesMutations.delete();
	const renameMutation = useTopicsMutations.rename();
	const deleteTopicMutation = useTopicsMutations.delete();
	const muteMutation = useTopicsMutations.mute();
	const unmuteMutation = useTopicsMutations.unmute();
	const markReadMutation = useTopicsMutations.markRead();

	useEffect(() => {
		if (!topicId) return;
		if (lastMarkedReadRef.current.topicId !== topicId) {
			lastMarkedReadRef.current = { topicId, at: null };
		}
		setEditingMessage(null);
		useClientStore.getState().setFocusedTopic(topicId);
		return () => {
			useClientStore.getState().clearFocusedTopicIf(topicId);
		};
	}, [topicId]);

	// Capture the user's last-read timestamp the first time `topicDetails` is available
	// for this topic. Declared BEFORE the markRead effect so it lands first on the same
	// render — and even if it didn't, `markRead` is async so the optimistic patch can't
	// race past us within a single tick.
	useEffect(() => {
		if (!topicId || !topicDetails) return;
		setCapturedLastReadAt((prev) => (prev?.topicId === topicId ? prev : { topicId, at: topicDetails.lastReadAt ?? null }));
	}, [topicId, topicDetails]);

	useEffect(() => {
		if (!topicId || messages.length === 0) return;
		// Hold off marking the topic as read until we have snapshotted the original
		// `lastReadAt`; otherwise the optimistic cache patch overwrites it before we
		// can compute the initial scroll target.
		if (capturedLastReadAt?.topicId !== topicId) return;
		const lastAt = messages[messages.length - 1].createdAt;
		if (lastMarkedReadRef.current.topicId === topicId && lastMarkedReadRef.current.at === lastAt) return;
		lastMarkedReadRef.current = { topicId, at: lastAt };
		markReadMutation.mutate({ topicId, at: lastAt });
	}, [markReadMutation, messages, topicId, capturedLastReadAt]);

	const isOwnerOfCustom = topic?.kind === "Custom" && !!userId && topic.createdByUserId === userId;

	const handleSend = async ({ html, attachments }: { html: string; attachments: Attachment[] }) => {
		if (!topicId) return;
		await postMutation.mutateAsync({ contentHtml: html, attachments });
	};

	const handleEditMessage = useCallback((m: Message) => {
		setEditingMessage(m);
	}, []);

	const handleDeleteMessage = useCallback(
		async (m: Message) => {
			await deleteMessageMutation.mutateAsync(m.id);
		},
		[deleteMessageMutation],
	);

	const handleSubmitEdit = async ({ html }: { html: string }) => {
		if (!editingMessage) return;
		await editMutation.mutateAsync({ id: editingMessage.id, contentHtml: html });
		setEditingMessage(null);
	};

	const handleCancelEdit = useCallback(() => setEditingMessage(null), []);

	const handleRename = useCallback(
		async (name: string) => {
			if (!topic) return;
			await renameMutation.mutateAsync({ id: topic.id, name });
		},
		[renameMutation, topic],
	);

	const handleConfirmDelete = useCallback(async () => {
		if (!topic) return;
		await deleteTopicMutation.mutateAsync(topic.id);
		void navigate("/messages");
	}, [deleteTopicMutation, navigate, topic]);

	const handleToggleMute = useCallback(async () => {
		if (!topic) return;
		if (isMuted) await unmuteMutation.mutateAsync(topic.id);
		else await muteMutation.mutateAsync(topic.id);
	}, [isMuted, muteMutation, topic, unmuteMutation]);

	if (!topic) {
		return (
			<Box sx={{ p: 3 }}>
				<Typography color="text.secondary">Sélectionnez un topic pour voir les messages.</Typography>
			</Box>
		);
	}

	const composerKey = editingMessage ? `edit:${editingMessage.id}` : `post:${topic.id}`;

	return (
		<Box data-testid="topic-view" data-topic-id={topic.id} sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
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
			<Box data-message-scroll-root="true" sx={{ flex: 1, minHeight: 0, overflowY: "auto", bgcolor: "var(--app-bg)" }}>
				{isLoading && messages.length === 0 ? (
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
						highlightedMessageId={highlightedMessageId}
						initialScrollMessageId={initialScrollMessageId}
					/>
				)}
				{messages.length === 0 && !isLoading && (
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
					allowAttachments={!editingMessage}
				/>
			</Box>
			<RenameTopicDialog open={renameOpen} currentName={topic.name} onClose={() => setRenameOpen(false)} onSubmit={handleRename} />
			<ConfirmDeleteTopicDialog open={deleteOpen} topicName={topic.name} onClose={() => setDeleteOpen(false)} onConfirm={handleConfirmDelete} />
		</Box>
	);
}

/**
 * Tracks `window.location.hash` reactively. We can't rely on `useLocation().hash` from
 * react-router-dom's `BrowserRouter` because it only listens to `popstate`, not `hashchange`.
 * The push notification service worker calls `client.navigate(url)` which, for a same-path
 * URL with a different hash, fires only `hashchange`.
 */
function useUrlHash(): string {
	const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));
	useEffect(() => {
		const onChange = () => setHash(window.location.hash);
		window.addEventListener("hashchange", onChange);
		return () => window.removeEventListener("hashchange", onChange);
	}, []);
	return hash;
}
