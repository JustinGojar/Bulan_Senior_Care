// Same origin in every environment (the dev server proxies /api), so the API's
// SameSite=Strict session cookie is always sent.
const API_URL = (
  import.meta.env.PROD ? "/api" : (import.meta.env["VITE_API_URL"] ?? "/api")
).replace(/\/$/, "");
// Names a sign-in so tabs and caches can tell sessions apart. It is a random id, not a
// credential: the API token lives in an HttpOnly cookie that page scripts cannot read.
export const SESSION_ID_KEY = "bulan-session-id";
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
// Where older builds kept the API token, the signed-in profile and cached API responses.
const LEGACY_STORAGE_KEYS = ["bulan-api-token", "bulan-api-user", "bulan-api-cache"];
// Polled counters must always reach the server.
const UNCACHED_PATHS = ["/user", "/messages/unread-summary", "/notifications/unread-count"];
// Data that other people change: reuse briefly, never show it stale. Senior records are
// here so a record another account just registered is never hidden behind an old list.
const LIVE_PATHS = ["/notifications", "/messages", "/seniors", "/benefit-requests"];
const LIVE_FRESH_TTL = 10_000;

type CacheEntry = { session: string | null; data: unknown; fetchedAt: number; freshTtl: number };
// Shared by every page so switching pages reuses data instead of refetching it.
// Memory only: responses hold personal records, which must not linger in browser storage.
const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, { session: string | null; promise: Promise<unknown> }>();
// The signed-in profile, also kept in memory only; a reload fetches it again.
let currentUser: ApiUser | null = null;

function removeLegacyStorage() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // Storage is blocked, so nothing was kept there either.
    }
  }
}
removeLegacyStorage();

function clearResponseCache() {
  responseCache.clear();
  inflightRequests.clear();
  for (const file of privateFiles.values()) {
    file.then(URL.revokeObjectURL, () => undefined);
  }
  privateFiles.clear();
}

export type SeniorFileKind =
  "photo" | "id_document" | "valid_id" | "birth_certificate" | "death_certificate";

// The stored path is appended so a replaced upload is fetched again instead of reused.
export function seniorFileUrl(oscaId: string, kind: SeniorFileKind, storedPath: string) {
  return `/seniors/${encodeURIComponent(oscaId)}/files/${kind}?v=${encodeURIComponent(storedPath)}`;
}

export function benefitProofUrl(transactionId: number, storedPath: string) {
  return `/benefit-transactions/${transactionId}/attachment?v=${encodeURIComponent(storedPath)}`;
}

export function messageAttachmentUrl(messageId: number, storedPath: string) {
  return `/messages/${messageId}/attachment?v=${encodeURIComponent(storedPath)}`;
}

// Senior photos and documents are private: the API only serves them with the session
// cookie and header, so they are fetched here and shown through object URLs, kept in
// memory for this sign-in only.
const privateFiles = new Map<string, Promise<string>>();

/** Fetches a private file and resolves to an object URL usable in img src or a link. */
export function loadPrivateFile(path: string): Promise<string> {
  const cached = privateFiles.get(path);
  if (cached) return cached;
  const request = fetch(`${API_URL}${path}`, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
    credentials: "same-origin",
  }).then(async (response) => {
    if (!response.ok) throw new Error(`File could not be loaded (${response.status}).`);
    return URL.createObjectURL(await response.blob());
  });
  privateFiles.set(path, request);
  // A failed load is retried next time rather than remembered.
  request.catch(() => {
    if (privateFiles.get(path) === request) privateFiles.delete(path);
  });
  return request;
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
  email_verified_at?: string | null;
  roles?: Array<{ name: string }>;
  /** What this account's role may do, as the Admin set it in Settings > Roles & permissions. */
  granted_permissions?: string[];
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
  suffix?: string | null;
  birthdate: string;
  registration_date?: string | null;
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
  privacy_consent_at?: string | null;
  status: "active" | "pending" | "inactive";
  /** Set while a pending registration is "In review": what is wrong with its documents. */
  review_note?: string | null;
  review_flagged_at?: string | null;
  /** Why the record is inactive; "deceased" comes with the documentation below. */
  inactive_reason?: string | null;
  date_of_death?: string | null;
  death_certificate_path?: string | null;
  inactive_remarks?: string | null;
  inactivated_at?: string | null;
  inactivator?: { name: string; role: string } | null;
  barangay?: { barangay_name: string } | null;
  /** The program the senior is enrolled in. */
  benefit?: { id: number; benefit_name: string } | null;
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
  /** The release batch this record belongs to, with its scheduled date. */
  benefit_release?: { id: number; release_date: string; status: string } | null;
};

