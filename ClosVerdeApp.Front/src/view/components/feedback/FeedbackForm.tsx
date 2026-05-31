import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	IconButton,
	LinearProgress,
	Stack,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { ArrowBack, AttachFile, Close, ErrorOutline, ExpandMore, Image as ImageIcon, InsertDriveFile, PictureAsPdf, SendOutlined } from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import type { Attachment, FeedbackCategory } from "@apis/rest/api/generated";
import { attachmentsService, MAX_ATTACHMENT_SIZE_BYTES } from "@/core/services/attachments.service";
import { CATEGORY_META, type CategoryMeta } from "./categoryMeta";

const TITLE_MAX = 120;
const BODY_MAX = 4000;
const MAX_ATTACHMENTS = 3;

type PendingAttachment =
	| { kind: "uploading"; tempId: string; fileName: string; contentType: string; sizeBytes: number; progressRatio?: number }
	| { kind: "ready"; tempId: string; data: Attachment }
	| { kind: "error"; tempId: string; fileName: string; contentType: string; sizeBytes: number; message: string };

type Props = {
	category: FeedbackCategory;
	onBack: () => void;
	onSubmit: (payload: { title: string; body: string; attachmentIds: string[] }) => Promise<void>;
	submitError: string | null;
	isSubmitting: boolean;
};

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
 * Step 2 of the feedback flow. Inline-state form (no react-hook-form) mirroring the
 * NewTopicDialog pattern; attachments reuse the same upload service as the message
 * composer so the backend only has one bucket to maintain.
 */
