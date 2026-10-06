import { Box, MenuItem, MenuList, Paper } from "@mui/material";
import { forwardRef, useImperativeHandle, useState } from "react";

export type MentionItem = {
	id: string;
	label: string;
};

export type MentionListProps = {
	items: MentionItem[];
	command: (item: { id: string; label: string }) => void;
};

export type MentionListRef = {
	onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

/**
 * Tiptap mention popup. Renders a keyboard-navigable list of suggested users; the parent
 * editor calls `onKeyDown` so arrow/enter keys are intercepted before the editor sees them.
 */
export const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [itemsForSelection, setItemsForSelection] = useState(props.items);

	// New suggestions reset the highlighted entry (adjusted during render, not in an effect).
	if (itemsForSelection !== props.items) {
		setItemsForSelection(props.items);
		setSelectedIndex(0);
	}

	useImperativeHandle(ref, () => ({
		onKeyDown: ({ event }) => {
			if (event.key === "ArrowUp") {
				setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
				return true;
			}
			if (event.key === "ArrowDown") {
				setSelectedIndex((selectedIndex + 1) % props.items.length);
				return true;
			}
			if (event.key === "Enter") {
				const item = props.items[selectedIndex];
				if (item) props.command({ id: item.id, label: item.label });
				return true;
			}
			return false;
		},
	}));

	if (props.items.length === 0) {
		return (
			<Paper elevation={3} sx={{ minWidth: 180 }}>
				<Box sx={{ p: 1.25, fontSize: 12, color: "var(--ink-mute)" }}>Aucun utilisateur</Box>
			</Paper>
		);
	}

	return (
		<Paper elevation={3} sx={{ minWidth: 180 }}>
			{/* MUI 9: MenuItem must be rendered inside a Menu or MenuList. */}
			<MenuList disablePadding>
				{props.items.map((item, index) => (
					<MenuItem key={item.id} selected={index === selectedIndex} onClick={() => props.command({ id: item.id, label: item.label })} sx={{ fontSize: 13 }}>
						{item.label}
					</MenuItem>
				))}
			</MenuList>
		</Paper>
	);
});

MentionList.displayName = "MentionList";
