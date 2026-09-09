const API_URL = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api").replace(/\/$/, "");
const TOKEN_KEY = "bulan-api-token";
const USER_KEY = "bulan-api-user";
const REMEMBER_UNTIL_KEY = "bulan-api-remember-until";

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  birthdate?: string | null;
  barangay_id?: number | null;
  contact_number?: string | null;
  profile_photo_path?: string | null;
  roles?: Array<{ name: string }>;
};

export type ManagedUser = ApiUser & {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  birthdate?: string | null;
  barangay_id?: number | null;
  status: "active" | "inactive";
};


export type ApiSenior = {
  id: number;
  osca_id_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  birthdate: string;
  address?: string | null;
  contact_number?: string | null;
  photo_path?: string | null;
  id_document_path?: string | null;
  valid_id_path?: string | null;
  birth_certificate_path?: string | null;
  status: "active" | "pending" | "inactive";
  barangay?: { barangay_name: string } | null;
  benefits?: Array<{ benefit_name: string; pivot?: { status: string; amount: string; date_distributed?: string | null } }>;
  encoder?: { id: number; name: string; role: string } | null;
};

export type Overview = {
  total_registered: number;
  active_seniors: number;
  pending_applications: number;
  benefits_distributed_amount: number;
  benefits_distributed_count: number;
  benefits_pending_count: number;
  benefits_failed_count: number;
  distribution_percentage: number;
  received_by_benefit: Array<{ benefit: string; age_range: string; received_count: number }>;
};

export type BenefitTransaction = {
  id: number;
  amount: string;
  created_at?: string;
  updated_at?: string;
  status: "pending" | "released" | "failed";
  period_label?: string | null;
  date_distributed?: string | null;
  reference_number?: string | null;
  remarks?: string | null;
  senior: {
    osca_id_number: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    address?: string | null;
    barangay?: { barangay_name: string } | null;
    encoder?: { name: string; role: string } | null;
  };
  benefit: { benefit_name: string; amount?: string | null };
  distributor?: { name: string; role: string } | null;
  attachment_path?: string | null;
  creator?: { name: string; role: string } | null;
  updater?: { name: string; role: string } | null;
};

export type BenefitRelease = {
  id: number;
  period_label: string;
  amount: string;
  release_date: string;
  status: "scheduled" | "released" | "cancelled";
  remarks?: string | null;
  benefit: { benefit_name: string };
  creator?: { name: string; role: string } | null;
  updater?: { name: string; role: string } | null;
};

export type SeniorEditRequest = {
  id: number;
  status: "pending" | "approved" | "declined";
  changes: {
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    birthdate: string;
    address?: string | null;
    contact_number?: string | null;
    barangay: string;
    benefit: string;
  };
  senior: ApiSenior & { barangay?: { barangay_name: string } | null };
  requester: { id: number; name: string; role: string };
};

export type ArchivedSenior = Pick<ApiSenior, "osca_id_number" | "first_name" | "last_name"> & {
  deleted_at: string;
};

export type Announcement = {
  id: number;
  title: string;
  message: string;
  image_path?: string | null;
  published_at: string;
  creator?: { name: string };
  comments?: AnnouncementComment[];
};

export type AnnouncementComment = {
  id: number;
  message: string;
  created_at: string;
  user: { name: string; role: string };
  replies?: AnnouncementComment[];
};

export type Message = {
  id: number;
  subject: string;
  message: string;
  read_at: string | null;
  created_at: string;
  sender: { id: number; name: string; role: string; email: string };
  recipient: { id: number; name: string; role: string; email: string };
};

export type MessageRecipient = {
  id: number;
  name: string;
  email: string;
  role: "leader" | "head";
};

export type ServerNotification = {
  id: number;
  message: string;
  status: "unread" | "read" | "sent" | "failed";
  date_sent: string | null;
  created_at: string;
  source_type?: string | null;
  source_id?: number | null;
  sender?: { name: string; role: string };
};

