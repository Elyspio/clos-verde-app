import { Box, Container, Stack, Typography } from "@mui/material";
import { motion } from "motion/react";
import { useReservationsQueries } from "@data/reservations/reservations.queries";

export function LeaderboardPage() {
	const { data: leaderboard = [], isPending } = useReservationsQueries.leaderboard();

	return (
		<Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, px: { xs: 2.5, md: 5 } }}>
			<Typography variant="h1">Classement</Typography>
			<Typography variant="body1" color="text.secondary" mt={1.5} mb={5}>
				Jours cumulés depuis le début. Pour partager équitablement la place.
			</Typography>
			<Box
				component={motion.div}
				data-testid="leaderboard-list"
				initial="hidden"
				animate="visible"
				variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
				sx={{ borderTop: "1px solid var(--line)" }}
			>
				{leaderboard.map((entry) => (
					<Box
						key={entry.userId}
						component={motion.div}
						data-testid={`leaderboard-row-${entry.userId}`}
						variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
						sx={{
							display: "flex",
							alignItems: "center",
							gap: { xs: 2, md: 4 },
							borderBottom: "1px solid var(--line)",
							py: entry.rank === 1 ? 3.5 : 3,
							px: entry.rank === 1 ? { xs: 1.5, md: 2.5 } : 0,
							bgcolor: entry.rank === 1 ? "var(--surface-blue)" : "transparent",
							borderLeft: entry.rank === 1 ? "4px solid var(--primary-blue)" : "4px solid transparent",
							borderRadius: entry.rank === 1 ? "14px" : 0,
						}}
					>
						<Typography
							className="mono"
							sx={{
								width: { xs: 48, md: 80 },
								fontSize: { xs: 22, md: 28 },
								fontWeight: 800,
								fontVariantNumeric: "tabular-nums",
								color: entry.rank === 1 ? "var(--primary-blue)" : "var(--ink-mute)",
							}}
						>
							{String(entry.rank).padStart(2, "0")}
						</Typography>
						<Typography sx={{ flex: 1, fontSize: { xs: 16, md: 18 }, fontWeight: 700, minWidth: 0 }}>{entry.displayName}</Typography>
						<Typography variant="body2" sx={{ width: 200, display: { xs: "none", sm: "block" } }}>
							{entry.reservationCount} réservation{entry.reservationCount > 1 ? "s" : ""}
						</Typography>
						<Stack direction="row" spacing={0.5} alignItems="baseline" justifyContent="flex-end" sx={{ width: { xs: 74, md: 120 } }}>
							<Typography className="mono" sx={{ fontSize: { xs: 24, md: 28 }, fontWeight: 800 }}>
								{entry.totalDays}
							</Typography>
							<Typography variant="caption">j</Typography>
						</Stack>
					</Box>
				))}
				{leaderboard.length === 0 && (
					<Typography variant="body2" sx={{ py: 4, borderBottom: "1px solid var(--line)" }}>
						{isPending ? "Chargement du classement..." : "Aucune réservation pour le moment."}
					</Typography>
				)}
			</Box>
			<Typography sx={{ mt: 4, color: "var(--ink-soft)", fontSize: 12 }}>Le classement encourage un partage équitable. Pas de quota imposé.</Typography>
		</Container>
	);
}
