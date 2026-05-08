import { Box, Divider, Typography } from "@mui/material";
import { motion } from "motion/react";

export function SplashScreen() {
	return (
		<Box minHeight="100vh" display="grid" sx={{ placeItems: "center", backgroundColor: "var(--app-bg)" }}>
			<Box textAlign="center">
				<Typography component="p" sx={{ fontSize: { xs: 40, md: 54 }, lineHeight: 1, fontWeight: 800 }}>
					Clos Verde
				</Typography>
				<Divider
					component={motion.div}
					animate={{ opacity: [0.25, 1, 0.25] }}
					transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
					sx={{ width: 64, mx: "auto", mt: 3, borderColor: "var(--primary-blue)", borderBottomWidth: 3, borderRadius: 99 }}
				/>
			</Box>
		</Box>
	);
}
