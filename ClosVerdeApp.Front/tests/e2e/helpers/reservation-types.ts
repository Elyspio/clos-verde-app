import type { Reservation as GeneratedReservation } from "../../../src/core/api/generated";

export type ReservationStatus = "Pending" | "Validated" | "Cancelled";

/**
 * Runtime shape of a reservation as returned by the API after the collaborative-validation
 * feature was added. The generated client is still on the older schema; cast through this
 * type until `pnpm refresh-api` is regenerated.
 */
export type ReservationFull = GeneratedReservation & {
	status: ReservationStatus;
	validationDeadline: string;
	topicId?: string | null;
	objectionCount: number;
	validatedAt?: string | null;
	cancelledAt?: string | null;
};
