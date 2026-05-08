export const routes = {
	auth: {
		login: { path: "/login" },
		callback: { path: "/login/callback" },
	},
	app: {
		root: { path: "/" },
		calendar: { path: "/calendrier" },
		reservation: { path: "/reserver" },
		leaderboard: { path: "/classement" },
		messages: { path: "/messages" },
		messageTopic: { path: "/messages/:topicId" },
	},
} as const;
