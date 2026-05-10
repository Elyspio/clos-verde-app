import type { NotificationsState } from "./notifications.types";

export { permissionChanged, pushStatusChanged, topicEngaged } from "./notifications.reducer";
export { fetchEngagedTopics, muteTopic, unmuteTopic } from "./notifications.async.actions";

export const selectIsTopicMuted = (state: { notifications: NotificationsState }, topicId: string | undefined) => !!topicId && state.notifications.mutedTopicIds.includes(topicId);

export const selectMutedTopicIds = (state: { notifications: NotificationsState }) => state.notifications.mutedTopicIds;

export const selectEngagedTopicIds = (state: { notifications: NotificationsState }) => state.notifications.engagedTopicIds;

export const selectNotificationPermission = (state: { notifications: NotificationsState }) => state.notifications.permission;

export const selectPushNotificationStatus = (state: { notifications: NotificationsState }) => state.notifications.pushStatus;
