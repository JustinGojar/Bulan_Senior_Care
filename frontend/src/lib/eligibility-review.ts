import { apiFetch, type ApiSenior } from "./api";

/** A failed response does not prove the write failed: check the saved status before retrying. */
export async function confirmEligibilityUpdate(
  id: string,
  status: "Active" | "Inactive",
  update: () => Promise<unknown>,
): Promise<void> {
  try {
    await update();
    return;
  } catch (updateError) {
    let saved: ApiSenior;
    try {
      saved = await apiFetch<ApiSenior>(`/seniors/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
    } catch {
      throw new Error(
        "The saved eligibility status could not be confirmed. Refresh before retrying.",
      );
    }
    const matches =
      saved.status === status.toLowerCase() &&
      (status === "Active" || saved.inactive_reason === "not_eligible");
    if (!matches) throw updateError;
  }
}