export function FeedbackForm({ category, onBack, onSubmit, submitError, isSubmitting }: Props) {
	const meta = CATEGORY_META[category];
	const Icon = meta.icon;
	const titleRef = useRef<HTMLInputElement | null>(null);

	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [pending, setPending] = useState<PendingAttachment[]>([]);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		titleRef.current?.focus();
	}, []);

	const readyAttachments = useMemo(() => pending.filter((p): p is Extract<PendingAttachment, { kind: "ready" }> => p.kind === "ready"), [pending]);
	const isUploading = pending.some((p) => p.kind === "uploading");

	const trimmedTitle = title.trim();
	const trimmedBody = body.trim();
	const canSubmit = !!trimmedTitle && !!trimmedBody && !isUploading && !isSubmitting;

	const handleFiles = useCallback(
		async (files: FileList | File[]) => {
			const items = Array.from(files);
			if (!items.length) return;

			// Cap total attachments before kicking uploads off — silently ignore overflow so a
			// drag of 20 files doesn't queue 20 upload requests we'll have to abort.
			const remaining = MAX_ATTACHMENTS - pending.length;
			const toUpload = items.slice(0, Math.max(0, remaining));

			await Promise.all(
				toUpload.map(async (file) => {
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
		},
		[pending.length],
	);

	const removePending = useCallback((tempId: string) => {
		setPending((prev) => prev.filter((p) => p.tempId !== tempId));
	}, []);

	const submit = useCallback(async () => {
		if (!canSubmit) return;
		await onSubmit({
			title: trimmedTitle,
			body: trimmedBody,
			attachmentIds: readyAttachments.map((p) => p.data.id),
		});
	}, [canSubmit, trimmedTitle, trimmedBody, readyAttachments, onSubmit]);

	const titleLength = title.length;
	const bodyLength = body.length;

	return (
		<Stack spacing={2.5} data-testid="feedback-form">
			<Stack direction="row" alignItems="center" spacing={1.5}>
				<Tooltip title="Changer de catégorie">
					<IconButton size="small" onClick={onBack} aria-label="Changer de catégorie" data-testid="feedback-back" sx={{ color: "var(--ink-soft)" }}>
						<ArrowBack sx={{ fontSize: 18 }} />
					</IconButton>
				</Tooltip>
				<Chip
					icon={<Icon sx={{ fontSize: 16 }} />}
					label={meta.label}
					size="small"
					sx={{
						bgcolor: meta.accentSoft,
						color: meta.accent,
						fontWeight: 700,
						"& .MuiChip-icon": { color: meta.accent },
					}}
				/>
			</Stack>

			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", md: "1.3fr 1fr" },
					gap: { xs: 1.5, md: 3.5 },
				}}
			>
				<Stack spacing={2}>
					<TextField
						inputRef={titleRef}
						data-testid="feedback-title"
						label="Titre"
						placeholder={meta.titlePlaceholder}
						value={title}
						onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
						fullWidth
						required
						slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
						helperText={`${titleLength} / ${TITLE_MAX}`}
					/>
					<TextField
						data-testid="feedback-body"
						label="Description"
						placeholder="Décrivez votre retour en apportant tout le contexte utile."
						value={body}
						onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
						multiline
						minRows={6}
						maxRows={12}
						fullWidth
						required
						slotProps={{ htmlInput: { maxLength: BODY_MAX } }}
						helperText={`${bodyLength} / ${BODY_MAX}`}
					/>

					<Box>
						<Stack direction="row" alignItems="center" justifyContent="space-between">
							<Typography variant="overline">Pièces jointes</Typography>
							<Tooltip title={`Joindre une image ou un PDF (max ${MAX_ATTACHMENTS}, 25 Mo chacun)`}>
								<span>
									<IconButton
										size="small"
										data-testid="feedback-attach"
										onClick={() => fileInputRef.current?.click()}
										disabled={pending.length >= MAX_ATTACHMENTS || isSubmitting}
										aria-label="Joindre des fichiers"
										sx={{ color: "var(--ink-soft)" }}
									>
										<AttachFile sx={{ fontSize: 18 }} />
									</IconButton>
								</span>
							</Tooltip>
						</Stack>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							hidden
							accept="image/*,application/pdf"
							data-testid="feedback-file-input"
							onChange={(e) => {
								if (e.target.files && e.target.files.length > 0) void handleFiles(e.target.files);
								e.target.value = "";
							}}
						/>
						{pending.length > 0 && (
							<Stack spacing={0.75} sx={{ mt: 0.5 }}>
								{pending.map((p) => (
									<PendingAttachmentCard key={p.tempId} pending={p} onRemove={() => removePending(p.tempId)} />
								))}
							</Stack>
						)}
					</Box>

					{submitError && <Alert severity="error">{submitError}</Alert>}

					<Stack direction={{ xs: "column-reverse", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={1.25}>
						<Typography variant="caption" sx={{ color: "var(--ink-mute)" }}>
							Votre adresse email est transmise avec le retour afin de pouvoir vous répondre.
						</Typography>
						<Button
							data-testid="feedback-submit"
							onClick={submit}
							variant="contained"
							color="primary"
							disabled={!canSubmit}
							startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : <SendOutlined sx={{ fontSize: 16 }} />}
						>
							{isSubmitting ? "Envoi…" : "Envoyer"}
						</Button>
					</Stack>
				</Stack>

				<ChecklistPanel meta={meta} Icon={Icon} />
			</Box>
		</Stack>
	);
}

function ChecklistPanel({ meta, Icon }: { meta: CategoryMeta; Icon: CategoryMeta["icon"] }) {
	const content = (
		<Stack spacing={1.5}>
			<Stack direction="row" alignItems="center" spacing={1}>
				<Box
					sx={{
						width: 36,
						height: 36,
						borderRadius: "10px",
						backgroundColor: meta.accentSoft,
						display: "grid",
						placeItems: "center",
						color: meta.accent,
					}}
				>
					<Icon sx={{ fontSize: 22 }} />
				</Box>
				<Typography variant="subtitle1" sx={{ color: "var(--ink)" }}>
					{meta.label}
				</Typography>
			</Stack>
			<Typography variant="overline">Éléments à mentionner</Typography>
			<Box
				component="ul"
				sx={{
					listStyle: "none",
					m: 0,
					p: 0,
					display: "flex",
					flexDirection: "column",
					gap: 0.75,
				}}
			>
				{meta.checklist.map((item) => (
					<Box
						key={item}
						component="li"
						sx={{
							display: "flex",
							alignItems: "flex-start",
							gap: 1,
							color: "var(--ink-soft)",
							fontSize: "0.86rem",
							lineHeight: 1.5,
						}}
					>
						<Box
							aria-hidden
							sx={{
								mt: "8px",
								width: 5,
								height: 5,
								borderRadius: "999px",
								backgroundColor: meta.accent,
								flexShrink: 0,
							}}
						/>
						<span>{item}</span>
					</Box>
				))}
			</Box>
			<Divider sx={{ my: 0.5 }} />
			<Typography variant="caption" sx={{ color: "var(--ink-mute)" }}>
				Contexte technique auto-attaché (URL, version, navigateur).
			</Typography>
		</Stack>
	);

	return (
		<>
			<Box
				sx={{
					display: { xs: "none", md: "block" },
					borderLeft: "1px solid var(--line)",
					backgroundColor: "var(--surface-soft)",
					borderRadius: "12px",
					p: 2.5,
				}}
			>
				{content}
			</Box>
			<Accordion
				disableGutters
				elevation={0}
				sx={{
					display: { xs: "block", md: "none" },
					backgroundColor: "var(--surface-soft)",
					border: "1px solid var(--line)",
					borderRadius: "12px",
					"&::before": { display: "none" },
				}}
			>
				<AccordionSummary expandIcon={<ExpandMore />}>
					<Typography variant="subtitle2" sx={{ color: "var(--ink-soft)" }}>
						Éléments à mentionner
					</Typography>
				</AccordionSummary>
				<AccordionDetails>{content}</AccordionDetails>
			</Accordion>
		</>
	);
}

function PendingAttachmentCard({ pending, onRemove }: { pending: PendingAttachment; onRemove: () => void }) {
	const fileName = pending.kind === "ready" ? pending.data.fileName : pending.fileName;
	const contentType = pending.kind === "ready" ? pending.data.contentType : pending.contentType;
	const sizeBytes = pending.kind === "ready" ? pending.data.sizeBytes : pending.sizeBytes;
	const accent = pending.kind === "error" ? "var(--danger)" : pending.kind === "ready" ? "var(--primary-blue)" : "var(--ink-mute)";
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
			data-testid={`feedback-attachment-${pending.tempId}`}
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
				minHeight: 40,
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
					bgcolor: pending.kind === "error" ? "var(--danger-soft)" : "var(--surface-blue)",
					color: accent,
					flexShrink: 0,
				}}
			>
				{pending.kind === "error" ? <ErrorOutline sx={{ fontSize: 18 }} /> : pickFileIcon(contentType)}
			</Box>
			<Stack sx={{ flex: 1, minWidth: 0 }}>
				<Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
					{fileName}
				</Typography>
				<Typography sx={{ fontSize: 11, color: pending.kind === "error" ? accent : "var(--ink-mute)", lineHeight: 1.3 }}>{progressLabel}</Typography>
			</Stack>
			<IconButton
				size="small"
				onClick={onRemove}
				aria-label="Retirer la pièce jointe"
				sx={{ color: "var(--ink-mute)" }}
				data-testid={`feedback-attachment-remove-${pending.tempId}`}
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
