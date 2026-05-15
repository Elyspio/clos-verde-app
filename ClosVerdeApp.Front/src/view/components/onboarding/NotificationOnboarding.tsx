import { useEffect, useState } from "react";
import { useClientStore } from "@data/client/clientStore";
import { notificationsSideEffects } from "@data/notifications/notifications.sideEffects";
import { NotificationExplainerDialog } from "./NotificationExplainerDialog";
import { NotificationPromptDialog } from "./NotificationPromptDialog";

const STORAGE_KEY = "clos-verde-app.notification-onboarding";

type Step = "hidden" | "prompt" | "explainer";

function hasBeenShown(): boolean {
	if (typeof window === "undefined") return true;
	return window.localStorage.getItem(STORAGE_KEY) !== null;
}

function markShown(action: "accepted" | "declined" | "dismissed"): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, action);
	} catch {
		// Quota exceeded / private mode — fail silently. Worst case the user gets re-prompted next session.
	}
}

/**
 * Orchestrates the first-visit notification prompt + the reassurance follow-up.
 *
 * Gating (all must hold to show the prompt):
 * 1. The browser supports notifications and we're not already subscribed/erroring.
 * 2. The user has never been asked at the browser level (`Notification.permission === "default"`).
 * 3. We haven't shown the onboarding in this browser before (`localStorage` flag).
 *
 * The "X" close = dismissed (no follow-up).
 * The "Pas maintenant" button = declined → triggers the explainer dialog.
 * The "Activer" button = accepted → calls the existing `requestPermission()` flow.
 */
export function NotificationOnboarding() {
	const pushStatus = useClientStore((s) => s.pushStatus);
	const notifPermission = useClientStore((s) => s.notifPermission);
	const [step, setStep] = useState<Step>("hidden");

	useEffect(() => {
		if (hasBeenShown()) return;
		// Skip when notifications can't or shouldn't be offered: unsupported devices,
		// already-subscribed users, ongoing flow, or browser-level decision already made.
		if (pushStatus !== "idle") return;
		if (notifPermission !== "default" && notifPermission !== "unknown") return;

		// Small delay so the dialog doesn't slam in during first paint, and so the
		// auth-protected layout has a moment to render behind it.
		const timer = setTimeout(() => setStep("prompt"), 1200);
		return () => clearTimeout(timer);
	}, [pushStatus, notifPermission]);

	const handleAccept = () => {
		markShown("accepted");
		setStep("hidden");
		void notificationsSideEffects.requestPermission();
	};

	const handleDecline = () => {
		setStep("explainer");
	};

	const handleDismiss = () => {
		markShown("dismissed");
		setStep("hidden");
	};

	const handleExplainerClose = () => {
		markShown("declined");
		setStep("hidden");
	};

	return (
		<>
			<NotificationPromptDialog open={step === "prompt"} onAccept={handleAccept} onDecline={handleDecline} onDismiss={handleDismiss} />
			<NotificationExplainerDialog open={step === "explainer"} onClose={handleExplainerClose} />
		</>
	);
}
