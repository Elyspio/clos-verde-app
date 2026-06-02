import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { CheckCircleOutline, DeleteOutline, EditOutlined, ForumOutlined, ReportProblemOutlined } from "@mui/icons-material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useReservationsMutations } from "@data/reservations/reservations.mutations";
import type { Reservation } from "@apis/rest/api/generated";

type Props = {
	reservation: Reservation;
	onChanged?: () => void;
	/** When false, the panel is shown to an admin acting on another user's reservation (copy is adjusted). */
	isOwner?: boolean;
};

const decisionButtonSx = {
	px: 1.1,
	py: 0.5,
	minHeight: 32,
	fontSize: 12.5,
	fontWeight: 750,
	borderRadius: "9px",
	whiteSpace: "nowrap",
	flexShrink: 0,
	"& .MuiButton-startIcon": { mr: 0.45, "& svg": { fontSize: 15 } },
};

/**
 * Decision panel shown when a Pending reservation has at least one objection. Offered to the creator,
 * and to admins on any user's reservation. Lists every objection and offers three exits:
 * force-validate, edit, or cancel.
 */
export function CreatorDecisionPanel({ reservation, onChanged, isOwner = true }: Props) {
	const navigate = useNavigate();
	const validateMutation = useReservationsMutations.forceValidate();
	const deleteMutation = useReservationsMutations.delete();
	const [error, setError] = useState<string | null>(null);
	const submitting = validateMutation.isPending || deleteMutation.isPending;
	const objection = reservation.objection;

	const validate = async () => {
		setError(null);
		try {
			await validateMutation.mutateAsync(reservation.id);
			onChanged?.();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Validation impossible.");
		}
	};

	const cancel = async () => {
		setError(null);
		try {
			await deleteMutation.mutateAsync(reservation.id);
			onChanged?.();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Annulation impossible.");
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
				position: "relative",
				border: "1px solid rgba(217, 119, 6, 0.22)",
				bgcolor: "rgba(255, 251, 235, 0.62)",
				borderRadius: "14px",
				p: { xs: 1.75, sm: 2 },
				overflow: "hidden",
			}}
		>
			<Box aria-hidden sx={{ position: "absolute", inset: "0 auto 0 0", width: 4, bgcolor: "#d97706" }} />
			<Stack direction="row" spacing={1.25} alignItems="flex-start">
				<Box
					aria-hidden
					sx={{
						width: 30,
						height: 30,
						borderRadius: "9px",
						display: "grid",
						placeItems: "center",
						bgcolor: "rgba(217, 119, 6, 0.12)",
						color: "#b45309",
						flexShrink: 0,
					}}
				>
					<ReportProblemOutlined />
				</Box>
				<Box sx={{ minWidth: 0 }}>
					<Typography sx={{ fontSize: 16, fontWeight: 850, color: "#92400e", lineHeight: 1.25 }}>
						{isOwner ? "Une objection sur votre réservation" : "Une objection sur cette réservation"}
					</Typography>
					<Typography variant="body2" sx={{ mt: 0.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
						La validation automatique est suspendue. Discutez puis tranchez&nbsp;: validez quand même, modifiez ou annulez.
					</Typography>
				</Box>
			</Stack>
			{error && (
				<Alert severity="error" sx={{ mt: 2 }}>
					{error}
				</Alert>
			)}
			<Stack spacing={1} sx={{ mt: 1.5 }}>
				{objection && (
					<Box sx={{ p: 1.25, borderRadius: "11px", bgcolor: "rgba(255,255,255,0.88)", border: "1px solid rgba(148, 163, 184, 0.28)" }}>
						<Stack direction="row" alignItems="baseline" spacing={0.75} flexWrap="wrap" useFlexGap>
							<Typography sx={{ color: "var(--ink)", fontSize: 13.5, fontWeight: 800 }}>{objection.user.displayName}</Typography>
							<Typography component="span" sx={{ color: "var(--ink-mute)", fontSize: 12, fontWeight: 700 }}>
								{format(new Date(objection.createdAt), "dd/MM HH:mm")}
							</Typography>
						</Stack>
						{objection.reason && (
							<Typography variant="body2" sx={{ mt: 0.5, color: "var(--ink-soft)", lineHeight: 1.45 }}>
								{objection.reason}
							</Typography>
						)}
					</Box>
				)}
			</Stack>
			<Stack
				direction="row"
				spacing={0.75}
				sx={{
					mt: 1.75,
					flexWrap: { xs: "wrap", sm: "nowrap" },
					alignItems: "center",
					overflowX: { xs: "visible", sm: "auto" },
					pb: { xs: 0, sm: 0.25 },
				}}
			>
				<Button
					data-testid="validate-anyway-button"
					variant="contained"
					onClick={validate}
					disabled={submitting}
					color="success"
					startIcon={<CheckCircleOutline />}
					size="medium"
					sx={decisionButtonSx}
				>
					Valider quand même
				</Button>
				<Button
					data-testid="edit-pending-button"
					variant="outlined"
					onClick={editReservation}
					disabled={submitting}
					startIcon={<EditOutlined />}
					size="medium"
					sx={decisionButtonSx}
				>
					Modifier
				</Button>
				<Button
					data-testid="cancel-pending-button"
					variant="outlined"
					onClick={cancel}
					disabled={submitting}
					color="error"
					startIcon={<DeleteOutline />}
					size="medium"
					sx={decisionButtonSx}
				>
					Annuler
				</Button>
				{reservation.topicId && (
					<Button
						data-testid="open-topic-button"
						variant="text"
						onClick={goToTopic}
						disabled={submitting}
						startIcon={<ForumOutlined />}
						size="medium"
						sx={decisionButtonSx}
					>
						Ouvrir la discussion
					</Button>
				)}
			</Stack>
		</Box>
	);
}
