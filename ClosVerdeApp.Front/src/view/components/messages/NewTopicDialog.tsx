import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store";
import { createTopic } from "@/store/modules/topics/topics.actions";

/** Dialog to create a new Custom topic. The current user becomes its sole owner. */
export function NewTopicDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleClose = () => {
		if (submitting) return;
		setName("");
		setError(null);
		onClose();
	};

	const handleSubmit = async () => {
		if (!name.trim()) return;
		setSubmitting(true);
		setError(null);
		try {
			const topic = await dispatch(createTopic(name.trim())).unwrap();
			handleClose();
			void navigate(`/messages/${topic.id}`);
		} catch (e) {
			setError(typeof e === "string" ? e : "Création impossible.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
			<DialogTitle>Nouveau salon</DialogTitle>
			<DialogContent>
				{error && (
					<Alert severity="warning" sx={{ mb: 1.5 }}>
						{error}
					</Alert>
				)}
				<TextField autoFocus fullWidth label="Nom du salon" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 80 }} sx={{ mt: 1 }} />
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={submitting}>
					Annuler
				</Button>
				<Button onClick={handleSubmit} variant="contained" disabled={submitting || !name.trim()}>
					Créer
				</Button>
			</DialogActions>
		</Dialog>
	);
}
