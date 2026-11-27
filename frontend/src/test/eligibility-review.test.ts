import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { confirmEligibilityUpdate } from "@/lib/eligibility-review";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("eligibility update confirmation", () => {
  beforeEach(() => vi.resetAllMocks());

  it("accepts a successful update without an extra read", async () => {
    await confirmEligibilityUpdate("BSC-1", "Active", vi.fn().mockResolvedValue(undefined));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("counts all ten saved approvals even when their write responses fail", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ status: "active" });
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        confirmEligibilityUpdate(`BSC-${index}`, "Active", () =>
          Promise.reject(new Error("Response lost")),
        ),
      ),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(10);
    expect(apiFetch).toHaveBeenCalledWith("/seniors/BSC-0", { cache: "no-store" });
  });

  it("keeps genuinely pending records in the unsuccessful results", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ status: "active" })
      .mockResolvedValueOnce({ status: "pending" });
    const update = () => Promise.reject(new Error("Update failed"));
    const results = await Promise.allSettled([
      confirmEligibilityUpdate("BSC-1", "Active", update),
      confirmEligibilityUpdate("BSC-2", "Active", update),
    ]);
    expect(results.map((result) => result.status)).toEqual(["fulfilled", "rejected"]);
  });

  it("does not claim success when the fresh status cannot be read", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error("Offline"));
    await expect(
      confirmEligibilityUpdate("BSC-1", "Active", () => Promise.reject(new Error("Offline"))),
    ).rejects.toThrow("could not be confirmed");
  });

  it("does not mistake an unrelated inactive status for a rejection", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ status: "inactive", inactive_reason: "deceased" });
    await expect(
      confirmEligibilityUpdate("BSC-1", "Inactive", () => Promise.reject(new Error("Rejected"))),
    ).rejects.toThrow("Rejected");
  });
});
