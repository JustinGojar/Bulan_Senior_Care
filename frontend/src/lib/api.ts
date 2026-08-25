const API_URL = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8001/api").replace(/\/$/, "");
const TOKEN_KEY = "bulan-api-token";
const USER_KEY = "bulan-api-user";

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

export type AccountRole = "admin" | "head";

export type ApiSenior = {
  id: number;
  osca_id_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  birthdate: string;
  contact_number?: string | null;
  status: "active" | "pending" | "inactive";
  barangay?: { barangay_name: string } | null;
  benefits?: Array<{ benefit_name: string }>;
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
      `Cannot reach the Bulan SeniorCare API at ${API_URL}. Start it with "php artisan serve --port=8001" in the backend folder.`,
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

export async function login(email: string, password: string) {
  const result = await apiFetch<{ token: string; user: ApiUser }>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(result.token);
  setStoredUser(result.user);
  return result.user;
}

export async function register(
  name: string,
  email: string,
  contactNumber: string,
  password: string,
  passwordConfirmation: string,
  role: AccountRole,
) {
  const result = await apiFetch<{ token: string; user: ApiUser }>('/register', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      contact_number: contactNumber || undefined,
      password,
      password_confirmation: passwordConfirmation,
      role,
    }),
  });
  setToken(result.token);
  setStoredUser(result.user);
  return result.user;
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

export { API_URL };
