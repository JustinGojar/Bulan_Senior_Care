const API_URL = (
  import.meta.env.PROD ? "/api" : (import.meta.env["VITE_API_URL"] ?? "http://127.0.0.1:8000/api")
).replace(/\/$/, "");
const TOKEN_KEY = "bulan-api-token";
const USER_KEY = "bulan-api-user";
const SESSION_KEY = "bulan-api-session";
const SESSION_NOTICE_KEY = "bulan-session-notice";
// Used for sessions signed in before the server reported its limits.
const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;
const ANNOUNCEMENTS_CACHE_TTL = 60_000;
const BARANGAYS_CACHE_TTL = 5 * 60_000;
// GET responses younger than this are reused without a request.
const DEFAULT_FRESH_TTL = 30_000;
// Older responses up to this age are shown at once and refreshed in the background.
const MAX_STALE_AGE = 5 * 60_000;
const CACHE_STORAGE_KEY = "bulan-api-cache";
// Polled counters must always reach the server.
const UNCACHED_PATHS = ["/user", "/messages/unread-summary", "/notifications/unread-count"];
// Inbox-like data that other people change: reuse briefly, never show it stale.
const LIVE_PATHS = ["/notifications", "/messages"];
const LIVE_FRESH_TTL = 10_000;

type CacheEntry = { token: string | null; data: unknown; fetchedAt: number; freshTtl: number };
// Shared by every page so switching pages reuses data instead of refetching it.
// Kept in sessionStorage too, so reloading the page shows data immediately.
const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, { token: string | null; promise: Promise<unknown> }>();
let persistTimer: number | undefined;

function loadPersistedCache() {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(sessionStorage.getItem(CACHE_STORAGE_KEY) ?? "{}") as Record<
      string,
      CacheEntry
    >;
    const now = Date.now();
    for (const [path, entry] of Object.entries(stored)) {
      if (now - entry.fetchedAt < MAX_STALE_AGE) responseCache.set(path, entry);
    }
  } catch {
    // Unreadable storage only means a cold cache.
  }
}
loadPersistedCache();

function persistCache() {
  if (typeof window === "undefined") return;
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      if (responseCache.size === 0) sessionStorage.removeItem(CACHE_STORAGE_KEY);
      else
        sessionStorage.setItem(
          CACHE_STORAGE_KEY,
          JSON.stringify(Object.fromEntries(responseCache)),
        );
    } catch {
      // Storage full or blocked: the in-memory cache still works.
    }
  }, 300);
}

