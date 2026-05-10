import type { AppStore } from "@/store";
import { backendApi } from "@apis/rest/api/clients/api.client";
import type { Message, PushSubscriptionRequest, Reservation, Topic } from "@apis/rest/api/generated";
import { permissionChanged, pushStatusChanged, topicEngaged } from "@/store/modules/notifications/notifications.actions";

/**
 * Decide whether and how to ring a desktop notification when a new message arrives.
 *
 * Rules (all must hold):
 *  1. The browser supports Notification and the user granted permission.
 *  2. The author is not the current user (no self-pings).
 *  3. The current user is mentioned in this message.
 *  4. The user has not muted this topic.
 *  5. The page is hidden OR the topic isn't currently focused — otherwise the in-app UI is enough.
 */

let storeRef: AppStore | null = null;

/** Wire the notifications module to the Redux store; call once at app boot. */
export function bindNotificationsStore(store: AppStore) {
	storeRef = store;
}

/** Ask the user for permission once, then register this browser for Web Push. */
export async function requestNotificationPermission() {
	if (!supportsNotifications()) {
		storeRef?.dispatch(permissionChanged("unsupported"));
		storeRef?.dispatch(pushStatusChanged({ status: "unsupported" }));
		return;
	}
	if (!supportsPush()) {
		storeRef?.dispatch(permissionChanged(Notification.permission));
		storeRef?.dispatch(pushStatusChanged({ status: "unsupported" }));
		return;
	}

	try {
		storeRef?.dispatch(pushStatusChanged({ status: "subscribing" }));
		const result = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
		storeRef?.dispatch(permissionChanged(result));
		if (result !== "granted") {
			storeRef?.dispatch(pushStatusChanged({ status: "idle" }));
			return;
		}

		await registerPushSubscription();
		storeRef?.dispatch(pushStatusChanged({ status: "subscribed" }));
	} catch {
		storeRef?.dispatch(pushStatusChanged({ status: "error", error: "Activation impossible." }));
	}
}

/** Refresh Redux from the existing browser subscription without prompting the user. */
export async function refreshPushSubscriptionStatus() {
	if (!supportsNotifications()) {
		storeRef?.dispatch(permissionChanged("unsupported"));
		storeRef?.dispatch(pushStatusChanged({ status: "unsupported" }));
		return;
	}
	storeRef?.dispatch(permissionChanged(Notification.permission));
	if (!supportsPush() || Notification.permission !== "granted") {
		storeRef?.dispatch(pushStatusChanged({ status: supportsPush() ? "idle" : "unsupported" }));
		return;
	}
	try {
		const registration = await navigator.serviceWorker.getRegistration();
		const subscription = await registration?.pushManager.getSubscription();
		storeRef?.dispatch(pushStatusChanged({ status: subscription ? "subscribed" : "idle" }));
	} catch {
		storeRef?.dispatch(pushStatusChanged({ status: "idle" }));
	}
}

/** Mark a topic as engaged after the current user posts in it (so future replies notify). */
export function markTopicEngaged(topicId: string) {
	storeRef?.dispatch(topicEngaged(topicId));
}

export function maybeNotify(message: Message) {
	const store = storeRef;
	if (!store) return;
	if (typeof window === "undefined" || !("Notification" in window)) return;
	if (Notification.permission !== "granted") return;

	const state = store.getState();
	if (state.notifications.pushStatus === "subscribed") return;
	const currentUserId = state.unread.currentUserId;
	if (!currentUserId) return;
	if (message.authorUserId === currentUserId) return;
	if (message.isDeleted || message.isSystem) return;

	const muted = state.notifications.mutedTopicIds.includes(message.topicId);
	if (muted) return;

	const isMentioned = message.mentions.includes(currentUserId);
	if (!isMentioned) return;

	const focused = state.unread.focusedTopicId === message.topicId;
	const pageVisible = !document.hidden;
	if (focused && pageVisible) return;

	const topic: Topic | undefined = state.topics.byId[message.topicId];
	const topicName = topic?.name ?? "Discussion";
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

export function maybeNotifyReservation(reservation: Reservation) {
	const store = storeRef;
	if (!store) return;
	if (typeof window === "undefined" || !("Notification" in window)) return;
	if (Notification.permission !== "granted") return;

	const state = store.getState();
	if (state.notifications.pushStatus === "subscribed") return;
	const currentUserId = state.unread.currentUserId;
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

function urlBase64ToUint8Array(value: string) {
	const padding = "=".repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
	return outputArray;
}
