import { CalendarMonth, ChatBubbleOutline, EventAvailable, FeedbackOutlined, Leaderboard } from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";

/**
 * Source of truth for the FAQ page content. Kept in one file so the prose mirrors
 * the onboarding email (`docs/email/presentation-clos-verde.html`) — when one
 * evolves, the other follows.
 */
export type FaqSectionContent = {
	id: string;
	icon: SvgIconComponent;
	accent: string;
	accentSoft: string;
	title: string;
	intro: string;
	bullets?: string[];
	tip?: string;
};

export type FaqQuestion = {
	id: string;
	question: string;
	answer: string;
};

export const FAQ_SECTIONS: FaqSectionContent[] = [
	{
		id: "calendar",
		icon: CalendarMonth,
		accent: "var(--mint)",
		accentSoft: "var(--mint-soft)",
		title: "Le calendrier",
		intro: "Une vue mensuelle claire de toutes les réservations. Vos créneaux apparaissent en bleu, ceux des autres copropriétaires en vert. Vous naviguez entre les mois avec les flèches et vous voyez immédiatement si la place est libre.",
		bullets: [
			"Le statut de chaque réservation est visible d'un coup d'œil : en attente, validée ou annulée.",
			"Un clic sur un créneau ouvre son détail (auteur, dates, note éventuelle).",
		],
	},
	{
		id: "reservation",
		icon: EventAvailable,
		accent: "var(--primary-blue)",
		accentSoft: "var(--primary-blue-soft)",
		title: "Réserver la place",
		intro: "Le workflow se déroule en trois temps, sans qu'il soit nécessaire d'écrire à qui que ce soit en parallèle.",
		bullets: [
			"Vous déposez votre demande depuis le calendrier — via le bouton « Réserver un jour » ou en cliquant directement sur un jour libre. Elle apparaît immédiatement sur le calendrier au statut « En attente ».",
			"Pendant un court délai (par défaut une heure, ou jusqu'à la date de début si elle est plus proche), tout copropriétaire peut s'opposer s'il a un conflit. L'objection ouvre alors une discussion dédiée pour en parler ensemble.",
			"Si aucune objection n'est déposée à la fin du délai, la réservation passe automatiquement en « Validée ». Vous n'avez rien à faire de plus.",
		],
		tip: "Vous pouvez modifier ou annuler votre propre réservation directement depuis le calendrier.",
	},
	{
		id: "leaderboard",
		icon: Leaderboard,
		accent: "var(--coral)",
		accentSoft: "var(--coral-soft)",
		title: "Le classement",
		intro: "Accessible depuis l'onglet « Classement » du calendrier, il affiche les jours de réservation cumulés depuis le début, sans quota imposé. L'objectif n'est pas de compter pour compter mais de garder une vue d'ensemble afin que chacun puisse profiter de la place équitablement.",
	},
	{
		id: "messages",
		icon: ChatBubbleOutline,
		accent: "var(--ink-soft)",
		accentSoft: "var(--surface-soft)",
		title: "Discuter ensemble",
		intro: "Une messagerie pensée pour le clos : une discussion « Général » accessible à tous, et la possibilité de créer des sujets dédiés. Les messages arrivent en temps réel, sans rafraîchir la page. C'est aussi là qu'apparaissent les discussions ouvertes lors d'une objection sur une réservation.",
		bullets: [
			"Mentionnez un voisin avec « @ » suivi de son prénom pour qu'il soit notifié.",
			"Joignez images ou PDF à vos messages par glisser-déposer (25 Mo maximum par fichier).",
			"Mettez un sujet en sourdine depuis son menu (⋯) pour ne plus recevoir de notification.",
		],
	},
	{
		id: "tickets",
		icon: FeedbackOutlined,
		accent: "var(--warning)",
		accentSoft: "var(--warning-soft)",
		title: "Vos retours et vos tickets",
		intro: "Toute remontée (bug, suggestion, question) passe par le bouton « Avis » en haut à droite. Un parcours guidé en deux étapes vous aide à fournir les informations utiles à l'équipe.",
		bullets: [
			"Choisissez la catégorie qui correspond le mieux (Bug, Suggestion, Question, Autre).",
			"Décrivez votre retour et joignez si besoin une capture d'écran ou un PDF.",
			"Suivez vos tickets envoyés dans la rubrique « Mes tickets » : onglet « En cours » pour les ouverts, « Historique » pour les clôturés.",
			"Vous pouvez clôturer vous-même un ticket si vous estimez la question résolue.",
			"Lorsque l'équipe répond, sa réponse apparaît directement dans le détail du ticket, dans « Mes tickets ».",
		],
		tip: "Activez les notifications depuis le menu de votre compte (en bas de la barre latérale) pour être prévenu lorsqu'un retour reçoit une réponse.",
	},
];

export const FAQ_QUESTIONS: FaqQuestion[] = [
	{
		id: "cancel-reservation",
		question: "Comment annuler ou modifier une réservation ?",
		answer: "Depuis le calendrier, ouvrez la réservation concernée puis utilisez le bouton « Modifier » ou « Annuler ». Cette action n'est possible que sur vos propres réservations.",
	},
	{
		id: "pending-reservation",
		question: "Pourquoi ma réservation est-elle encore en attente ?",
		answer: "Le délai d'objection n'est pas encore écoulé. La réservation passera automatiquement au statut « Validée » à la fin du délai, sans action de votre part, sauf si quelqu'un dépose une objection.",
	},
	{
		id: "objection-received",
		question: "Quelqu'un s'est opposé à ma réservation, que faire ?",
		answer: "Une discussion s'ouvre automatiquement dans la messagerie. Rendez-vous dans Messages, retrouvez la conversation associée et échangez sereinement avec le copropriétaire concerné pour trouver un arrangement.",
	},
	{
		id: "enable-notifications",
		question: "Comment activer les notifications ?",
		answer: "Ouvrez votre menu de compte, en bas de la barre latérale (ou via le menu ☰ sur mobile), puis cliquez sur « Activer les notifications ». Acceptez la demande du navigateur. Vous serez alors prévenu en temps réel des mentions, des objections et des réponses à vos tickets.",
	},
	{
		id: "mute-topic",
		question: "Comment couper les notifications d'un sujet de discussion ?",
		answer: "Dans la liste des sujets, ouvrez le menu (⋯) du sujet concerné puis sélectionnez « Mettre en sourdine ». Aucune notification ne sera plus envoyée pour ce sujet, mais vous continuerez à voir les messages.",
	},
	{
		id: "mention-user",
		question: "Comment mentionner un voisin dans un message ?",
		answer: "Tapez « @ » dans le champ du message puis le début de son prénom. Sélectionnez le bon contact dans la liste qui apparaît. Il recevra une notification si elle est activée.",
	},
	{
		id: "send-feedback",
		question: "Comment envoyer un retour, un bug ou une suggestion ?",
		answer: "Cliquez sur le bouton « Avis » en haut à droite de l'application, choisissez la catégorie la plus appropriée puis remplissez le formulaire. Vous pouvez y joindre une capture d'écran si nécessaire.",
	},
	{
		id: "find-my-tickets",
		question: "Où retrouver mes retours envoyés ?",
		answer: "Dans la barre latérale, groupe « Informations », la rubrique « Mes tickets » liste l'ensemble de vos retours envoyés. L'onglet « En cours » affiche les tickets ouverts, l'onglet « Historique » ceux qui sont clôturés. Le détail d'un ticket reprend aussi les réponses de l'équipe.",
	},
];
