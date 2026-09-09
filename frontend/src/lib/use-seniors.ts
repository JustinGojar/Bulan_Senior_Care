import { useCallback, useEffect, useState } from "react";
import { apiFetch, getStoredUser, submitSeniorEditRequest, type ApiSenior } from "./api";
import type { Senior } from "./osca-data";

type SeniorResponse = { data: ApiSenior[]; meta?: { total?: number } };
type SeniorCacheEntry = { value: SeniorResponse; expiresAt: number };
const seniorCache = new Map<string, SeniorCacheEntry>();
const SENIOR_CACHE_TTL = 3_000;

async function getCachedSeniors(path: string) {
  const user = getStoredUser();
  const cacheTtl = SENIOR_CACHE_TTL;
  const cacheKey = `${user?.id ?? "guest"}:${user?.role ?? "guest"}:${path}`;
  const cached = seniorCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await apiFetch<SeniorResponse>(path);
  seniorCache.set(cacheKey, { value, expiresAt: Date.now() + cacheTtl });
  return value;
}

function clearSeniorCache() {
  seniorCache.clear();
}

export type SeniorDraft = Omit<Senior, "id"> & {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  document?: File | null;
  validId?: File | null;
  birthCertificate?: File | null;
  profilePhoto?: File | null;
};

function mapSenior(senior: ApiSenior): Senior {
  const birthdate = new Date(`${String(senior.birthdate).slice(0, 10)}T00:00:00`);
  const age = Number.isNaN(birthdate.getTime())
    ? 0
    : Math.max(0, new Date().getFullYear() - birthdate.getFullYear());
  const fallbackBenefit =
    age >= 100
      ? "Centenarian Award"
      : age >= 90
        ? "Nonagenarian Grant"
        : age >= 80
          ? "Octogenarian Grant"
          : "Social Pension";
  return {
    id: senior.osca_id_number,
    name: [senior.first_name, senior.middle_name, senior.last_name].filter(Boolean).join(" "),
    birthdate: String(senior.birthdate).slice(0, 10),
    age,
    barangay: senior.barangay?.barangay_name ?? "Unassigned",
    address: senior.address ?? "",
    contact: senior.contact_number ?? "Not provided",
    benefit: senior.benefits?.[0]?.benefit_name ?? fallbackBenefit,
    status: senior.status === "active" ? "Active" : senior.status === "pending" ? "Pending" : "Inactive",
    photoPath: senior.photo_path,
    idDocumentPath: senior.id_document_path,
    validIdPath: senior.valid_id_path ?? senior.id_document_path,
    birthCertificatePath: senior.birth_certificate_path,
  };
}

