import { Box, Button, IconButton, LinearProgress, Stack, Tooltip, Typography } from "@mui/material";
import { AttachFile, Close, ErrorOutline, Image as ImageIcon, InsertDriveFile, PictureAsPdf, Send } from "@mui/icons-material";
import { EditorContent, ReactRenderer, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import type { Instance } from "tippy.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUsersQueries } from "@data/users/users.queries";
import type { Attachment, DirectoryUser } from "@apis/rest/api/generated";
import { attachmentsService, MAX_ATTACHMENT_SIZE_BYTES } from "@/core/services/attachments.service";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import { MentionList, type MentionListRef } from "./MentionList";

type Mentionable = { id: string; label: string };

type Props = {
	onSubmit: (payload: { html: string; attachments: Attachment[] }) => Promise<void> | void;
	disabled?: boolean;
	/** Initial HTML for edit mode. Empty string for a fresh composer. */
	initialHtml?: string;
	/** Label for the primary button. Defaults to "Envoyer". */
	submitLabel?: string;
	/** Placeholder shown when the editor is empty. */
	placeholder?: string;
	/** When provided, a "Cancel" button is rendered next to submit (used by edit mode). */
	onCancel?: () => void;
	/** When true, the editor clears itself after a successful submit (post mode). */
	clearOnSubmit?: boolean;
	/** Disables the attachment picker (used by edit mode where attachments are immutable). */
	allowAttachments?: boolean;
};

const EMPTY_USERS: DirectoryUser[] = [];

function deriveMentionables(users: DirectoryUser[]): Mentionable[] {
	return users.map((u) => ({ id: u.id, label: u.displayName }));
}

type PendingAttachment =
	| { kind: "uploading"; tempId: string; fileName: string; contentType: string; sizeBytes: number; progressRatio?: number }
	| { kind: "ready"; tempId: string; data: Attachment }
	| { kind: "error"; tempId: string; fileName: string; contentType: string; sizeBytes: number; message: string };

function formatBytes(size: number): string {
	if (size < 1024) return `${size} o`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`;
	return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function pickFileIcon(contentType: string) {
	if (contentType.startsWith("image/")) return <ImageIcon sx={{ fontSize: 18 }} />;
	if (contentType === "application/pdf") return <PictureAsPdf sx={{ fontSize: 18 }} />;
	return <InsertDriveFile sx={{ fontSize: 18 }} />;
}

/**
 * Tiptap-based WYSIWYG editor that emits sanitised HTML on submit. Includes basic
 * formatting, autolinks, `@mention` of users sourced from the Keycloak realm
 * directory, and an attachment tray backed by GridFS uploads.
 * Used for both new messages (post mode) and message edits (edit mode with cancel).
 * <kbd>Cmd/Ctrl+Enter</kbd> sends. Attachments are immutable on edit.
 */
export function MessageComposer({
	onSubmit,
	disabled,
	initialHtml = "",
	submitLabel = "Envoyer",
	placeholder = "Écrivez un message…",
	onCancel,
	clearOnSubmit = true,
	allowAttachments = true,
}: Props) {
	const { data: users = EMPTY_USERS } = useUsersQueries.list();
	const mentionables = useMemo(() => deriveMentionables(users), [users]);
	const [pending, setPending] = useState<PendingAttachment[]>([]);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	// Tiptap configures extensions once; ref keeps mentionables fresh without re-creating the editor.
	const mentionablesRef = useRef<Mentionable[]>(mentionables);
	useEffect(() => {
		mentionablesRef.current = mentionables;
	}, [mentionables]);

	const editor = useEditor({
		extensions: [
			StarterKit,
			Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
			Placeholder.configure({ placeholder }),
			Mention.configure({
				HTMLAttributes: { class: "mention" },
				renderHTML({ options, node }) {
					const id = node.attrs.id ?? "";
					const label = node.attrs.label ?? id;
					return [
						"span",
						{
							class: "mention",
							"data-mention-id": id,
							"data-mention-name": label,
						},
						`${options.suggestion.char}${label}`,
					];
				},
				suggestion: {
					char: "@",
					items: ({ query }: { query: string }) => mentionablesRef.current.filter((u) => u.label.toLowerCase().includes(query.toLowerCase())).slice(0, 6),
					render: () => {
						let component: ReactRenderer<MentionListRef> | null = null;
						let popup: Instance | null = null;
						return {
							onStart: async (props) => {
								component = new ReactRenderer(MentionList, {
									props,
									editor: props.editor,
								});
								if (!props.clientRect) return;
								const tippy = (await import("tippy.js")).default;
								popup = tippy(document.body, {
									getReferenceClientRect: props.clientRect as () => DOMRect,
									appendTo: () => document.body,
									content: component.element,
									showOnCreate: true,
									interactive: true,
									trigger: "manual",
									placement: "top-start",
								});
							},
							onUpdate: (props) => {
								component?.updateProps(props);
								if (props.clientRect) popup?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
							},
							onKeyDown: (props) => {
								if (props.event.key === "Escape") {
									popup?.hide();
									return true;
								}
								return component?.ref?.onKeyDown(props) ?? false;
							},
							onExit: () => {
								popup?.destroy();
								component?.destroy();
							},
						};
					},
				},
			}),
		],
		content: initialHtml,
	});

	// useEditor in @tiptap/react v3 does not re-render on every transaction. Subscribe explicitly
	// so the submit button reflects the current emptiness of the editor.
	const isEmpty = useEditorState({
		editor,
		selector: ({ editor: e }) => (e ? e.isEmpty : true),
	});

	const readyAttachments = useMemo(() => pending.filter((p): p is Extract<PendingAttachment, { kind: "ready" }> => p.kind === "ready"), [pending]);
	const isUploading = pending.some((p) => p.kind === "uploading");
	const canSubmit = !!editor && !disabled && !isUploading && (!isEmpty || readyAttachments.length > 0);

	const handleFiles = useCallback(async (files: FileList | File[]) => {
		const items = Array.from(files);
		if (!items.length) return;

		await Promise.all(
			items.map(async (file) => {
				const tempId = `pending-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
				if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
					setPending((prev) => [
						...prev,
						{ kind: "error", tempId, fileName: file.name, contentType: file.type, sizeBytes: file.size, message: "Fichier trop volumineux (max 25 Mo)." },
					]);
					return;
				}
				setPending((prev) => [...prev, { kind: "uploading", tempId, fileName: file.name, contentType: file.type, sizeBytes: file.size, progressRatio: 0 }]);
				try {
					const data = await attachmentsService.upload(file, {
						onProgress: ({ ratio }) => {
							setPending((prev) => prev.map((p) => (p.tempId === tempId && p.kind === "uploading" ? { ...p, progressRatio: ratio } : p)));
						},
					});
					setPending((prev) => prev.map((p) => (p.tempId === tempId ? { kind: "ready", tempId, data } : p)));
				} catch (e) {
					const message = extractApiError(e, "Téléversement impossible.");
					setPending((prev) =>
						prev.map((p) => (p.tempId === tempId ? { kind: "error", tempId, fileName: file.name, contentType: file.type, sizeBytes: file.size, message } : p)),
					);
				}
			}),
		);
	}, []);

	const removePending = useCallback((tempId: string) => {
		setPending((prev) => prev.filter((p) => p.tempId !== tempId));
	}, []);

	const submit = useCallback(async () => {
		if (!editor || disabled || isUploading) return;
		const html = editor.getHTML().trim();
		const attachments = readyAttachments.map((p) => p.data);
		const isHtmlEmpty = !html || editor.isEmpty;
		if (isHtmlEmpty && attachments.length === 0) return;
		await onSubmit({ html: isHtmlEmpty ? "" : html, attachments });
		if (clearOnSubmit) {
			editor.commands.clearContent();
			setPending([]);
		}
	}, [editor, onSubmit, disabled, clearOnSubmit, isUploading, readyAttachments]);

	const onDrop = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			if (!allowAttachments) return;
			event.preventDefault();
			const files = event.dataTransfer?.files;
			if (files && files.length > 0) void handleFiles(files);
		},
		[allowAttachments, handleFiles],
	);

	return (
		<Stack data-testid="message-composer" spacing={1.25}>
			<Box
				data-testid="message-composer-editor"
				onDragOver={(e) => {
					if (!allowAttachments) return;
					e.preventDefault();
				}}
				onDrop={onDrop}
				sx={{
					border: "1px solid var(--line)",
					borderRadius: "12px",
					bgcolor: "var(--surface)",
					px: 1.25,
					minHeight: 80,
					"& .ProseMirror": { outline: "none", minHeight: 60, fontSize: 14 },
					"& .ProseMirror p.is-editor-empty:first-child::before": {
						content: "attr(data-placeholder)",
						color: "var(--ink-mute)",
						float: "left",
						pointerEvents: "none",
						height: 0,
					},
					"& .mention": {
						bgcolor: "var(--surface-blue)",
						color: "var(--primary-blue)",
						borderRadius: "6px",
						padding: "0 4px",
						fontWeight: 700,
					},
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						void submit();
					}
				}}
			>
				<EditorContent editor={editor} />
			</Box>

			{pending.length > 0 && (
				<Box
					data-testid="message-composer-attachments"
					sx={{
						// Cap the tray so 20+ attachments can't push the editor / submit row off-screen.
						// ~3 cards visible (each ≈54px tall incl. gap) — beyond that, the tray scrolls
						// internally and the surrounding composer chrome stays put.
						maxHeight: 180,
						overflowY: "auto",
						pr: 0.5,
						display: "flex",
						flexDirection: "column",
						gap: 0.75,
						// Thin, theme-coherent scrollbar so the tray feels like a contained surface
						// rather than a runaway list.
						scrollbarWidth: "thin",
						scrollbarColor: "var(--line-strong) transparent",
						"&::-webkit-scrollbar": { width: 6 },
						"&::-webkit-scrollbar-thumb": { background: "var(--line-strong)", borderRadius: 3 },
						"&::-webkit-scrollbar-track": { background: "transparent" },
					}}
				>
					{pending.map((p) => (
						<PendingAttachmentCard key={p.tempId} pending={p} onRemove={() => removePending(p.tempId)} />
					))}
				</Box>
			)}

			<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
				{allowAttachments ? (
					<Tooltip title="Joindre des fichiers (max 25 Mo chacun)">
						<span>
							<IconButton data-testid="message-composer-attach" onClick={() => fileInputRef.current?.click()} disabled={disabled} aria-label="Joindre des fichiers">
								<AttachFile />
							</IconButton>
						</span>
					</Tooltip>
				) : (
					<Box />
				)}
				<input
					ref={fileInputRef}
					type="file"
					multiple
					hidden
					data-testid="message-composer-file-input"
					onChange={(e) => {
						if (e.target.files && e.target.files.length > 0) void handleFiles(e.target.files);
						e.target.value = "";
					}}
				/>
				<Stack direction="row" spacing={1}>
					{isUploading && <Typography sx={{ fontSize: 12, color: "var(--ink-mute)", alignSelf: "center" }}>Téléversement en cours…</Typography>}
					{onCancel && (
						<Button data-testid="message-composer-cancel" onClick={onCancel} variant="text" startIcon={<Close sx={{ fontSize: 16 }} />} disabled={disabled}>
							Annuler
						</Button>
					)}
					<Button data-testid="message-composer-submit" onClick={submit} variant="contained" startIcon={<Send sx={{ fontSize: 16 }} />} disabled={!canSubmit}>
						{submitLabel}
					</Button>
				</Stack>
			</Stack>
		</Stack>
	);
}

