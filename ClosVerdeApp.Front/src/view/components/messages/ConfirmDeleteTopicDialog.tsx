import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useState } from "react";

type Props = {
	open: boolean;
	topicName: string;
	onClose: () => void;
	onConfirm: () => Promise<void> | void;
};

/** Confirmation dialog for permanently deleting a Custom topic and its messages. */
export function ConfirmDeleteTopicDialog({ open, topicName, onClose, onConfirm }: Props) {
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleClose = () => {
		if (submitting) return;
		setError(null);
		onClose();
	};

	const handleConfirm = async () => {
		setSubmitting(true);
		setError(null);
		try {
			await onConfirm();
			handleClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Suppression impossible.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
			<DialogTitle>Supprimer le salon</DialogTitle>
			<DialogContent>
				{error && (
					<Alert severity="error" sx={{ mb: 1.5 }}>
						{error}
					</Alert>
				)}
				<DialogContentText>
					Voulez-vous vraiment supprimer définitivement <strong>{topicName}</strong>&nbsp;? Tous les messages seront perdus.
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={submitting}>
					Annuler
				</Button>
				<Button onClick={handleConfirm} variant="contained" color="error" disabled={submitting}>
					Supprimer
				</Button>
			</DialogActions>
		</Dialog>
	);
}
