export type { CreateReservationRequest, LeaderboardEntry } from "@/core/api/generated";

export type ApiError = { status: number; message: string };

export type AuthUser = {
	id: string;
	displayName?: string;
	email?: string;
};

export type ReservationStatus = "Pending" | "Validated" | "Cancelled";

// Override the generated Reservation with the extended shape produced by the backend.
export type Reservation = {
	id: string;
	userId: string;
	userDisplayName: string;
	startDate: string;
	endDate: string;
	note?: string | null;
	createdAt: string;
	status: ReservationStatus;
	validationDeadline: string;
	topicId?: string | null;
	objectionCount: number;
	validatedAt?: string | null;
	cancelledAt?: string | null;
};

export type Objection = {
	id: string;
	reservationId: string;
	userId: string;
	userDisplayName: string;
	reason?: string | null;
	createdAt: string;
};

export type TopicKind = "Global" | "Custom" | "Reservation";

export type Topic = {
	id: string;
	kind: TopicKind;
	name: string;
	createdByUserId?: string | null;
	createdByDisplayName?: string | null;
	reservationId?: string | null;
	createdAt: string;
	updatedAt: string;
	lastMessageAt?: string | null;
	messageCount: number;
};

export type Message = {
	id: string;
	topicId: string;
	authorUserId: string;
	authorDisplayName: string;
	contentHtml: string;
	mentions: string[];
	createdAt: string;
	editedAt?: string | null;
	isDeleted: boolean;
	isSystem: boolean;
};

export type TopicListItem = {
	topic: Topic;
	unreadCount: number;
	lastReadAt?: string | null;
};

/** A user from the Keycloak realm directory; powers `@mention` suggestions in the composer. */
export type DirectoryUser = {
	id: string;
	displayName: string;
	email?: string | null;
};
