import type { Reservation as GeneratedReservation } from "../../../src/core/apis/rest/api/generated";

export type ReservationStatus = "Pending" | "Validated" | "Cancelled";

export type ReservationFull = GeneratedReservation & {
	user: {
		id: string;
		displayName: string;
	};
	validation: {
		status: ReservationStatus;
		deadline: string;
		validatedAt?: string | null;
		cancelledAt?: string | null;
	};
	topicId?: string | null;
	objection?: {
		id: string;
		reservationId: string;
		user: {
			id: string;
			displayName: string;
		};
		reason?: string | null;
		createdAt: string;
	} | null;
};