function clearResponseCache() {
  responseCache.clear();
  inflightRequests.clear();
  if (typeof window === "undefined") return;
  window.clearTimeout(persistTimer);
  try {
    sessionStorage.removeItem(CACHE_STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}

function cachePolicy(path: string) {
  const pathname = path.split("?")[0] ?? path;
  if (UNCACHED_PATHS.includes(pathname)) return null;
  const live = LIVE_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return live
    ? { freshTtl: LIVE_FRESH_TTL, allowStale: false }
    : { freshTtl: DEFAULT_FRESH_TTL, allowStale: true };
}

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
  address?: string | null;
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
  place_of_birth?: string | null;
  sex?: "male" | "female";
  civil_status?: string | null;
  educational_attainment?: string | null;
  other_skills?: string | null;
  family_composition?: string | null;
  association_name?: string | null;
  association_address?: string | null;
  association_membership_date?: string | null;
  association_position?: string | null;
  address?: string | null;
  contact_number?: string | null;
  photo_path?: string | null;
  id_document_path?: string | null;
  valid_id_path?: string | null;
  birth_certificate_path?: string | null;
  status: "active" | "pending" | "inactive";
  barangay?: { barangay_name: string } | null;
  benefits?: Array<{
    benefit_name: string;
    pivot?: { status: string; amount: string; date_distributed?: string | null };
  }>;
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
  monthly_change: {
    total_registered: number | null;
    active_seniors: number | null;
    pending_applications: number | null;
    benefits_distributed_amount: number | null;
  };
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
    place_of_birth?: string | null;
    sex?: "male" | "female";
    civil_status?: string | null;
    educational_attainment?: string | null;
    other_skills?: string | null;
    family_composition?: string | null;
    association_name?: string | null;
    association_address?: string | null;
    association_membership_date?: string | null;
    association_position?: string | null;
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
  source_url?: string | null;
  source_image_url?: string | null;
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

export type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AuditLog = {
  id: number;
  action: string;
  target_type: string;
  target_id: number;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  created_at: string;
  actor: { id: number; name: string; role: string } | null;
};

export type PaginatedMessages = PaginatedResponse<Message>;

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
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  clearResponseCache();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_NOTICE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  clearResponseCache();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export type SessionLimits = {
  /** Sign out after this many minutes without activity; 0 means never. */
  idleTimeoutMinutes: number;
  /** Epoch milliseconds when the sign-in ends however active it is, or null for no cap. */
  expiresAt: number | null;
};

type ServerSessionLimits = { idle_timeout_minutes: number; expires_in_seconds: number | null };

function setSessionLimits(limits: ServerSessionLimits | undefined) {
  if (!limits) return;
  const stored: SessionLimits = {
    idleTimeoutMinutes: limits.idle_timeout_minutes,
    expiresAt: limits.expires_in_seconds ? Date.now() + limits.expires_in_seconds * 1000 : null,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
}

export function getSessionLimits(): SessionLimits {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    if (value) return JSON.parse(value) as SessionLimits;
  } catch {
    // Fall back to the defaults below.
  }
  return { idleTimeoutMinutes: DEFAULT_IDLE_TIMEOUT_MINUTES, expiresAt: null };
}

/** Remembers why the session ended, for the login page to explain. */
export function setSessionNotice(message: string) {
  try {
    localStorage.setItem(SESSION_NOTICE_KEY, message);
  } catch {
    // The login page just shows no explanation.
  }
}

/** Records why the server rejected the session; its bare "Unauthenticated." says nothing useful. */
export function noteSessionEnded(serverMessage?: string | null) {
  setSessionNotice(
    serverMessage &&
      serverMessage !== "Unauthenticated." &&
      !serverMessage.startsWith("Request failed")
      ? serverMessage
      : "Your session has expired. Please log in again.",
  );
}

/** Returns the reason the last session ended, once. */
export function takeSessionNotice() {
  try {
    const message = localStorage.getItem(SESSION_NOTICE_KEY);
    localStorage.removeItem(SESSION_NOTICE_KEY);
    return message;
  } catch {
    return null;
  }
}

export function broadcastAuthChange() {
  window.dispatchEvent(new CustomEvent("bulan-auth-changed"));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("bulan-auth");
    channel.postMessage({ type: "logout" });
    channel.close();
  }
}

export function getStoredUser(): ApiUser | null {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? (JSON.parse(value) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: ApiUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("bulan-user-updated", { detail: user }));
}

export async function getCurrentUser() {
  const user = await apiFetch<ApiUser>("/user");
  setStoredUser(user);
  return user;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    // Any write can change what other pages show, so drop every cached read.
    return requestJson<T>(path, options).finally(clearResponseCache);
  }
  const policy = options.cache === "no-store" ? null : cachePolicy(path);
  if (!policy) return requestJson<T>(path, options);

  const token = getToken();
  const cached = responseCache.get(path);
  if (cached && cached.token === token) {
    const age = Date.now() - cached.fetchedAt;
    if (age < cached.freshTtl) return cached.data as T;
    if (policy.allowStale && age < MAX_STALE_AGE) {
      void cachedRequest(path, options, token, policy.freshTtl).catch(() => undefined);
      return cached.data as T;
    }
  }
  return withAbort(cachedRequest<T>(path, options, token, policy.freshTtl), options.signal);
}

/** Fetches a GET once for all callers waiting on the same path, then stores the result. */
function cachedRequest<T>(
  path: string,
  options: RequestInit,
  token: string | null,
  freshTtl: number,
): Promise<T> {
  const inflight = inflightRequests.get(path);
  if (inflight && inflight.token === token) return inflight.promise as Promise<T>;
  // The shared request ignores any one caller's abort signal.
  const { signal: _signal, ...sharedOptions } = options;
  const promise = requestJson<T>(path, sharedOptions);
  inflightRequests.set(path, { token, promise });
  promise
    .then((data) => {
      if (inflightRequests.get(path)?.promise !== promise) return;
      responseCache.set(path, { token, data, fetchedAt: Date.now(), freshTtl });
      persistCache();
    })
    .catch(() => undefined)
    .finally(() => {
      if (inflightRequests.get(path)?.promise === promise) inflightRequests.delete(path);
    });
  return promise;
}

