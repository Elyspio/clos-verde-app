import { create } from "zustand";

/**
 * Browser notification permission, plus two app-specific values:
 * - `"unsupported"` — `Notification` API unavailable (some mobile browsers, SSR).
 * - `"unknown"`     — not yet checked (before `refreshPushStatus` runs on startup).
 */
export type NotifPermission = NotificationPermission | "unsupported" | "unknown";

/**
 * Web Push subscription lifecycle:
 * - `"unsupported"` — browser doesn't support `PushManager`.
 * - `"idle"`        — supported but not subscribed (user hasn't accepted or declined).
 * - `"subscribing"` — `requestPermission()` in progress.
 * - `"subscribed"`  — active subscription; server delivers notifications.
 * - `"error"`       — subscription failed; see `pushError` for the reason.
 */
export type PushStatus = "unsupported" | "idle" | "subscribing" | "subscribed" | "error";

export type ClientState = {
	/**
	 * Id of the topic currently open in TopicView, or null when none is focused.
	 * Read synchronously via `useClientStore.getState()` inside SignalR callbacks
	 * to decide whether to bump unread counts or show a notification.
	 */
	focusedTopicId: string | null;

	/** Current browser-level notification permission. Initialised from `Notification.permission` on load. */
	notifPermission: NotifPermission;

	/** Current Web Push subscription state. */
	pushStatus: PushStatus;

	/** Human-readable error when `pushStatus === "error"`, otherwise null. */
	pushError: string | null;

	/** Mark a topic as focused (called on mount in TopicView). */
	setFocusedTopic: (id: string | null) => void;

	/**
	 * Clear the focused topic only if it still matches `id`.
	 * Safe to call in an effect cleanup — prevents the next topic's mount
	 * from being wiped out by the previous topic's unmount.
	 */
	clearFocusedTopicIf: (id: string) => void;

	/** Update the cached notification permission (called after `Notification.requestPermission`). */
	setNotifPermission: (permission: NotifPermission) => void;

	/** Update push lifecycle status. Pass `error` when `status === "error"`; omit to clear it. */
	setPushStatus: (status: PushStatus, error?: string | null) => void;
};

const initialPermission: NotifPermission = typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";

export const useClientStore = create<ClientState>()((set) => ({
	focusedTopicId: null,
	notifPermission: initialPermission,
	pushStatus: "idle",
	pushError: null,
	setFocusedTopic: (id) => set({ focusedTopicId: id }),
	// Cleanup-safe: only clear if the focused topic is still the one we mounted with.
	// Prevents the next route's mount from being wiped out by the previous route's cleanup.
	clearFocusedTopicIf: (id) => set((state) => (state.focusedTopicId === id ? { focusedTopicId: null } : state)),
	setNotifPermission: (permission) => set({ notifPermission: permission }),
	setPushStatus: (status, error = null) => set({ pushStatus: status, pushError: error }),
}));
