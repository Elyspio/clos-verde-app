import { Chip } from "@mui/material";
import { Schedule } from "@mui/icons-material";
import { useEffect, useState } from "react";
import type { Reservation } from "@apis/rest/api/generated";

function formatRemaining(ms: number): string {
	if (ms <= 0) return "validation imminente";
	const minutes = Math.floor(ms / 60000);
	if (minutes >= 60) {
		const hours = Math.floor(minutes / 60);
		const rest = minutes % 60;
		return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
	}
	if (minutes >= 1) return `${minutes} min`;
	const seconds = Math.max(0, Math.floor(ms / 1000));
	return `${seconds} s`;
}

/**
 * Live status chip shown on Pending reservations. Counts down to the validation deadline
 * and switches to an "objection en cours" state when the reservation has at least one objection.
 */
export function PendingBadge({ reservation, compact = false }: { reservation: Reservation; compact?: boolean }) {
	const deadline = new Date(reservation.validation.deadline).getTime();
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, []);

	if (reservation.validation.status !== "Pending") return null;

	const remaining = deadline - now;
	const label = compact ? `En attente · ${formatRemaining(remaining)}` : `En attente — validation auto dans ${formatRemaining(remaining)}`;

	const hasObjection = Boolean(reservation.objection);

	return (
		<Chip
			data-testid="pending-badge"
			data-objection-count={hasObjection ? 1 : 0}
			size="small"
			icon={<Schedule sx={{ fontSize: 14 }} />}
			label={hasObjection ? "En attente — objection en cours" : label}
			sx={{
				bgcolor: hasObjection ? "rgba(245, 158, 11, 0.14)" : "rgba(59, 130, 246, 0.12)",
				color: hasObjection ? "#b45309" : "var(--primary-blue)",
				border: hasObjection ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(59, 130, 246, 0.25)",
				fontWeight: 700,
				height: compact ? 20 : 22,
				"& .MuiChip-label": { px: 1, fontSize: compact ? 10 : 11 },
				"& .MuiChip-icon": { color: "inherit", ml: 0.6 },
			}}
		/>
	);
}
