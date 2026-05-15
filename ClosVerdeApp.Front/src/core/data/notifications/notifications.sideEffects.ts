import type { QueryClient } from "@tanstack/react-query";
import { backendApi } from "@apis/rest/api/clients/api.client";
import type { Message, PushSubscriptionRequest, Reservation, TopicListItem } from "@apis/rest/api/generated";
import { useClientStore } from "@data/client/clientStore";
import { topicsKeys } from "@data/topics/topics.keys";

/**
 * Show a native desktop notification when a message mentions the current user.
 * Skipped when: permission not granted, push is active (service worker handles it),
 * author is the current user, topic is muted, or the topic is focused with the page visible.
 */
function maybeNotify(qc: QueryClient, message: Message, currentUserId: string | null) {
	if (typeof window === "undefined" || !("Notification" in window)) return;
	if (Notification.permission !== "granted") return;
	if (useClientStore.getState().pushStatus === "subscribed") return;
	if (!currentUserId) return;
	if (message.authorUserId === currentUserId) return;
	if (message.isDeleted || message.isSystem) return;

	const items = qc.getQueryData<TopicListItem[]>(topicsKeys.list());
	const item = items?.find((x) => x.topic.id === message.topicId);
	if (item?.isMuted) return;

	const isMentioned = message.mentions.includes(currentUserId);
	if (!isMentioned) return;

	const focused = useClientStore.getState().focusedTopicId === message.topicId;
	const pageVisible = !document.hidden;
	if (focused && pageVisible) return;

	const topicName = item?.topic.name ?? "Discussion";
	const title = `${message.authorDisplayName} vous a mentionné dans ${topicName}`;
	const body = stripHtml(message.contentHtml).slice(0, 140);

	try {
		const notif = new Notification(title, { body, tag: `message:${message.id}` });
		notif.onclick = () => {
			window.focus();
			window.location.assign(`/messages/${message.topicId}`);
			notif.close();
		};
	} catch {
		// Some browsers (mobile) throw if not from a service worker; degrade silently.
	}
}

/**
 * Show a native desktop notification when another user creates a reservation and the page is hidden.
 * Skipped when push is active (service worker handles it).
 */
function maybeNotifyReservation(reservation: Reservation, currentUserId: string | null) {
	if (typeof window === "undefined" || !("Notification" in window)) return;
	if (Notification.permission !== "granted") return;
	if (useClientStore.getState().pushStatus === "subscribed") return;
	if (!currentUserId || reservation.user.id === currentUserId) return;
	if (!document.hidden) return;

	try {
		const notif = new Notification("Nouvelle réservation", {
			body: `${reservation.user.displayName} a créé une réservation.`,
			tag: `reservation:${reservation.id}`,
		});
		notif.onclick = () => {
			window.focus();
			window.location.assign("/calendrier");
			notif.close();
		};
	} catch {
		// Some browsers throw if not from a service worker; degrade silently.
	}
}

/**
 * Request browser notification permission, then register for Web Push if granted.
 * Updates `pushStatus` / `notifPermission` in the client store throughout the flow.
 * Called from `NotificationOnboarding` and the UserMenu toggle.
 */
async function requestPermission() {
	const { setNotifPermission, setPushStatus } = useClientStore.getState();
	if (!supportsNotifications()) {
		setNotifPermission("unsupported");
		setPushStatus("unsupported");
		return;
	}
	if (!supportsPush()) {
		setNotifPermission(Notification.permission);
		setPushStatus("unsupported");
		return;
	}

	try {
		setPushStatus("subscribing");
		const result = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
		setNotifPermission(result);
		if (result !== "granted") {
			setPushStatus("idle");
			return;
		}

		await registerPushSubscription();
		setPushStatus("subscribed");
	} catch {
		setPushStatus("error", "Activation impossible.");
	}
}

/**
 * Sync push state from the browser's existing subscription without prompting.
 * Called once on startup so the UI reflects the correct state from a previous session.
 */
async function refreshPushStatus() {
	const { setNotifPermission, setPushStatus } = useClientStore.getState();
	if (!supportsNotifications()) {
		setNotifPermission("unsupported");
		setPushStatus("unsupported");
		return;
	}
	setNotifPermission(Notification.permission);
	if (!supportsPush() || Notification.permission !== "granted") {
		setPushStatus(supportsPush() ? "idle" : "unsupported");
		return;
	}
	try {
		const registration = await navigator.serviceWorker.getRegistration();
		const subscription = await registration?.pushManager.getSubscription();
		if (subscription) {
			await backendApi.notificationsSavePushSubscription(toPushSubscriptionRequest(subscription));
			setPushStatus("subscribed");
		} else {
			setPushStatus("idle");
		}
	} catch {
		setPushStatus("idle");
	}
}

function stripHtml(html: string): string {
	const tmp = document.createElement("div");
	tmp.innerHTML = html;
	return (tmp.textContent ?? "").trim();
}

function supportsNotifications() {
	return typeof window !== "undefined" && "Notification" in window;
}

function supportsPush() {
	return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/** Register the push service worker, subscribe, and send the subscription to the backend. */
async function registerPushSubscription() {
	const keyResponse = await backendApi.notificationsGetVapidPublicKey();
	const publicKey = keyResponse.data.publicKey;
	const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}push-worker.js`);
	const existing = await registration.pushManager.getSubscription();
	const subscription =
		existing ??
		(await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(publicKey),
		}));

	const payload = toPushSubscriptionRequest(subscription);
	await backendApi.notificationsSavePushSubscription(payload);
}

function toPushSubscriptionRequest(subscription: PushSubscription): PushSubscriptionRequest {
	const json = subscription.toJSON();
	if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Subscription invalide.");

	return {
		endpoint: json.endpoint,
		keys: {
			p256dh: json.keys.p256dh,
			auth: json.keys.auth,
		},
		userAgent: navigator.userAgent,
	};
}

/** Decode a URL-safe base64 string to `Uint8Array` — required by `PushManager.subscribe`. */
function urlBase64ToUint8Array(value: string) {
	const padding = "=".repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
	return outputArray;
}

export const notificationsSideEffects = {
	maybeNotify,
	maybeNotifyReservation,
	requestPermission,
	refreshPushStatus,
};