export function useSeniors(options: { pendingOnly?: boolean; excludePending?: boolean } = {}) {
  const { pendingOnly = false, excludePending = false } = options;
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listPath = pendingOnly
    ? "/seniors?pending_only=1"
    : excludePending
      ? "/seniors?exclude_pending=1"
      : "/seniors";

  useEffect(() => {
    Promise.allSettled([
      getCachedSeniors(listPath),
      getCachedSeniors("/seniors?status=active&count_only=1"),
      getCachedSeniors("/seniors?pending_only=1&count_only=1"),
    ])
      .then(([result, activeResult, pendingResult]) => {
        if (result.status === "rejected") throw result.reason;
        const seniorData = result.value;
        const activeData = activeResult.status === "fulfilled" ? activeResult.value : null;
        const pendingData = pendingResult.status === "fulfilled" ? pendingResult.value : null;
        setSeniors(seniorData.data.map(mapSenior));
        setTotalCount(seniorData.meta?.total ?? seniorData.data.length);
        setActiveCount(activeData?.meta?.total ?? activeData?.data.length ?? 0);
        setPendingCount(pendingData?.meta?.total ?? pendingData?.data.length ?? 0);
      })
      .catch((reason: Error) => {
        setError(reason.message);
        setSeniors([]);
      })
      .finally(() => setLoading(false));
  }, [listPath]);

  const createSenior = useCallback(async (draft: SeniorDraft) => {
    const body = new FormData();
    body.append("first_name", draft.firstName?.trim() ?? draft.name.trim());
    body.append("last_name", draft.lastName?.trim() ?? draft.name.trim());
    if (draft.middleName?.trim()) body.append("middle_name", draft.middleName.trim());
    body.append("birthdate", draft.birthdate ?? "");
    body.append("sex", "female");
    body.append("contact_number", draft.contact);
    body.append("status", "pending");
    body.append("barangay", draft.barangay);
    body.append("benefit", draft.benefit);
    if (draft.validId) body.append("valid_id", draft.validId);
    if (draft.birthCertificate) body.append("birth_certificate", draft.birthCertificate);
    if (draft.profilePhoto) body.append("profile_photo", draft.profilePhoto);
    const result = await apiFetch<ApiSenior>("/seniors", {
      method: "POST",
      body,
    });
    clearSeniorCache();
    const mapped = mapSenior(result);
    if (!excludePending || mapped.status !== "Pending") {
      setSeniors((prev) => [mapped, ...prev]);
      setTotalCount((count) => count + 1);
    }
    if (mapped.status === "Pending") setPendingCount((count) => count + 1);
  }, [excludePending]);

  const updateSenior = useCallback(async (id: string, draft: SeniorDraft) => {
    if (getStoredUser()?.role === "leader") {
      await submitSeniorEditRequest(id, {
        first_name: draft.firstName?.trim() ?? draft.name.trim(),
        middle_name: draft.middleName?.trim() || null,
        last_name: draft.lastName?.trim() ?? draft.name.trim(),
        birthdate: draft.birthdate ?? "",
        address: draft.address.trim(),
        contact_number: draft.contact.trim() || null,
        barangay: draft.barangay,
        benefit: draft.benefit,
      });
      return;
    }
    const body = new FormData();
    body.append("_method", "PUT");
    if (draft.firstName?.trim()) body.append("first_name", draft.firstName.trim());
    if (draft.middleName?.trim()) body.append("middle_name", draft.middleName.trim());
    if (draft.lastName?.trim()) body.append("last_name", draft.lastName.trim());
    if (draft.birthdate) body.append("birthdate", draft.birthdate);
    if (draft.address.trim()) body.append("address", draft.address.trim());
    if (draft.contact.trim()) body.append("contact_number", draft.contact.trim());
    if (draft.barangay) body.append("barangay", draft.barangay);
    if (draft.benefit) body.append("benefit", draft.benefit);
    body.append("status", draft.status.toLowerCase());
    if (draft.validId) body.append("valid_id", draft.validId);
    if (draft.birthCertificate) body.append("birth_certificate", draft.birthCertificate);
    if (draft.profilePhoto) body.append("profile_photo", draft.profilePhoto);
    const result = await apiFetch<ApiSenior>(`/seniors/${id}`, {
      method: "POST",
      body,
    });
    clearSeniorCache();
    const mapped = mapSenior(result);
    setSeniors((prev) =>
      prev.flatMap((senior) => {
        if (senior.id !== id) return [senior];
        if (pendingOnly && mapped.status !== "Pending") return [];
        if (excludePending && mapped.status === "Pending") return [];
        return [mapped];
      }),
    );
    setActiveCount((count) => {
      if (mapped.status === "Active" && draft.status !== "Active") return count + 1;
      if (mapped.status !== "Active" && draft.status === "Active") return Math.max(0, count - 1);
      return count;
    });
    setPendingCount((count) => {
      if (mapped.status === "Pending" && draft.status !== "Pending") return count + 1;
      if (mapped.status !== "Pending" && draft.status === "Pending") return Math.max(0, count - 1);
      return count;
    });
  }, [excludePending, pendingOnly]);

  const deleteSenior = useCallback(async (id: string) => {
    await apiFetch<void>(`/seniors/${id}`, { method: "DELETE" });
    clearSeniorCache();
    setSeniors((prev) => {
      const deleted = prev.find((senior) => senior.id === id);
      if (deleted?.status === "Active") {
        setActiveCount((count) => Math.max(0, count - 1));
      }
      if (deleted?.status === "Pending") {
        setPendingCount((count) => Math.max(0, count - 1));
      }
      return prev.filter((s) => s.id !== id);
    });
    setTotalCount((count) => Math.max(0, count - 1));
  }, []);

  return {
    seniors,
    totalCount,
    activeCount,
    pendingCount,
    loading,
    error,
    createSenior,
    updateSenior,
    deleteSenior,
  };
}
