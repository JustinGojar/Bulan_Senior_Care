import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { useReportExportPermission } from "@/hooks/use-report-export-permission";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

function Actions() {
  const allowed = useReportExportPermission();
  return allowed ? <button>Export</button> : null;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

it("hides exports until confirmed and follows off/on/off without a reload", async () => {
  vi.useFakeTimers();
  vi.mocked(apiFetch).mockResolvedValue({ allowed: false });
  render(<Actions />);
  expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
  await act(async () => {});
  vi.mocked(apiFetch).mockResolvedValue({ allowed: true });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
  vi.mocked(apiFetch).mockResolvedValue({ allowed: false });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
});

it("hides previously available exports if permission cannot be verified", async () => {
  vi.mocked(apiFetch).mockResolvedValue({ allowed: true });
  render(<Actions />);
  expect(await screen.findByRole("button", { name: "Export" })).toBeEnabled();
  vi.mocked(apiFetch).mockRejectedValue(new Error("Offline"));
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
});
