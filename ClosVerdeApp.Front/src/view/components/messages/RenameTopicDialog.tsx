import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useEffect, useState } from "react";

type Props = {
	open: boolean;
	currentName: string;
	onClose: () => void;
	onSubmit: (name: string) => Promise<void> | void;
};

/** Dialog for renaming a Custom topic. The creator is the only one allowed to call this. */
export function RenameTopicDialog({ open, currentName, onClose, onSubmit }: Props) {
	const [name, setName] = useState(currentName);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setName(currentName);
			setError(null);
		}
	}, [open, currentName]);

	const handleClose = () => {
		if (submitting) return;
		onClose();
	};

	const handleSubmit = async () => {
		const trimmed = name.trim();
		if (!trimmed || trimmed === currentName) {
			handleClose();
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			await onSubmit(trimmed);
			handleClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Renommage impossible.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
			<DialogTitle>Renommer le salon</DialogTitle>
			<DialogContent>
				{error && (
					<Alert severity="warning" sx={{ mb: 1.5 }}>
						{error}
					</Alert>
				)}
				<TextField
					autoFocus
					fullWidth
					label="Nom"
					value={name}
					onChange={(e) => setName(e.target.value)}
					inputProps={{ maxLength: 80 }}
					sx={{ mt: 1 }}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							void handleSubmit();
						}
					}}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={submitting}>
					Annuler
				</Button>
				<Button onClick={handleSubmit} variant="contained" disabled={submitting || !name.trim()}>
					Enregistrer
				</Button>
			</DialogActions>
		</Dialog>
	);
}
