import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useReservationsMutations } from "@data/reservations/reservations.mutations";
import type { Reservation } from "@apis/rest/api/generated";

type Props = {
	reservation: Reservation | null;
	onClose: () => void;
};

/**
 * Modal that lets a non-creator user raise an objection (with an optional reason)
 * against a Pending reservation. Submitting blocks auto-validation server-side.
 */
export function ObjectionDialog({ reservation, onClose }: Props) {
	const [reason, setReason] = useState("");
	const [error, setError] = useState<string | null>(null);
	const objectionMutation = useReservationsMutations.createObjection();
	const submitting = objectionMutation.isPending;

	const open = !!reservation;

	const handleClose = () => {
		if (submitting) return;
		setReason("");
		setError(null);
		onClose();
	};

	const handleSubmit = async () => {
		if (!reservation) return;
		setError(null);
		try {
			await objectionMutation.mutateAsync({ id: reservation.id, reason: reason.trim() || undefined });
			handleClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Objection impossible.");
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
			<DialogTitle>S'opposer à la réservation</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					{reservation && (
						<Typography variant="body2" color="text.secondary">
							Réservation de {reservation.user.displayName}. Une objection bloque la validation automatique et ouvre un fil de discussion.
						</Typography>
					)}
					{error && <Alert severity="warning">{error}</Alert>}
					<TextField
						label="Raison (optionnelle)"
						multiline
						rows={3}
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Optionnel — donnez le contexte au créateur"
						fullWidth
					/>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={submitting}>
					Annuler
				</Button>
				<Button onClick={handleSubmit} variant="contained" disabled={submitting}>
					Soumettre l'objection
				</Button>
			</DialogActions>
		</Dialog>
	);
}