function withAbort<T>(promise: Promise<T>, signal?: AbortSignal | null): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
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
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error(
      `The browser could not complete a request to the Bulan SeniorCare API at ${API_URL}. Check the network connection and confirm the application server is available.`,
    );
  }
  const body = (await response.json().catch(() => null)) as
    { message?: string; errors?: Record<string, string[]> } | T | null;
  if (!response.ok) {
    // A 401 for a token that was already replaced or cleared must not end the current session.
    if (response.status === 401 && path !== "/login" && token && getToken() === token) {
      noteSessionEnded((body as { message?: string } | null)?.message);
      clearToken();
      broadcastAuthChange();
      throw new Error("Your session has expired. Please log in again before saving your profile.");
    }
    const errorBody = body as { message?: string; errors?: Record<string, string[]> } | null;
    const validation = errorBody?.errors ? Object.values(errorBody.errors).flat()[0] : undefined;
    throw new Error(validation ?? errorBody?.message ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export function getAuditLogs(page = 1) {
  return apiFetch<PaginatedResponse<AuditLog>>(`/audit-logs?page=${page}&per_page=25`);
}

export async function login(email: string, password: string) {
  const result = await apiFetch<{ token: string; user: ApiUser; session?: ServerSessionLimits }>(
    "/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  setToken(result.token);
  setStoredUser(result.user);
  setSessionLimits(result.session);
  return result.user;
}

export function requestPasswordReset(email: string) {
  return apiFetch<{ message: string }>("/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(
  token: string,
  email: string,
  password: string,
  passwordConfirmation: string,
) {
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

export function bulkCreateSeniors(records: Array<Record<string, string>>) {
  return apiFetch<{
    created: Array<{ row: number; osca_id_number: string }>;
    failed: Array<{ row: number; message: string }>;
    message: string;
  }>("/seniors/bulk", {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

export async function createBarangayLeader(data: {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  birthdate: string;
  barangayId: number;
  password: string;
  passwordConfirmation: string;
}) {
  const result = await apiFetch<{ user: ApiUser }>("/admin/barangay-leaders", {
    method: "POST",
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

export async function createManagedUser(data: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  contactNumber: string;
  birthdate: string;
  barangayId?: number | null;
  role: "admin" | "head" | "leader";
  status: "active" | "inactive";
  password: string;
  passwordConfirmation: string;
}) {
  const result = await apiFetch<{ user: ManagedUser }>("/admin/users", {
    method: "POST",
    body: JSON.stringify({
      first_name: data.firstName,
      middle_name: data.middleName || undefined,
      last_name: data.lastName,
      email: data.email,
      contact_number: data.contactNumber,
      birthdate: data.birthdate,
      barangay_id: data.barangayId ?? null,
      role: data.role,
      status: data.status,
      password: data.password,
      password_confirmation: data.passwordConfirmation,
    }),
  });
  return result.user;
}

export function logout() {
  return apiFetch<void>("/logout", { method: "POST" }).finally(() => {
    clearToken();
    broadcastAuthChange();
  });
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

/** A GET whose data rarely changes, so it stays fresh for longer than the default. */
function cachedGet<T>(path: string, ttl: number): Promise<T> {
  const token = getToken();
  const cached = responseCache.get(path);
  if (cached && cached.token === token && Date.now() - cached.fetchedAt < ttl) {
    return Promise.resolve(cached.data as T);
  }
  return cachedRequest<T>(path, {}, token, ttl);
}

export function getAnnouncements() {
  return cachedGet<Announcement[]>("/announcements", ANNOUNCEMENTS_CACHE_TTL);
}

export function getBarangays() {
  return cachedGet<Array<{ id: number; barangay_name: string }>>("/barangays", BARANGAYS_CACHE_TTL);
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

export function createAnnouncementComment(
  announcementId: number,
  message: string,
  parentCommentId?: number,
) {
  return apiFetch<AnnouncementComment>(`/announcements/${announcementId}/comments`, {
    method: "POST",
    body: JSON.stringify({ message, parent_comment_id: parentCommentId }),
  });
}

export function getMessages(page = 1) {
  return apiFetch<PaginatedMessages>(`/messages?page=${page}&per_page=25`);
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

export function getServerUnreadNotificationCount() {
  return apiFetch<{ count: number }>("/notifications/unread-count");
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

export type NotificationChannelSettings = {
  email_advisories: boolean;
  sms_advisories: boolean;
};

export type NotificationChannelReadiness = NotificationChannelSettings;

export async function getNotificationChannelSettings() {
  return apiFetch<{
    settings: NotificationChannelSettings;
    configured: NotificationChannelReadiness;
  }>("/admin/notification-settings");
}

export async function updateNotificationChannelSettings(
  settings: Partial<NotificationChannelSettings>,
) {
  return apiFetch<{ settings: NotificationChannelSettings }>("/admin/notification-settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}

export { API_URL };
