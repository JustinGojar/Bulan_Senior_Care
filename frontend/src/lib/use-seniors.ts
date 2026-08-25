import { useCallback, useEffect, useState } from "react";
import { apiFetch, type ApiSenior } from "./api";
import type { Senior } from "./osca-data";

export type SeniorDraft = Omit<Senior, "id"> & {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  document?: File | null;
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
    age,
    barangay: senior.barangay?.barangay_name ?? "Unassigned",
    contact: senior.contact_number ?? "Not provided",
    benefit: senior.benefits?.[0]?.benefit_name ?? fallbackBenefit,
    status: senior.status === "active" ? "Active" : senior.status === "pending" ? "Pending" : "Inactive",
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
    Promise.all([
      apiFetch<{ data: ApiSenior[]; meta?: { total?: number } }>(listPath),
      apiFetch<{ data: ApiSenior[]; meta?: { total?: number } }>("/seniors?status=active"),
      apiFetch<{ data: ApiSenior[]; meta?: { total?: number } }>("/seniors?pending_only=1"),
    ])
      .then(([result, activeResult, pendingResult]) => {
        setSeniors(result.data.map(mapSenior));
        setTotalCount(result.meta?.total ?? result.data.length);
        setActiveCount(activeResult.meta?.total ?? activeResult.data.length);
        setPendingCount(pendingResult.meta?.total ?? pendingResult.data.length);
      })
      .catch((reason: Error) => {
        setError(reason.message);
        setSeniors([]);
      })
      .finally(() => setLoading(false));
  }, [listPath]);

  const createSenior = useCallback(async (draft: SeniorDraft) => {
    const age = Math.max(60, draft.age);
    const birthdate = new Date();
    birthdate.setFullYear(birthdate.getFullYear() - age);
    const body = new FormData();
    body.append("first_name", draft.firstName?.trim() ?? draft.name.trim());
    body.append("last_name", draft.lastName?.trim() ?? draft.name.trim());
    if (draft.middleName?.trim()) body.append("middle_name", draft.middleName.trim());
    body.append("birthdate", birthdate.toISOString().slice(0, 10));
    body.append("sex", "female");
    body.append("contact_number", draft.contact);
    body.append("status", "pending");
    body.append("barangay", draft.barangay);
    body.append("benefit", draft.benefit);
    if (draft.document) body.append("id_document", draft.document);
    const result = await apiFetch<ApiSenior>("/seniors", {
      method: "POST",
      body,
    });
    const mapped = mapSenior(result);
    if (!excludePending || mapped.status !== "Pending") {
      setSeniors((prev) => [mapped, ...prev]);
      setTotalCount((count) => count + 1);
    }
    if (mapped.status === "Pending") setPendingCount((count) => count + 1);
  }, [excludePending]);

  const updateSenior = useCallback(async (id: string, draft: SeniorDraft) => {
    const result = await apiFetch<ApiSenior>(`/seniors/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status: draft.status.toLowerCase() }),
    });
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
