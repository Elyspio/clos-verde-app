import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { extractApiError } from "@apis/rest/api/clients/api.client";
import { reservationsService } from "@/core/services/reservations.service";
import type { Reservation } from "@apis/rest/api/generated";

type Props = {
	reservation: Reservation;
	onChanged?: () => void;
};

/**
 * Decision panel shown to the creator when their Pending reservation has at least one objection.
 * Lists every objection and offers three exits: force-validate, edit, or cancel.
 */
export function CreatorDecisionPanel({ reservation, onChanged }: Props) {
	const navigate = useNavigate();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const objection = reservation.objection;

	const validate = async () => {
		setSubmitting(true);
		setError(null);
		try {
			await reservationsService.forceValidate(reservation.id);
			onChanged?.();
		} catch (e) {
			setError(extractApiError(e, "Validation impossible."));
		} finally {
			setSubmitting(false);
		}
	};

	const cancel = async () => {
		setSubmitting(true);
		setError(null);
		try {
			await reservationsService.remove(reservation.id);
			onChanged?.();
		} catch (e) {
			setError(extractApiError(e, "Annulation impossible."));
		} finally {
			setSubmitting(false);
		}
	};

	const editReservation = () => {
		void navigate("/reserver", { state: { reservation } });
	};

	const goToTopic = () => {
		if (!reservation.topicId) return;
		void navigate(`/messages/${reservation.topicId}`);
	};

	return (
		<Box
			data-testid="creator-decision-panel"
			sx={{
				border: "1px solid rgba(245, 158, 11, 0.4)",
				bgcolor: "rgba(254, 243, 199, 0.5)",
				borderRadius: "16px",
				p: { xs: 2, sm: 2.5 },
			}}
		>
			<Typography sx={{ fontSize: 16, fontWeight: 900, color: "#b45309" }}>Une objection sur votre réservation</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
				La validation automatique est suspendue. Discutez puis tranchez&nbsp;: validez quand même, modifiez ou annulez.
			</Typography>
			{error && (
				<Alert severity="error" sx={{ mt: 2 }}>
					{error}
				</Alert>
			)}
			<Stack spacing={1} sx={{ mt: 2, mb: 2 }}>
				{objection && (
					<Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "var(--surface)", border: "1px solid var(--line)" }}>
						<Typography sx={{ fontSize: 12, fontWeight: 700 }}>
							{objection.user.displayName}{" "}
							<Typography component="span" sx={{ color: "var(--ink-mute)", fontSize: 11, fontWeight: 500 }}>
								— {format(new Date(objection.createdAt), "dd/MM HH:mm")}
							</Typography>
						</Typography>
						{objection.reason && (
							<Typography variant="body2" sx={{ mt: 0.5 }}>
								{objection.reason}
							</Typography>
						)}
					</Box>
				)}
			</Stack>
			<Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} flexWrap="wrap">
				<Button data-testid="validate-anyway-button" variant="contained" onClick={validate} disabled={submitting} color="primary">
					Valider quand même
				</Button>
				<Button data-testid="edit-pending-button" variant="outlined" onClick={editReservation} disabled={submitting}>
					Modifier
				</Button>
				<Button data-testid="cancel-pending-button" variant="outlined" onClick={cancel} disabled={submitting} color="error">
					Annuler
				</Button>
				{reservation.topicId && (
					<Button data-testid="open-topic-button" variant="text" onClick={goToTopic} disabled={submitting}>
						Ouvrir la discussion
					</Button>
				)}
			</Stack>
		</Box>
	);
}
