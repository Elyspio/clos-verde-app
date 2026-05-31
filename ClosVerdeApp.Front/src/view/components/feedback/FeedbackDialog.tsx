import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { Close } from "@mui/icons-material";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useFeedbackMutations } from "@data/feedback/feedback.mutations";
import type { FeedbackCategory } from "@apis/rest/api/generated";
import { CategoryPicker } from "./CategoryPicker";
import { FeedbackForm } from "./FeedbackForm";
import { FeedbackSent } from "./FeedbackSent";

type Step = "category" | "form" | "sent";

type Props = {
	open: boolean;
	onClose: () => void;
};

const APP_VERSION = (import.meta as unknown as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION ?? "dev";

/**
 * Three-step feedback flow inside a single MUI dialog: pick a category, fill the
 * form, see a confirmation. All steps share the same Dialog chrome, so the
 * transition feels like content reflow rather than a stack of modals.
 */
export function FeedbackDialog({ open, onClose }: Props) {
	const [step, setStep] = useState<Step>("category");
	const [category, setCategory] = useState<FeedbackCategory | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const createMutation = useFeedbackMutations.create();

	// Reset internal state whenever the dialog (re-)opens, so a previously-sent
	// flow doesn't start its successor on the "Sent" screen.
	useEffect(() => {
		if (open) {
			setStep("category");
			setCategory(null);
			setSubmitError(null);
		}
	}, [open]);

	const handlePick = (picked: FeedbackCategory) => {
		setCategory(picked);
		setStep("form");
		setSubmitError(null);
	};

	const handleSubmit = async ({ title, body, attachmentIds }: { title: string; body: string; attachmentIds: string[] }) => {
		if (!category) return;
		setSubmitError(null);
		try {
			await createMutation.mutateAsync({
				category,
				title,
				body,
				attachmentIds,
				context: {
					url: typeof window !== "undefined" ? window.location.href : null,
					userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
					appVersion: APP_VERSION,
				},
			});
			setStep("sent");
		} catch (e) {
			setSubmitError(e instanceof Error ? e.message : "Envoi impossible.");
		}
	};

	const handleClose = () => {
		// Don't allow closing mid-submit — the mutation is short and we want the user to land
		// on the confirmation, not a hanging spinner.
		if (createMutation.isPending) return;
		onClose();
	};

	return (
		<Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" data-testid="feedback-dialog">
			<DialogTitle sx={{ pr: 6, pb: 0 }}>
				<IconButton
					aria-label="Fermer"
					onClick={handleClose}
					data-testid="feedback-dialog-close"
					sx={{ position: "absolute", right: 12, top: 12, color: "var(--ink-soft)" }}
				>
					<Close />
				</IconButton>
			</DialogTitle>
			<DialogContent sx={{ pt: 1, pb: 3 }}>
				<AnimatePresence mode="wait">
					{step === "category" && (
						<motion.div
							key="category"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -4 }}
							transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
						>
							<CategoryPicker onPick={handlePick} />
						</motion.div>
					)}
					{step === "form" && category && (
						<motion.div
							key="form"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -4 }}
							transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
						>
							<FeedbackForm
								category={category}
								onBack={() => setStep("category")}
								onSubmit={handleSubmit}
								submitError={submitError}
								isSubmitting={createMutation.isPending}
							/>
						</motion.div>
					)}
					{step === "sent" && (
						<motion.div
							key="sent"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -4 }}
							transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
						>
							<FeedbackSent onClose={onClose} />
						</motion.div>
					)}
				</AnimatePresence>
			</DialogContent>
		</Dialog>
	);
}
