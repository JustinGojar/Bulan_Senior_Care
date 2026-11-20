import { afterEach, expect, it, vi } from "vitest";
import { getManagedUsers } from "@/lib/api";

afterEach(() => vi.unstubAllGlobals());

it("reads resource pagination metadata and requests ten accounts on each page", async () => {
  const fetchMock = vi.fn().mockImplementation(async (url: string) => {
    const page = Number(new URL(url, "http://localhost").searchParams.get("page"));
    return new Response(
      JSON.stringify({
        data: [{ id: page }],
        meta: { current_page: page, last_page: 2, per_page: 10, total: 11 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
  vi.stubGlobal("fetch", fetchMock);

  const first = await getManagedUsers();
  expect(first).toMatchObject({ current_page: 1, last_page: 2, per_page: 10, total: 11 });
  // This is the same calculation used by the Next button.
  const second = await getManagedUsers({ page: Math.min(first.last_page, first.current_page + 1) });
  expect(second.current_page).toBe(2);
  expect(second.data).toEqual([{ id: 2 }]);
  expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
    expect.stringContaining("/admin/users?per_page=10&page=1"),
    expect.stringContaining("/admin/users?per_page=10&page=2"),
  ]);
});
