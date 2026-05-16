import { Box, ButtonBase, CircularProgress, Stack, Typography } from "@mui/material";
import { Download, Image as ImageIcon, InsertDriveFile, PictureAsPdf } from "@mui/icons-material";
import { memo, useCallback, useState } from "react";
import type { Attachment } from "@apis/rest/api/generated";
import { downloadWithAuth, useAuthenticatedObjectUrl } from "@data/messages/attachments.hooks";

type Props = {
	attachments: readonly Attachment[];
	/** When true, content aligns to the right (mirrors the bubble's row-reverse). */
	alignEnd?: boolean;
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
 * Renders the attachment row beneath a message bubble. Images are shown as a tight
 * mosaic of authenticated thumbnails (max 3 per row), other files as compact download
 * cards. Click on either dispatches an authenticated download (JWT included).
 */
function MessageAttachmentsImpl({ attachments, alignEnd }: Props) {
	if (attachments.length === 0) return null;

	const images = attachments.filter((a) => a.isImage);
	const others = attachments.filter((a) => !a.isImage);

	return (
		<Stack
			data-testid="message-attachments"
			spacing={0.75}
			sx={{
				mt: 0.75,
				alignItems: alignEnd ? "flex-end" : "flex-start",
				maxWidth: "100%",
			}}
		>
			{images.length > 0 && (
				<Box
					data-testid="message-attachments-images"
					sx={{
						display: "grid",
						gridTemplateColumns: `repeat(${Math.min(images.length, 3)}, minmax(120px, 160px))`,
						gap: 0.75,
					}}
				>
					{images.map((image) => (
						<ImageAttachment key={image.id} attachment={image} />
					))}
				</Box>
			)}

			{others.map((file) => (
				<FileAttachment key={file.id} attachment={file} alignEnd={alignEnd} />
			))}
		</Stack>
	);
}

function ImageAttachment({ attachment }: { attachment: Attachment }) {
	const state = useAuthenticatedObjectUrl(attachment.downloadUrl);
	const [downloading, setDownloading] = useState(false);

	const onClick = useCallback(async () => {
		setDownloading(true);
		try {
			await downloadWithAuth(attachment.downloadUrl, attachment.fileName);
		} finally {
			setDownloading(false);
		}
	}, [attachment.downloadUrl, attachment.fileName]);

	return (
		<ButtonBase
			data-testid={`message-attachment-image-${attachment.id}`}
			onClick={onClick}
			focusRipple
			sx={{
				position: "relative",
				display: "block",
				width: "100%",
				aspectRatio: "4 / 3",
				borderRadius: "10px",
				overflow: "hidden",
				border: "1px solid var(--line)",
				bgcolor: "var(--surface-soft, var(--surface))",
				transition: "transform 180ms ease, box-shadow 180ms ease",
				"&:hover": {
					transform: "translateY(-1px)",
					boxShadow: "0 6px 20px -8px rgba(15, 23, 42, 0.25)",
				},
				"&:focus-visible": {
					outline: "2px solid var(--primary-blue)",
					outlineOffset: 2,
				},
			}}
		>
			{state.status === "ready" ? (
				<Box
					component="img"
					src={state.url}
					alt={attachment.fileName}
					loading="lazy"
					sx={{
						width: "100%",
						height: "100%",
						objectFit: "cover",
						display: "block",
					}}
				/>
			) : (
				<Stack
					alignItems="center"
					justifyContent="center"
					sx={{
						width: "100%",
						height: "100%",
						color: "var(--ink-mute)",
						bgcolor: "rgba(15, 23, 42, 0.04)",
					}}
				>
					{state.status === "error" ? (
						<Typography sx={{ fontSize: 11, px: 1, textAlign: "center" }}>Aperçu indisponible</Typography>
					) : (
						<CircularProgress size={20} thickness={4} sx={{ color: "var(--ink-mute)" }} />
					)}
				</Stack>
			)}

			{downloading && (
				<Stack
					alignItems="center"
					justifyContent="center"
					sx={{
						position: "absolute",
						inset: 0,
						bgcolor: "rgba(15, 23, 42, 0.45)",
					}}
				>
					<CircularProgress size={22} thickness={4} sx={{ color: "white" }} />
				</Stack>
			)}

			<Box
				sx={{
					position: "absolute",
					left: 0,
					right: 0,
					bottom: 0,
					px: 1,
					py: 0.5,
					background: "linear-gradient(to top, rgba(15, 23, 42, 0.72), transparent)",
					color: "white",
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: 0.1,
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					overflow: "hidden",
				}}
			>
				{attachment.fileName}
			</Box>
		</ButtonBase>
	);
}

function FileAttachment({ attachment, alignEnd }: { attachment: Attachment; alignEnd?: boolean }) {
	const [downloading, setDownloading] = useState(false);

	const onClick = useCallback(async () => {
		setDownloading(true);
		try {
			await downloadWithAuth(attachment.downloadUrl, attachment.fileName);
		} finally {
			setDownloading(false);
		}
	}, [attachment.downloadUrl, attachment.fileName]);

	return (
		<ButtonBase
			data-testid={`message-attachment-file-${attachment.id}`}
			onClick={onClick}
			focusRipple
			sx={{
				width: "100%",
				maxWidth: 320,
				borderRadius: "10px",
				border: "1px solid var(--line)",
				bgcolor: "var(--surface)",
				px: 1.25,
				py: 0.875,
				transition: "border-color 160ms ease, background-color 160ms ease",
				"&:hover": {
					borderColor: "var(--primary-blue)",
					bgcolor: "var(--surface-blue)",
				},
				"&:focus-visible": {
					outline: "2px solid var(--primary-blue)",
					outlineOffset: 2,
				},
				// Mirror direction for own messages so icon stays on the leading edge.
				flexDirection: alignEnd ? "row-reverse" : "row",
				display: "flex",
				alignItems: "center",
				gap: 1,
				justifyContent: "space-between",
			}}
		>
			<Stack direction={alignEnd ? "row-reverse" : "row"} spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 32,
						height: 32,
						borderRadius: "8px",
						bgcolor: "var(--surface-blue)",
						color: "var(--primary-blue)",
						flexShrink: 0,
					}}
				>
					{pickFileIcon(attachment.contentType)}
				</Box>
				<Stack sx={{ minWidth: 0, textAlign: alignEnd ? "right" : "left" }}>
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
						{attachment.fileName}
					</Typography>
					<Typography sx={{ fontSize: 11, color: "var(--ink-mute)", lineHeight: 1.2 }}>{formatBytes(attachment.sizeBytes)}</Typography>
				</Stack>
			</Stack>
			<Box sx={{ color: "var(--ink-mute)", display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24 }}>
				{downloading ? <CircularProgress size={16} thickness={4} sx={{ color: "var(--ink-mute)" }} /> : <Download sx={{ fontSize: 18 }} />}
			</Box>
		</ButtonBase>
	);
}

export const MessageAttachments = memo(MessageAttachmentsImpl);
