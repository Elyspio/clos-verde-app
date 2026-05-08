import { Box, Button, Stack, Typography } from "@mui/material";
import { addMonths, format, subMonths } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { capitalize } from "./date-utils";
import { Legend } from "./Legend";

type MonthHeaderProps = {
	monthDate: Date;
	onChangeMonth: (date: Date) => void;
};

export function MonthHeader({ monthDate, onChangeMonth }: MonthHeaderProps) {
	const previous = subMonths(monthDate, 1);
	const next = addMonths(monthDate, 1);

	return (
		<Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr auto" }} gap={4} alignItems="end" mb={4}>
			<Box>
				<Stack direction="row" spacing={1} mb={2}>
					<Button variant="outlined" onClick={() => onChangeMonth(previous)} sx={{ py: 0.8 }}>
						← {format(previous, "MMMM", { locale: fr })}
					</Button>
					<Button variant="outlined" onClick={() => onChangeMonth(next)} sx={{ py: 0.8 }}>
						{format(next, "MMMM", { locale: fr })} →
					</Button>
				</Stack>
				<Typography variant="h1">{capitalize(format(monthDate, "MMMM yyyy", { locale: fr }))}</Typography>
			</Box>
			<Legend />
		</Box>
	);
}
