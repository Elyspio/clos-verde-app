import { BugReportOutlined, ChatBubbleOutline, HelpOutlineOutlined, LightbulbOutlined } from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import type { FeedbackCategory } from "@apis/rest/api/generated";

export type CategoryMeta = {
	category: FeedbackCategory;
	label: string;
	tagline: string;
	icon: SvgIconComponent;
	/** CSS color var for the accent strokes/chips. */
	accent: string;
	/** CSS color var for the soft tinted backgrounds. */
	accentSoft: string;
	/** Placeholder for the title input — contextual nudge. */
	titlePlaceholder: string;
	/** Bulleted prompts shown in the right "À mentionner" panel. */
	checklist: string[];
};

/**
 * Single source of truth for everything that varies per category (label, icon,
 * accent colour, contextual checklist). Keeps the picker, the form right-pane,
 * and the admin board's chips in sync.
 */
export const CATEGORY_META: Record<FeedbackCategory, CategoryMeta> = {
	Bug: {
		category: "Bug",
		label: "Bug",
		tagline: "Signaler un comportement inattendu de l'application.",
		icon: BugReportOutlined,
		accent: "var(--coral)",
		accentSoft: "var(--coral-soft)",
		titlePlaceholder: "Résumez le problème rencontré",
		checklist: ["L'action en cours au moment du problème", "Le comportement observé", "Le comportement attendu", "Le navigateur et l'appareil utilisés"],
	},
	Suggestion: {
		category: "Suggestion",
		label: "Suggestion",
		tagline: "Proposer une amélioration ou une nouvelle fonctionnalité.",
		icon: LightbulbOutlined,
		accent: "var(--mint)",
		accentSoft: "var(--mint-soft)",
		titlePlaceholder: "Résumez votre proposition",
		checklist: ["Le besoin sous-jacent", "La pratique actuelle pour y répondre", "La solution envisagée"],
	},
	Question: {
		category: "Question",
		label: "Question",
		tagline: "Demander une clarification ou un complément d'information.",
		icon: HelpOutlineOutlined,
		accent: "var(--primary-blue)",
		accentSoft: "var(--primary-blue-soft)",
		titlePlaceholder: "Formulez votre question",
		checklist: ["Le contexte de votre question", "Les pistes déjà explorées"],
	},
	Other: {
		category: "Other",
		label: "Autre",
		tagline: "Tout retour ne correspondant à aucune des catégories ci-dessus.",
		icon: ChatBubbleOutline,
		accent: "var(--ink-soft)",
		accentSoft: "var(--surface-soft)",
		titlePlaceholder: "Résumez votre retour",
		checklist: ["Précisez le contexte autant que possible"],
	},
};

export const ALL_CATEGORIES: FeedbackCategory[] = ["Bug", "Suggestion", "Question", "Other"];
