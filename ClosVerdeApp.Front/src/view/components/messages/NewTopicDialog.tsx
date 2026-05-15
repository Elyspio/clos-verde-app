import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTopicsMutations } from "@data/topics/topics.mutations";

/** Dialog to create a new Custom topic. The current user becomes its sole owner. */
export function NewTopicDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
	const navigate = useNavigate();
	const createMutation = useTopicsMutations.create();
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const submitting = createMutation.isPending;

	const handleClose = () => {
		if (submitting) return;
		setName("");
		setError(null);
		onClose();
	};

	const handleSubmit = async () => {
		if (!name.trim()) return;
		setError(null);
		try {
			const topic = await createMutation.mutateAsync(name.trim());
			handleClose();
			void navigate(`/messages/${topic.id}`);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Création impossible.");
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
