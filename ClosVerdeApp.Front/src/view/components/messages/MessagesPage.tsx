import { Box, Container } from "@mui/material";
import { Outlet, useParams } from "react-router-dom";
import { TopicList } from "./TopicList";

/**
 * Two-pane messaging shell. Left: topic list. Right: the active topic via <Outlet />.
 * Mobile collapses to a single pane that swaps based on the URL.
 */
export function MessagesPage() {
	const { topicId } = useParams<{ topicId?: string }>();
	return (
		<Container data-testid="messages-page" maxWidth="xl" sx={{ maxWidth: "1280px", px: { xs: 0, md: 3 }, py: { xs: 0, md: 3 } }}>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", md: "300px 1fr" },
					height: { xs: "calc(100vh - 100px)", md: "calc(100vh - 140px)" },
					border: { md: "1px solid var(--line)" },
					borderRadius: { md: 2 },
					overflow: "hidden",
					bgcolor: "var(--surface)",
				}}
			>
				<Box sx={{ display: { xs: topicId ? "none" : "block", md: "block" }, height: "100%", minHeight: 0 }}>
					<TopicList />
				</Box>
				<Box sx={{ display: { xs: topicId ? "block" : "none", md: "block" }, height: "100%", minHeight: 0, position: "relative" }}>
					{topicId ? <Outlet /> : <EmptyState />}
				</Box>
			</Box>
		</Container>
	);
}

function EmptyState() {
	return (
		<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", p: 4 }}>
			<Box sx={{ textAlign: "center", color: "var(--ink-mute)" }}>Sélectionnez une discussion à gauche.</Box>
		</Box>
	);
}
