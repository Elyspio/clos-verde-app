import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store";
import { routes } from "@/config/routes";
import { deleteReservation } from "@/store/modules/reservations/reservations.actions";
import type { AuthUser, Reservation } from "@/types/models";
import { reservationDurationLabel, reservationPeriodLabel } from "./date-utils";

type DeleteReservationDialogProps = {
	reservation: Reservation | null;
	currentUser: AuthUser | null;
	onClose: () => void;
	onDeleted: () => void;
};

export function DeleteReservationDialog({ reservation, currentUser, onClose, onDeleted }: DeleteReservationDialogProps) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const isOwnReservation = Boolean(reservation && reservation.userId === currentUser?.id);

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

	return (
		<Dialog open={Boolean(reservation)} onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle sx={{ fontWeight: 800, fontSize: 26 }}>{isOwnReservation ? "Gérer la réservation" : "Détail de la réservation"}</DialogTitle>
			{reservation && (
				<DialogContent>
					<Stack spacing={2}>
						<Typography className="kicker" sx={{ color: "var(--primary-blue)" }}>
							{reservation.userDisplayName}
						</Typography>
						<Typography>
							{reservationPeriodLabel(reservation.startDate, reservation.endDate)} - soit {reservationDurationLabel(reservation.startDate, reservation.endDate)}.
						</Typography>
						{reservation.note && (
							<Typography sx={{ color: "var(--ink-soft)", bgcolor: "var(--surface-soft)", borderRadius: "12px", p: 2 }}>{reservation.note}</Typography>
						)}
					</Stack>
				</DialogContent>
			)}
			<DialogActions sx={{ px: 3, pb: 3 }}>
				{isOwnReservation ? (
					<>
						<Button onClick={handleEdit} variant="outlined">
							Modifier
						</Button>
						<Button onClick={onClose} variant="text">
							Garder la réservation
						</Button>
						<Button onClick={handleConfirm} variant="contained" color="primary">
							Annuler la réservation
						</Button>
					</>
				) : (
					<Button onClick={onClose} variant="contained" color="primary">
						Fermer
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
}