export function getToken() {
  const rememberedUntil = getRememberedUntil();
  if (rememberedUntil && Number(rememberedUntil) <= Date.now()) {
    clearToken();
    return null;
  }

  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function getRememberedUntil() {
  return localStorage.getItem(REMEMBER_UNTIL_KEY);
}

export function setToken(token: string, rememberMe: boolean) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REMEMBER_UNTIL_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  if (rememberMe) {
    storage.setItem(REMEMBER_UNTIL_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REMEMBER_UNTIL_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getStoredUser(): ApiUser | null {
  try {
    const value = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    return value ? (JSON.parse(value) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: ApiUser) {
  const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("bulan-user-updated", { detail: user }));
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      `Cannot reach the Bulan SeniorCare API at ${API_URL}. Start it with "php artisan serve" in the backend folder.`,
    );
  }
  const body = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | T | null;
  if (!response.ok) {
    if (response.status === 401 && path !== "/login") {
      clearToken();
      throw new Error("Your session has expired. Please log in again before saving your profile.");
    }
    const errorBody = body as { message?: string; errors?: Record<string, string[]> } | null;
    const validation = errorBody?.errors ? Object.values(errorBody.errors).flat()[0] : undefined;
    throw new Error(validation ?? errorBody?.message ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export async function login(email: string, password: string, rememberMe: boolean) {
  const result = await apiFetch<{ token: string; user: ApiUser }>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember_me: rememberMe }),
  });
  setToken(result.token, rememberMe);
  setStoredUser(result.user);
  return result.user;
}

export function requestPasswordReset(email: string) {
  return apiFetch<{ message: string }>("/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, email: string, password: string, passwordConfirmation: string) {
  return apiFetch<{ message: string }>("/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token,
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  });
}

export async function createBarangayLeader(
  data: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    contactNumber: string;
    birthdate: string;
    barangayId: number;
    password: string;
    passwordConfirmation: string;
  },
) {
  const result = await apiFetch<{ user: ApiUser }>('/admin/barangay-leaders', {
    method: 'POST',
    body: JSON.stringify({
      first_name: data.firstName,
      middle_name: data.middleName || undefined,
      last_name: data.lastName,
      email: data.email,
      contact_number: data.contactNumber,
      birthdate: data.birthdate,
      barangay_id: data.barangayId,
      password: data.password,
      password_confirmation: data.passwordConfirmation,
    }),
  });
  return result.user;
}

export function logout() {
  return apiFetch<void>("/logout", { method: "POST" }).finally(clearToken);
}

export function getManagedUsers() {
  return apiFetch<ManagedUser[]>("/admin/users");
}

export function updateManagedUser(id: number, data: Record<string, unknown>) {
  return apiFetch<ManagedUser>(`/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteManagedUser(id: number) {
  return apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" });
}

export function getAnnouncements() {
  return apiFetch<Announcement[]>("/announcements");
}

export function createAnnouncement(title: string, message: string, image?: File | null) {
  const body = new FormData();
  body.append("title", title);
  body.append("message", message);
  if (image) body.append("image", image);
  return apiFetch<Announcement>("/announcements", {
    method: "POST",
    body,
  });
}

export function createAnnouncementComment(announcementId: number, message: string, parentCommentId?: number) {
  return apiFetch<AnnouncementComment>(`/announcements/${announcementId}/comments`, {
    method: "POST",
    body: JSON.stringify({ message, parent_comment_id: parentCommentId }),
  });
}

export function getMessages() {
  return apiFetch<Message[]>("/messages");
}

export function getUnreadMessageSummary() {
  return apiFetch<{ count: number }>("/messages/unread-summary");
}

export function getSeniorEditRequests() {
  return apiFetch<SeniorEditRequest[]>("/senior-edit-requests");
}

export function submitSeniorEditRequest(seniorId: string, changes: SeniorEditRequest["changes"]) {
  return apiFetch<SeniorEditRequest>("/senior-edit-requests", {
    method: "POST",
    body: JSON.stringify({ senior_id: seniorId, changes }),
  });
}

export function reviewSeniorEditRequest(id: number, status: "approved" | "declined") {
  return apiFetch<SeniorEditRequest>(`/senior-edit-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getMessageRecipients(search: string) {
  return apiFetch<MessageRecipient[]>(`/messages/recipients?search=${encodeURIComponent(search)}`);
}

export function sendMessage(recipientId: number, subject: string, message: string) {
  return apiFetch<Message>("/messages", {
    method: "POST",
    body: JSON.stringify({ recipient_id: recipientId, subject, message }),
  });
}

export function markMessageRead(id: number) {
  return apiFetch<Message>(`/messages/${id}/read`, { method: "POST" });
}

export function deleteConversation(userId: number) {
  return apiFetch<void>(`/messages/conversations/${userId}`, { method: "DELETE" });
}

export function getServerNotifications() {
  return apiFetch<ServerNotification[]>("/notifications");
}

export function markServerNotificationRead(id: number) {
  return apiFetch<ServerNotification>(`/notifications/${id}/read`, { method: "POST" });
}

export function deleteServerNotification(id: number) {
  return apiFetch<void>(`/notifications/${id}`, { method: "DELETE" });
}

export function clearServerNotifications() {
  return apiFetch<void>("/notifications", { method: "DELETE" });
}

export { API_URL };