export type BenefitRelease = {
  id: number;
  period_label: string;
  amount: string | null;
  /** The barangays in this release batch; empty means every barangay. */
  barangays?: Array<{ id: number; barangay_name: string }>;
  /** How many seniors were listed to receive the benefit in this batch. */
  transactions_count?: number;
  received_count?: number;
  documents_count?: number;
  release_date: string;
  status: "scheduled" | "released" | "cancelled";
  remarks?: string | null;
  completed_at?: string | null;
  completer?: { name: string; role: string } | null;
  benefit: { benefit_name: string; schedule?: string | null };
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

export type ArchivedSenior = ApiSenior & {
  archived_by?: string | null;
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
  message: string | null;
  image_path?: string | null;
  created_at: string;
  user_id: number;
  user: { id: number; name: string; role: string };
  replies?: AnnouncementComment[];
};

export type Message = {
  id: number;
  subject: string;
  message: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  read_at: string | null;
  created_at: string;
  sender: { id: number; name: string; role: string; email: string };
  recipient: { id: number; name: string; role: string; email: string };
};

export type ReportType = "Municipal Summary" | "Barangay Summary" | "Benefit Distribution";

type ReportAccount = { id: number; name: string; role: string } | null;

/** Figures saved when a report is generated, so the approved report never changes. */
export type ReportSnapshot = {
  scope: string;
  totals: {
    total: number;
    active: number;
    pending: number;
    inactive: number;
    male: number;
    female: number;
  };
  barangays: Array<{
    barangay: string;
    registered: number;
    active: number;
    pending: number;
    inactive: number;
    released: number;
    pending_release: number;
  }>;
  benefits: Array<{
    name: string;
    seniors: number;
    released: number;
    pending: number;
    not_released: number;
  }>;
  seniors?: Array<{
    osca_id: string;
    name: string;
    age: number;
    sex: string | null;
    status: string;
    registration_date: string | null;
  }>;
  distribution?: Array<{
    osca_id: string | null;
    name: string;
    barangay: string;
    benefit: string;
    period: string | null;
    status: "released" | "pending" | "not_released";
    date_distributed: string | null;
    amount: number;
  }>;
};

export type AnalyticsReport = {
  id: number;
  report_type: ReportType;
  barangay_id: number | null;
  barangay: { id: number; barangay_name: string } | null;
  generated_date: string;
  total_registered: number;
  remarks: string | null;
  review_remarks: string | null;
  status: "draft" | "returned" | "approved" | "published";
  published_at: string | null;
  generator: ReportAccount;
  approver: ReportAccount;
  publisher: ReportAccount;
  snapshot?: ReportSnapshot;
};

export type MessageRecipient = {
  id: number;
  name: string;
  email: string;
  role: "president" | "head";
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

export type PaginatedMessages = PaginatedResponse<Message> & {
  /** Conversation partners on this page who are signed in and active right now. */
  online_user_ids?: number[];
};

export type ServerNotification = {
  id: number;
  message: string;
  status: "unread" | "read" | "sent" | "failed";
  date_sent: string | null;
  created_at: string;
  source_type?: string | null;
  source_id?: number | null;
  /** OSCA ID of the senior an age threshold alert is about. */
  senior_osca_id?: string | null;
  archived_at?: string | null;
  sender?: { name: string; role: string };
};

/** The current sign-in's id, or null when signed out. */
export function getSessionId() {
  try {
    return localStorage.getItem(SESSION_ID_KEY);
  } catch {
    return null;
  }
}

function startSession() {
  clearResponseCache();
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_NOTICE_KEY);
  localStorage.setItem(SESSION_ID_KEY, crypto.randomUUID());
}

export function clearSession() {
  clearResponseCache();
  currentUser = null;
  removeLegacyStorage();
  try {
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing stored.
  }
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
  return currentUser;
}

export function setStoredUser(user: ApiUser) {
  currentUser = user;
  window.dispatchEvent(new CustomEvent("bulan-user-updated", { detail: user }));
}

export async function getCurrentUser() {
  const user = await apiFetch<ApiUser>("/user");
  setStoredUser(user);
  return user;
}

/** A refused API request, with its HTTP status and, when locked out, the seconds to wait. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    // Any write can change what other pages show, so drop every cached read.
    return requestJson<T>(path, options).finally(clearResponseCache);
  }
  const policy = options.cache === "no-store" ? null : cachePolicy(path);
  if (!policy) return requestJson<T>(path, options);

  const session = getSessionId();
  const cached = responseCache.get(path);
  if (cached && cached.session === session) {
    const age = Date.now() - cached.fetchedAt;
    if (age < cached.freshTtl) return cached.data as T;
    if (policy.allowStale && age < MAX_STALE_AGE) {
      void cachedRequest(path, options, session, policy.freshTtl).catch(() => undefined);
      return cached.data as T;
    }
  }
  return withAbort(cachedRequest<T>(path, options, session, policy.freshTtl), options.signal);
}

/** Fetches a GET once for all callers waiting on the same path, then stores the result. */
function cachedRequest<T>(
  path: string,
  options: RequestInit,
  session: string | null,
  freshTtl: number,
): Promise<T> {
  const inflight = inflightRequests.get(path);
  if (inflight && inflight.session === session) return inflight.promise as Promise<T>;
  // The shared request ignores any one caller's abort signal.
  const { signal: _signal, ...sharedOptions } = options;
  const promise = requestJson<T>(path, sharedOptions);
  inflightRequests.set(path, { session, promise });
  promise
    .then((data) => {
      if (inflightRequests.get(path)?.promise !== promise) return;
      responseCache.set(path, { session, data, fetchedAt: Date.now(), freshTtl });
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
  // The API only accepts its HttpOnly session cookie alongside this header.
  headers.set("X-Requested-With", "XMLHttpRequest");
  const session = getSessionId();

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "same-origin",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error(
      `The browser could not complete a request to the Bulan SeniorCare API at ${API_URL}. Check the network connection and confirm the application server is available.`,
    );
  }
  const body = (await response.json().catch(() => null)) as
    { message?: string; errors?: Record<string, string[]> } | T | null;
  if (!response.ok) {
    // A 401 for a session that was already replaced or ended must not end the current one.
    // The server also ends the session of an account whose email is no longer verified.
    const sessionRejected =
      response.status === 401 ||
      (response.status === 403 &&
        (body as { email_unverified?: boolean } | null)?.email_unverified === true);
    if (sessionRejected && path !== "/login" && session && getSessionId() === session) {
      noteSessionEnded((body as { message?: string } | null)?.message);
      clearSession();
      broadcastAuthChange();
      throw new Error("Your session has expired. Please log in again before saving your profile.");
    }
    const errorBody = body as {
      message?: string;
      errors?: Record<string, string[]>;
      retry_after?: number;
    } | null;
    const validation = errorBody?.errors ? Object.values(errorBody.errors).flat()[0] : undefined;
    throw new ApiError(
      validation ?? errorBody?.message ?? `Request failed (${response.status})`,
      response.status,
      errorBody?.retry_after,
    );
  }
  return body as T;
}

/** Creates a database backup on the server and saves it as a download. */
export async function downloadBackup() {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/admin/backups`, {
      method: "POST",
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      credentials: "same-origin",
    });
  } catch {
    throw new Error("The backup could not be created. Check the network connection and try again.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Backup failed (${response.status})`);
  }
  const filename =
    response.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1] ??
    "bulan-seniorcare-backup.json";
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

