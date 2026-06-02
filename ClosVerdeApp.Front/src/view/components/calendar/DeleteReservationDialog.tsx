import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import { Close, DeleteOutline, EditOutlined, EventOutlined } from "@mui/icons-material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Reservation } from "@apis/rest/api/generated";
import { useIsAdmin } from "@data/client/useIsAdmin";
import { useReservationsMutations } from "@data/reservations/reservations.mutations";
import type { AuthUser } from "@/core/auth/auth.types";
import { routes } from "@/config/routes";
import { CreatorDecisionPanel } from "@/view/components/reservation/CreatorDecisionPanel";
import { ObjectionDialog } from "@/view/components/reservation/ObjectionDialog";
import { PendingBadge } from "@/view/components/reservation/PendingBadge";
import { reservationDurationLabel, reservationPeriodLabel } from "../../../utils/date.utils";

type DeleteReservationDialogProps = {
	reservation: Reservation | null;
	currentUser: AuthUser | null;
	onClose: () => void;
};

const compactButtonSx = {
	px: 1.35,
	py: 0.5,
	minHeight: 32,
	fontSize: 12.75,
	fontWeight: 750,
	borderRadius: "9px",
	textTransform: "none",
	whiteSpace: "nowrap",
	flexShrink: 0,
	"& .MuiButton-startIcon": { mr: 0.5, "& svg": { fontSize: 16 } },
};

const destructiveButtonSx = {
	...compactButtonSx,
	bgcolor: "#dc2626",
	color: "#fff",
	"&:hover": { bgcolor: "#b91c1c" },
	"&.Mui-disabled": { bgcolor: "rgba(220, 38, 38, 0.36)", color: "rgba(255,255,255,0.82)" },
};

export function DeleteReservationDialog({ reservation, currentUser, onClose }: DeleteReservationDialogProps) {
	const navigate = useNavigate();
	const isAdmin = useIsAdmin();
	const [objecting, setObjecting] = useState<Reservation | null>(null);
	const deleteMutation = useReservationsMutations.delete();

	const isOwnReservation = Boolean(reservation && reservation.user.id === currentUser?.id);
	const isPending = reservation?.validation.status === "Pending";
	const hasObjection = Boolean(reservation?.objection);
	const alreadyObjected = Boolean(reservation?.objection?.user.id === currentUser?.id);
	const canManage = isOwnReservation || isAdmin;
	const canObject = Boolean(reservation && !isOwnReservation && isPending && !hasObjection);
	const showDecisionPanel = canManage && isPending && hasObjection;

	const handleConfirm = async () => {
		if (!reservation) return;
		await deleteMutation.mutateAsync(reservation.id);
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
			<Dialog
				open={Boolean(reservation)}
				onClose={onClose}
				PaperProps={{
					["data-testid" as string]: "reservation-dialog",
					["data-reservation-id" as string]: reservation?.id,
					sx: {
						borderRadius: { xs: "14px", sm: "18px" },
						boxShadow: "0 18px 48px rgba(15, 23, 42, 0.24)",
						overflow: "hidden",
					},
				}}
			>
				<DialogTitle sx={{ p: { xs: 2.25, sm: 2.75 }, pb: 1.25 }}>
					<Stack direction="row" spacing={1.25} alignItems="flex-start">
						<Box
							aria-hidden
							sx={{
								width: 32,
								height: 32,
								borderRadius: "10px",
								display: { xs: "none", sm: "grid" },
								placeItems: "center",
								bgcolor: "var(--surface-blue)",
								color: "var(--primary-blue)",
								flexShrink: 0,
							}}
						>
							<EventOutlined sx={{ fontSize: 19 }} />
						</Box>
						<Box sx={{ minWidth: 0, flex: 1 }}>
							<Typography component="h2" sx={{ color: "var(--ink)", fontSize: { xs: 22, sm: 25 }, fontWeight: 850, lineHeight: 1.18 }}>
								{canManage ? "Gérer la réservation" : "Détail de la réservation"}
							</Typography>
							{reservation && (
								<Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
									<Typography sx={{ color: "var(--primary-blue)", fontSize: 15.5, fontWeight: 750 }}>{reservation.user.displayName}</Typography>
									<PendingBadge reservation={reservation} />
								</Stack>
							)}
						</Box>
						<IconButton aria-label="Fermer" onClick={onClose} sx={{ color: "var(--ink-soft)", mt: -0.75, mr: -0.75 }}>
							<Close />
						</IconButton>
					</Stack>
				</DialogTitle>

				{reservation && (
					<DialogContent sx={{ px: { xs: 2.25, sm: 2.75 }, pt: 0.25 }}>
						<Stack spacing={2}>
							<Typography sx={{ color: "var(--ink)", fontSize: 15.5, lineHeight: 1.5 }}>
								{reservationPeriodLabel(reservation.startDate, reservation.endDate)} - soit {reservationDurationLabel(reservation.startDate, reservation.endDate)}.
							</Typography>

							{reservation.note && (
								<Box sx={{ border: "1px solid var(--line)", borderRadius: "12px", bgcolor: "var(--surface-soft)", px: 1.75, py: 1.35 }}>
									<Typography sx={{ color: "var(--ink-soft)", fontSize: 14.25, lineHeight: 1.55 }}>{reservation.note}</Typography>
								</Box>
							)}

							{showDecisionPanel && <CreatorDecisionPanel reservation={reservation} onChanged={onClose} isOwner={isOwnReservation} />}

							{!canManage && isPending && hasObjection && reservation.topicId && (
								<Box sx={{ p: 1.75, borderRadius: "12px", bgcolor: "var(--surface-soft)", border: "1px solid var(--line)" }}>
									<Typography variant="body2">Une objection en cours{alreadyObjected ? " — votre objection est enregistrée." : "."}</Typography>
									<Button onClick={handleOpenTopic} variant="text" sx={{ ...compactButtonSx, mt: 1 }}>
										Ouvrir la discussion
									</Button>
								</Box>
							)}
						</Stack>
					</DialogContent>
				)}

				<DialogActions
					sx={{
						px: { xs: 2.25, sm: 2.75 },
						py: 1.75,
						mt: 1,
						borderTop: "1px solid var(--line)",
						bgcolor: "rgba(248, 250, 252, 0.72)",
						flexWrap: "wrap",
						gap: 0.75,
					}}
				>
					{canObject && (
						<Button data-testid="objection-button" onClick={() => reservation && setObjecting(reservation)} variant="outlined" color="warning" sx={compactButtonSx}>
							S'opposer
						</Button>
					)}

					{canManage && (isPending || isAdmin) && !showDecisionPanel && (
						<Button onClick={handleEdit} variant="outlined" startIcon={<EditOutlined />} sx={compactButtonSx}>
							Modifier
						</Button>
					)}

					{canManage && !showDecisionPanel && (
						<Button onClick={handleConfirm} variant="contained" disabled={deleteMutation.isPending} startIcon={<DeleteOutline />} sx={destructiveButtonSx}>
							{isPending ? "Annuler la réservation" : "Supprimer"}
						</Button>
					)}
				</DialogActions>
			</Dialog>

			<ObjectionDialog reservation={objecting} onClose={() => setObjecting(null)} />
		</>
	);
}
