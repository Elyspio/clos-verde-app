import { Box, Button, Stack } from "@mui/material";
import { Close, Send } from "@mui/icons-material";
import { EditorContent, ReactRenderer, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import type { Instance } from "tippy.js";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAppSelector } from "@/store";
import { selectUsers } from "@/store/modules/users/users.actions";
import type { DirectoryUser } from "@apis/rest/api/generated";
import { MentionList, type MentionListRef } from "./MentionList";

type Mentionable = { id: string; label: string };

type Props = {
	onSubmit: (html: string) => Promise<void> | void;
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
};

function deriveMentionables(users: DirectoryUser[]): Mentionable[] {
	return users.map((u) => ({ id: u.id, label: u.displayName }));
}

/**
 * Tiptap-based WYSIWYG editor that emits sanitised HTML on submit. Includes basic
 * formatting, autolinks, and `@mention` of users sourced from the Keycloak realm
 * directory (Redux `users` slice, populated at session start).
 * Used for both new messages (post mode) and message edits (edit mode with cancel).
 * <kbd>Cmd/Ctrl+Enter</kbd> sends.
 */
export function MessageComposer({ onSubmit, disabled, initialHtml = "", submitLabel = "Envoyer", placeholder = "Écrivez un message…", onCancel, clearOnSubmit = true }: Props) {
	const users = useAppSelector(selectUsers);
	const mentionables = useMemo(() => deriveMentionables(users), [users]);

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

	const submit = useCallback(async () => {
		if (!editor || disabled) return;
		const html = editor.getHTML().trim();
		if (!html || editor.isEmpty) return;
		await onSubmit(html);
		if (clearOnSubmit) editor.commands.clearContent();
	}, [editor, onSubmit, disabled, clearOnSubmit]);

	return (
		<Stack data-testid="message-composer" spacing={1.25}>
			<Box
				data-testid="message-composer-editor"
				sx={{
					border: "1px solid var(--line)",
					borderRadius: "12px",
					bgcolor: "var(--surface)",
					p: 1.25,
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
			<Stack direction="row" justifyContent="flex-end" spacing={1}>
				{onCancel && (
					<Button data-testid="message-composer-cancel" onClick={onCancel} variant="text" startIcon={<Close sx={{ fontSize: 16 }} />} disabled={disabled}>
						Annuler
					</Button>
				)}
				<Button
					data-testid="message-composer-submit"
					onClick={submit}
					variant="contained"
					startIcon={<Send sx={{ fontSize: 16 }} />}
					disabled={disabled || !editor || isEmpty}
				>
					{submitLabel}
				</Button>
			</Stack>
		</Stack>
	);
}
