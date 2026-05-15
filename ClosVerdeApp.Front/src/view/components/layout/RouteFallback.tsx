import { Box, CircularProgress } from "@mui/material";

/**
 * Suspense fallback for lazy-loaded routes. Intentionally minimal: no `motion/react`
 * (which lives in its own vendor chunk) and reuses `CircularProgress` already pulled
 * in by other components — keeps the entry chunk small.
 */
export function RouteFallback() {
	return (
		<Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
			<CircularProgress size={28} />
		</Box>
	);
}
