import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store";
import { routes } from "@/config/routes";
import { deleteReservation } from "@/store/modules/reservations/reservations.actions";
import type { Reservation } from "@apis/rest/api/generated";
import type { AuthUser } from "@/core/auth/auth.types";
import { reservationDurationLabel, reservationPeriodLabel } from "./date-utils";
import { PendingBadge } from "@/view/components/reservation/PendingBadge";
import { CreatorDecisionPanel } from "@/view/components/reservation/CreatorDecisionPanel";
import { ObjectionDialog } from "@/view/components/reservation/ObjectionDialog";

type DeleteReservationDialogProps = {
	reservation: Reservation | null;
	currentUser: AuthUser | null;
	onClose: () => void;
	onDeleted: () => void;
};

export function DeleteReservationDialog({ reservation, currentUser, onClose, onDeleted }: DeleteReservationDialogProps) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [objecting, setObjecting] = useState<Reservation | null>(null);

	const isOwnReservation = Boolean(reservation && reservation.user.id === currentUser?.id);
	const isPending = reservation?.validation.status === "Pending";
	const hasObjection = Boolean(reservation?.objection);
	const alreadyObjected = Boolean(reservation?.objection?.user.id === currentUser?.id);
	const canObject = Boolean(reservation && !isOwnReservation && isPending && !hasObjection);

	const handleConfirm = async () => {
		if (!reservation) return;
		await dispatch(deleteReservation(reservation.id));
		onDeleted();
		onClose();
	};

	const handleEdit = () => {
		if (!reservation) return;
		void navigate(routes.app.reservation.path, { state: { reservation } });
		onClose();
	};

	const handleOpenTopic = () => {
		if (!reservation?.topicId) return;
		void navigate(`/messages/${reservation.topicId}`);
		onClose();
	};

	return (
		<>
			<Dialog open={Boolean(reservation)} onClose={onClose} fullWidth maxWidth="sm">
				<DialogTitle sx={{ fontWeight: 800, fontSize: 26 }}>{isOwnReservation ? "Gérer la réservation" : "Détail de la réservation"}</DialogTitle>
				{reservation && (
					<DialogContent>
						<Stack spacing={2}>
							<Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap>
								<Typography className="kicker" sx={{ color: "var(--primary-blue)" }}>
									{reservation.user.displayName}
								</Typography>
								<PendingBadge reservation={reservation} />
							</Stack>
							<Typography>
								{reservationPeriodLabel(reservation.startDate, reservation.endDate)} - soit {reservationDurationLabel(reservation.startDate, reservation.endDate)}.
							</Typography>
							{reservation.note && (
								<Typography sx={{ color: "var(--ink-soft)", bgcolor: "var(--surface-soft)", borderRadius: "12px", p: 2 }}>{reservation.note}</Typography>
							)}
							{isOwnReservation && isPending && hasObjection && <CreatorDecisionPanel reservation={reservation} onChanged={onClose} />}
							{!isOwnReservation && isPending && hasObjection && reservation.topicId && (
								<Box sx={{ p: 2, borderRadius: 2, bgcolor: "var(--surface-soft)", border: "1px solid var(--line)" }}>
									<Typography variant="body2">Une objection en cours{alreadyObjected ? " — votre objection est enregistrée." : "."}</Typography>
									<Button onClick={handleOpenTopic} variant="text" sx={{ mt: 1 }}>
										Ouvrir la discussion
									</Button>
								</Box>
							)}
						</Stack>
					</DialogContent>
				)}
				<DialogActions sx={{ px: 3, pb: 3, flexWrap: "wrap", gap: 0.5 }}>
					{isOwnReservation ? (
						<>
							{isPending && (
								<Button onClick={handleEdit} variant="outlined">
									Modifier
								</Button>
							)}
							<Button onClick={onClose} variant="text">
								Fermer
							</Button>
							<Button onClick={handleConfirm} variant="contained" color="primary">
								{isPending ? "Annuler la réservation" : "Supprimer"}
							</Button>
						</>
					) : (
						<>
							{canObject && (
								<Button data-testid="objection-button" onClick={() => reservation && setObjecting(reservation)} variant="outlined" color="warning">
									S'opposer
								</Button>
							)}
							<Button onClick={onClose} variant="contained" color="primary">
								Fermer
							</Button>
						</>
					)}
				</DialogActions>
			</Dialog>
			<ObjectionDialog reservation={objecting} onClose={() => setObjecting(null)} />
		</>
	);
}
