export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  date: string;
};

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "age-threshold",
    title: "New age threshold flag",
    body: "Maria L. Santos is newly eligible for the Octogenarian Grant.",
    date: "Today",
  },
  {
    id: "distribution-reminder",
    title: "Distribution reminder",
    body: "Q2 2026 Social Pension release is scheduled for Apr 25.",
    date: "Yesterday",
  },
  {
    id: "report-approved",
    title: "Report approved",
    body: "Municipal Senior Citizen Registry was approved by the OSCA Head.",
    date: "Apr 15",
  },
];

const STORAGE_KEY = "bulan-notification-state";
export const NOTIFICATIONS_CHANGED_EVENT = "bulan-notifications-updated";

type NotificationState = {
  read: string[];
  deleted: string[];
};

function getState(): NotificationState {
  if (typeof window === "undefined") return { read: [], deleted: [] };
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "") as NotificationState;
  } catch {
    return { read: [], deleted: [] };
  }
}

function saveState(state: NotificationState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export function getNotificationState() {
  return getState();
}

export function getUnreadNotificationCount() {
  const state = getState();
  return INITIAL_NOTIFICATIONS.filter(
    (notification) => !state.deleted.includes(notification.id) && !state.read.includes(notification.id),
  ).length;
}

export function markNotificationRead(id: string) {
  const state = getState();
  if (!state.read.includes(id)) saveState({ ...state, read: [...state.read, id] });
}

export function markNotificationUnread(id: string) {
  const state = getState();
  if (state.read.includes(id)) {
    saveState({ ...state, read: state.read.filter((notificationId) => notificationId !== id) });
  }
}

export function markAllNotificationsRead() {
  const state = getState();
  saveState({
    ...state,
    read: [...new Set([...state.read, ...INITIAL_NOTIFICATIONS.map((notification) => notification.id)])],
  });
}

export function deleteNotification(id: string) {
  const state = getState();
  if (!state.deleted.includes(id)) saveState({ ...state, deleted: [...state.deleted, id] });
}