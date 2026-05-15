import { Add } from "@mui/icons-material";
import { Badge, Box, Button, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTopicsQueries } from "@data/topics/topics.queries";
import { useUnreadQueries } from "@data/unread/unread.queries";
import type { Topic } from "@apis/rest/api/generated";
import { NewTopicDialog } from "./NewTopicDialog";

function Section({ title, topics }: { title: string; topics: Topic[] }) {
	if (topics.length === 0) return null;
	return (
		<Box>
			<Typography sx={{ px: 2, py: 1, fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--ink-mute)" }}>{title}</Typography>
			<Stack>
				{topics.map((t) => (
					<TopicRow key={t.id} topic={t} />
				))}
			</Stack>
		</Box>
	);
}

function TopicRow({ topic }: { topic: Topic }) {
	const unread = useUnreadQueries.byTopic(topic.id);
	return (
		<Box
			component={NavLink}
			data-testid={`topic-row-${topic.id}`}
			data-topic-name={topic.name}
			data-topic-kind={topic.kind}
			to={`/messages/${topic.id}`}
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				px: 2,
				py: 1.25,
				color: "var(--ink)",
				textDecoration: "none",
				borderRadius: 1.5,
				mx: 1,
				"&.active": { bgcolor: "var(--surface-blue)" },
				"&:hover": { bgcolor: "var(--surface-soft)" },
			}}
		>
			<Box sx={{ minWidth: 0 }}>
				<Typography sx={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topic.name}</Typography>
				<Typography sx={{ fontSize: 11, color: "var(--ink-mute)" }}>
					{topic.messageCount} message{topic.messageCount > 1 ? "s" : ""}
				</Typography>
			</Box>
			{unread > 0 && <Badge badgeContent={unread} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 10, height: 16, minWidth: 16 } }} />}
		</Box>
	);
}

/**
 * Sidebar listing topics in three sections (Global / Custom / Reservation) with per-topic
 * unread badges. The "+" button opens the new-topic dialog.
 */
export function TopicList() {
	const topics = useTopicsQueries.all();
	const [creating, setCreating] = useState(false);

	const global = topics.filter((t) => t.kind === "Global");
	const reservations = topics.filter((t) => t.kind === "Reservation");
	const customs = topics.filter((t) => t.kind === "Custom");

	return (
		<Box data-testid="topic-list" sx={{ borderRight: { md: "1px solid var(--line)" }, height: "100%", display: "flex", flexDirection: "column" }}>
			<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
				<Typography sx={{ fontWeight: 800 }}>Discussions</Typography>
				<Button data-testid="new-topic-button" size="small" startIcon={<Add fontSize="inherit" />} onClick={() => setCreating(true)}>
					Nouveau
				</Button>
			</Stack>
			<Box sx={{ overflowY: "auto", flex: 1 }}>
				<Section title="Général" topics={global} />
				<Section title="Salons" topics={customs} />
				<Section title="Réservations en discussion" topics={reservations} />
			</Box>
			<NewTopicDialog open={creating} onClose={() => setCreating(false)} />
		</Box>
	);
}