function PendingAttachmentCard({ pending, onRemove }: { pending: PendingAttachment; onRemove: () => void }) {
	const fileName = pending.kind === "ready" ? pending.data.fileName : pending.fileName;
	const contentType = pending.kind === "ready" ? pending.data.contentType : pending.contentType;
	const sizeBytes = pending.kind === "ready" ? pending.data.sizeBytes : pending.sizeBytes;
	const accent = pending.kind === "error" ? "var(--error-main, #d32f2f)" : pending.kind === "ready" ? "var(--primary-blue)" : "var(--ink-mute)";
	const ratio = pending.kind === "uploading" ? pending.progressRatio : pending.kind === "ready" ? 1 : 0;
	const progressLabel =
		pending.kind === "ready"
			? formatBytes(sizeBytes)
			: pending.kind === "uploading"
				? ratio !== undefined
					? `${Math.round(ratio * 100)} %`
					: "Préparation…"
				: pending.message;

	return (
		<Box
			data-testid={`message-composer-attachment-${pending.tempId}`}
			data-attachment-status={pending.kind}
			sx={{
				position: "relative",
				display: "flex",
				alignItems: "center",
				gap: 1,
				p: 1,
				pr: 1.25,
				borderRadius: "10px",
				border: "1px solid var(--line)",
				bgcolor: "var(--surface)",
				overflow: "hidden",
				minHeight: 40
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: 32,
					height: 32,
					borderRadius: "8px",
					bgcolor: pending.kind === "error" ? "rgba(211, 47, 47, 0.12)" : "var(--surface-blue)",
					color: accent,
					flexShrink: 0,
				}}
			>
				{pending.kind === "error" ? <ErrorOutline sx={{ fontSize: 18 }} /> : pickFileIcon(contentType)}
			</Box>
			<Stack sx={{ flex: 1, minWidth: 0 }}>
				<Typography
					sx={{
						fontSize: 13,
						fontWeight: 600,
						color: "var(--ink)",
						lineHeight: 1.2,
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}
				>
					{fileName}
				</Typography>
				<Typography sx={{ fontSize: 11, color: pending.kind === "error" ? accent : "var(--ink-mute)", lineHeight: 1.3 }}>{progressLabel}</Typography>
			</Stack>
			<IconButton
				data-testid={`message-composer-attachment-remove-${pending.tempId}`}
				size="small"
				onClick={onRemove}
				aria-label="Retirer la pièce jointe"
				sx={{ color: "var(--ink-mute)" }}
			>
				<Close sx={{ fontSize: 16 }} />
			</IconButton>
			{pending.kind === "uploading" && (
				<LinearProgress
					variant={ratio !== undefined ? "determinate" : "indeterminate"}
					value={ratio !== undefined ? Math.round(ratio * 100) : undefined}
					sx={{
						position: "absolute",
						left: 0,
						right: 0,
						bottom: 0,
						height: 2,
						bgcolor: "transparent",
						"& .MuiLinearProgress-bar": { bgcolor: "var(--primary-blue)" },
					}}
				/>
			)}
		</Box>
	);
}
