import { Box, Stack, Typography } from "@mui/material";

const items = [
	{ label: "Vos réservations", sx: { bgcolor: "var(--primary-blue)" } },
	{ label: "Autres copropriétaires", sx: { bgcolor: "var(--mint)" } },
	{ label: "Aujourd'hui", sx: { bgcolor: "var(--surface)", borderColor: "var(--primary-blue)" } },
];

export function Legend() {
	return (
		<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
			{items.map((item) => (
				<Stack key={item.label} direction="row" spacing={1} alignItems="center">
					<Box sx={{ width: 14, height: 14, borderRadius: "5px", border: "1px solid var(--line)", ...item.sx }} />
					<Typography variant="caption">{item.label}</Typography>
				</Stack>
			))}
		</Stack>
	);
}
