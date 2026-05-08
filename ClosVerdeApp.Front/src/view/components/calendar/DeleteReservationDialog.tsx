import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store";
import { routes } from "@/config/routes";
import { reservationApi } from "@/core/api/reservation.api";
import { deleteReservation } from "@/store/modules/reservations/reservations.actions";
import type { AuthUser, Reservation } from "@/types/models";
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

type ObjectionState = { kind: "idle" } | { kind: "loading" } | { kind: "ready"; alreadyObjected: boolean } | { kind: "error" };

export function DeleteReservationDialog({ reservation, currentUser, onClose, onDeleted }: DeleteReservationDialogProps) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [objecting, setObjecting] = useState<Reservation | null>(null);
	const [objectionState, setObjectionState] = useState<ObjectionState>({ kind: "idle" });

	const isOwnReservation = Boolean(reservation && reservation.userId === currentUser?.id);
	const isPending = reservation?.status === "Pending";
	const hasObjections = (reservation?.objectionCount ?? 0) > 0;

	// When the dialog opens for someone else's pending reservation, look up whether the current
	// user has already raised an objection. The backend allows multiple users to object — only
	// hide "S'opposer" once *this* user has already done so.
	useEffect(() => {
		if (!reservation || isOwnReservation || !isPending) {
			setObjectionState({ kind: "idle" });
			return;
		}

		// No objections at all: definitely not yet objected.
		if (!hasObjections) {
			setObjectionState({ kind: "ready", alreadyObjected: false });
			return;
		}

		const userId = currentUser?.id;
		if (!userId) {
			setObjectionState({ kind: "ready", alreadyObjected: false });
			return;
		}

		let cancelled = false;
		setObjectionState({ kind: "loading" });
		void reservationApi
			.listObjections(reservation.id)
			.then((objections) => {
				if (cancelled) return;
				setObjectionState({
					kind: "ready",
					alreadyObjected: objections.some((o) => o.userId === userId),
				});
			})
			.catch(() => {
				if (!cancelled) setObjectionState({ kind: "error" });
			});

		return () => {
			cancelled = true;
		};
	}, [reservation, isOwnReservation, isPending, hasObjections, currentUser?.id]);

	const canObject = reservation && !isOwnReservation && isPending && objectionState.kind === "ready" && !objectionState.alreadyObjected;

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
									{reservation.userDisplayName}
								</Typography>
								<PendingBadge reservation={reservation} />
							</Stack>
							<Typography>
								{reservationPeriodLabel(reservation.startDate, reservation.endDate)} - soit {reservationDurationLabel(reservation.startDate, reservation.endDate)}.
							</Typography>
							{reservation.note && (
								<Typography sx={{ color: "var(--ink-soft)", bgcolor: "var(--surface-soft)", borderRadius: "12px", p: 2 }}>{reservation.note}</Typography>
							)}
							{isOwnReservation && isPending && hasObjections && <CreatorDecisionPanel reservation={reservation} onChanged={onClose} />}
							{!isOwnReservation && isPending && hasObjections && reservation.topicId && (
								<Box sx={{ p: 2, borderRadius: 2, bgcolor: "var(--surface-soft)", border: "1px solid var(--line)" }}>
									<Typography variant="body2">
										{reservation.objectionCount} objection{reservation.objectionCount > 1 ? "s" : ""} en cours
										{objectionState.kind === "ready" && objectionState.alreadyObjected ? " — votre objection est enregistrée." : "."}
									</Typography>
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