/**
 * Replaces the system's data with a backup file. The server signs every account out, so the
 * session ends here too and the login page explains why.
 */
export async function restoreBackup(file: File) {
  const body = new FormData();
  body.append("backup", file);
  body.append("confirmation", "RESTORE");
  const result = await apiFetch<{ message: string }>("/admin/backups/restore", {
    method: "POST",
    body,
  });
  setSessionNotice(result.message);
  clearSession();
  broadcastAuthChange();
}

export function getAuditLogs(
  page = 1,
  filters: { userId?: string; dateFrom?: string; dateTo?: string } = {},
) {
  const query = new URLSearchParams({ page: String(page), per_page: "25" });
  if (filters.userId) query.set("user_id", filters.userId);
  if (filters.dateFrom) query.set("date_from", filters.dateFrom);
  if (filters.dateTo) query.set("date_to", filters.dateTo);
  return apiFetch<PaginatedResponse<AuditLog>>(`/audit-logs?${query}`);
}

export async function login(email: string, password: string) {
  // The server sets the API token as an HttpOnly cookie; it is not in the response body.
  const result = await apiFetch<{ user: ApiUser; session?: ServerSessionLimits }>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  startSession();
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

export function verifyEmail(params: {
  id: string;
  hash: string;
  expires: string;
  signature: string;
}) {
  return apiFetch<{ message: string }>("/verify-email", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function verifyResetCode(email: string, code: string) {
  return apiFetch<{ message: string; reset_token: string }>("/verify-reset-code", {
    method: "POST",
    body: JSON.stringify({ email, code }),
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

export type ReleaseRoster = BenefitRelease & {
  transactions: Array<{
    id: number;
    amount: string;
    status: "pending" | "released" | "failed";
    date_distributed?: string | null;
    senior: {
      osca_id_number: string;
      first_name: string;
      middle_name?: string | null;
      last_name: string;
      suffix?: string | null;
      barangay?: { barangay_name: string } | null;
    } | null;
  }>;
  documents: ReleaseDocument[];
};

export type ReleaseDocument = {
  id: number;
  path: string;
  original_name: string;
  mime_type?: string | null;
  size?: number | null;
  created_at: string;
  uploaded_by?: number | null;
  uploader?: { name: string; role: string } | null;
};

export function getBenefitReleases(
  page = 1,
  filters: { benefitId?: string; dateFrom?: string; dateTo?: string } = {},
) {
  const query = new URLSearchParams({ page: String(page), per_page: "25" });
  if (filters.benefitId) query.set("benefit_id", filters.benefitId);
  if (filters.dateFrom) query.set("date_from", filters.dateFrom);
  if (filters.dateTo) query.set("date_to", filters.dateTo);
  return apiFetch<PaginatedResponse<BenefitRelease>>(`/benefit-releases?${query}`, {
    cache: "no-store",
  });
}

export function getBenefitRelease(id: number) {
  return apiFetch<ReleaseRoster>(`/benefit-releases/${id}`, { cache: "no-store" });
}

/** Closes a batch after its release day; seniors still pending become not received. */
export function completeBenefitRelease(id: number) {
  return apiFetch<ReleaseRoster>(`/benefit-releases/${id}/complete`, { method: "POST" });
}

export function uploadReleaseDocuments(id: number, files: File[]) {
  const body = new FormData();
  files.forEach((file) => body.append("documents[]", file));
  return apiFetch<ReleaseRoster>(`/benefit-releases/${id}/documents`, { method: "POST", body });
}

export function deleteReleaseDocument(releaseId: number, documentId: number) {
  return apiFetch<ReleaseRoster>(`/benefit-releases/${releaseId}/documents/${documentId}`, {
    method: "DELETE",
  });
}

export function releaseDocumentUrl(releaseId: number, document: ReleaseDocument) {
  return `/benefit-releases/${releaseId}/documents/${document.id}?v=${encodeURIComponent(document.path)}`;
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

export async function createBarangayPresident(data: {
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
  const result = await apiFetch<{ user: ApiUser; verification_email_sent: boolean }>(
    "/admin/barangay-presidents",
    {
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
    },
  );
  return { user: result.user, verificationEmailSent: result.verification_email_sent };
}

export async function createManagedUser(data: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  contactNumber: string;
  birthdate: string;
  barangayId?: number | null;
  role: "admin" | "head" | "president";
  status: "active" | "inactive";
  password: string;
  passwordConfirmation: string;
  profilePhoto?: File | null;
}) {
  const body = new FormData();
  body.append("first_name", data.firstName);
  if (data.middleName) body.append("middle_name", data.middleName);
  body.append("last_name", data.lastName);
  body.append("email", data.email);
  body.append("contact_number", data.contactNumber);
  body.append("birthdate", data.birthdate);
  body.append("barangay_id", data.barangayId ? String(data.barangayId) : "");
  body.append("role", data.role);
  body.append("status", data.status);
  body.append("password", data.password);
  body.append("password_confirmation", data.passwordConfirmation);
  if (data.profilePhoto) body.append("profile_photo", data.profilePhoto);
  const result = await apiFetch<{ user: ManagedUser; verification_email_sent: boolean }>(
    "/admin/users",
    { method: "POST", body },
  );
  return { user: result.user, verificationEmailSent: result.verification_email_sent };
}

export function logout() {
  return apiFetch<void>("/logout", { method: "POST" }).finally(() => {
    clearSession();
    broadcastAuthChange();
  });
}

export function getManagedUsers() {
  return apiFetch<ManagedUser[]>("/admin/users");
}

export function updateManagedUser(
  id: number,
  data: Record<string, string | number | null | undefined>,
  photo?: { file: File | null; remove: boolean },
) {
  // Multipart, so the photo can ride along; PHP only parses files from a POST body.
  const body = new FormData();
  body.append("_method", "PUT");
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) body.append(key, value === null ? "" : String(value));
  }
  if (photo?.file) body.append("profile_photo", photo.file);
  else if (photo?.remove) body.append("remove_profile_photo", "1");
  return apiFetch<ManagedUser>(`/admin/users/${id}`, { method: "POST", body });
}

export type Permission =
  | "export reports"
  | "approve registrations"
  | "manage benefit requests"
  | "schedule benefit releases"
  | "manage announcements"
  | "register seniors"
  | "request benefits";

/**
 * Whether the signed-in account may do this. Only hides actions; the API enforces it too.
 * Admin may do everything, and a profile loaded before permissions existed is not limited.
 */
export function hasPermission(permission: Permission) {
  const user = getStoredUser();
  if (!user) return false;
  if (user.role === "admin" || !user.granted_permissions) return true;
  return user.granted_permissions.includes(permission);
}

export type RolePermissionsState = {
  permissions: Array<{ key: Permission; label: string; description: string; roles: string[] }>;
  roles: Record<"head" | "president", Permission[]>;
};

export function getRolePermissions() {
  return apiFetch<RolePermissionsState>("/admin/role-permissions", { cache: "no-store" });
}

export function updateRolePermissions(role: "head" | "president", permissions: Permission[]) {
  return apiFetch<RolePermissionsState>(`/admin/role-permissions/${role}`, {
    method: "PUT",
    body: JSON.stringify({ permissions }),
  });
}

/** Deactivates (signs out, blocks login) or reactivates an account. */
export function setManagedUserStatus(id: number, status: "active" | "inactive") {
  return apiFetch<ManagedUser>(`/admin/users/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function deleteManagedUser(id: number) {
  return apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" });
}

/** A GET whose data rarely changes, so it stays fresh for longer than the default. */
function cachedGet<T>(path: string, ttl: number): Promise<T> {
  const session = getSessionId();
  const cached = responseCache.get(path);
  if (cached && cached.session === session && Date.now() - cached.fetchedAt < ttl) {
    return Promise.resolve(cached.data as T);
  }
  return cachedRequest<T>(path, {}, session, ttl);
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

export function updateAnnouncement(
  announcementId: number,
  title: string,
  message: string,
  image?: File | null,
  removeImage = false,
) {
  const body = new FormData();
  body.append("_method", "PUT");
  body.append("title", title);
  body.append("message", message);
  if (image) body.append("image", image);
  else if (removeImage) body.append("remove_image", "1");
  return apiFetch<Announcement>(`/announcements/${announcementId}`, { method: "POST", body });
}

export function createAnnouncementComment(
  announcementId: number,
  message: string,
  parentCommentId?: number,
  image?: File | null,
) {
  const body = new FormData();
  if (message) body.append("message", message);
  if (parentCommentId) body.append("parent_comment_id", String(parentCommentId));
  if (image) body.append("image", image);
  return apiFetch<AnnouncementComment>(`/announcements/${announcementId}/comments`, {
    method: "POST",
    body,
  });
}

/** One senior's benefit records, newest first. */
export function getSeniorBenefitRecords(oscaId: string) {
  return apiFetch<PaginatedResponse<BenefitTransaction>>(
    `/benefit-transactions?senior=${encodeURIComponent(oscaId)}&per_page=50`,
  );
}

export function deleteAnnouncement(announcementId: number) {
  return apiFetch<null>(`/announcements/${announcementId}`, { method: "DELETE" });
}

export function deleteAnnouncementComment(announcementId: number, commentId: number) {
  return apiFetch<null>(`/announcements/${announcementId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

/** Pass `live` when polling, so the request skips the shared response cache. */
export function getMessages(page = 1, live = false) {
  return apiFetch<PaginatedMessages>(
    `/messages?page=${page}&per_page=25`,
    live ? { cache: "no-store" } : {},
  );
}

/** Which of these accounts are online now. */
export function getMessagePresence(userIds: number[]) {
  const query = new URLSearchParams();
  userIds.forEach((id) => query.append("ids[]", String(id)));
  return apiFetch<{ online_user_ids: number[] }>(`/messages/presence?${query}`, {
    cache: "no-store",
  });
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

/** The Head turns down a pending registration; the reason is shown to the president. */
export function rejectSeniorRegistration(oscaId: string, reason: string) {
  return apiFetch<ApiSenior>(`/seniors/${encodeURIComponent(oscaId)}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export type BenefitRequestStatus = "for_verification" | "approved" | "rejected" | "released";

export type BenefitRequest = {
  id: number;
  status: BenefitRequestStatus;
  remarks?: string | null;
  rejection_reason?: string | null;
  period_label?: string | null;
  release_date?: string | null;
  verified_at?: string | null;
  created_at: string;
  senior: {
    id: number;
    osca_id_number: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    birthdate?: string | null;
    barangay?: { barangay_name: string } | null;
  };
  benefit: { id: number; benefit_name: string; amount?: string | null; schedule?: string | null };
  requester?: { name: string; role: string } | null;
  verifier?: { name: string; role: string } | null;
  releaser?: { name: string; role: string } | null;
};

export function getBenefitRequests(params: { status?: BenefitRequestStatus; page?: number } = {}) {
  const query = new URLSearchParams({ page: String(params.page ?? 1), per_page: "25" });
  if (params.status) query.set("status", params.status);
  return apiFetch<PaginatedResponse<BenefitRequest>>(`/benefit-requests?${query}`);
}

/** `oscaId` is the senior's OSCA ID, as the senior pages identify records. */
export function createBenefitRequest(oscaId: string, benefitId: number, remarks?: string) {
  return apiFetch<BenefitRequest>("/benefit-requests", {
    method: "POST",
    body: JSON.stringify({
      senior_id: oscaId,
      benefit_id: benefitId,
      remarks: remarks?.trim() || null,
    }),
  });
}

export function reviewBenefitRequest(
  id: number,
  review:
    | { action: "verify" }
    | { action: "reject"; reason: string }
    | { action: "release"; release_date: string; period_label?: string },
) {
  return apiFetch<BenefitRequest>(`/benefit-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(review),
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

export function sendMessage(
  recipientId: number,
  subject: string,
  message: string,
  attachment?: File | null,
) {
  if (attachment) {
    const body = new FormData();
    body.append("recipient_id", String(recipientId));
    body.append("subject", subject);
    if (message) body.append("message", message);
    body.append("attachment", attachment);
    return apiFetch<Message>("/messages", { method: "POST", body });
  }
  return apiFetch<Message>("/messages", {
    method: "POST",
    body: JSON.stringify({ recipient_id: recipientId, subject, message }),
  });
}

export function markConversationRead(userId: number) {
  return apiFetch<{ updated: number }>(`/messages/conversations/${userId}/read`, {
    method: "POST",
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

export function markServerNotificationUnread(id: number) {
  return apiFetch<ServerNotification>(`/notifications/${id}/unread`, { method: "POST" });
}

export function archiveServerNotification(id: number) {
  return apiFetch<ServerNotification>(`/notifications/${id}/archive`, { method: "POST" });
}

export function unarchiveServerNotification(id: number) {
  return apiFetch<ServerNotification>(`/notifications/${id}/unarchive`, { method: "POST" });
}

export function deleteServerNotification(id: number) {
  return apiFetch<void>(`/notifications/${id}`, { method: "DELETE" });
}

export function clearServerNotifications() {
  return apiFetch<void>("/notifications", { method: "DELETE" });
}

export type NotificationChannelSettings = {
  email_advisories: boolean;
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
