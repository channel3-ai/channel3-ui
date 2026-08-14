import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAsyncOptions } from "@/registry/default/hooks/use-async-options";
import { createQueryWrapper } from "@/registry/default/hooks/query-test-wrapper";

describe("useAsyncOptions", () => {
  it("does not fetch below the minimum query length", async () => {
    const fetch = vi.fn().mockResolvedValue(["a"]);
    const { result } = renderHook(
      () => useAsyncOptions<string>({ fetch, debounceMs: 0, minLength: 2 }),
      { wrapper: createQueryWrapper() },
    );

    act(() => result.current.setQuery("a"));
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.options).toEqual([]);
  });

  it("fetches options for a query and exposes the result", async () => {
    const fetch = vi.fn().mockResolvedValue(["nike", "nike-air"]);
    const { result } = renderHook(() => useAsyncOptions<string>({ fetch, debounceMs: 0 }), {
      wrapper: createQueryWrapper(),
    });

    act(() => result.current.setQuery("nike"));
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(fetch).toHaveBeenCalledWith("nike");
  });

  it("ignores a slow earlier response so the latest query wins", async () => {
    const resolvers: Array<(value: string[]) => void> = [];
    const fetch = vi.fn(
      () => new Promise<string[]>((resolve) => { resolvers.push(resolve); }),
    );
    const { result } = renderHook(() => useAsyncOptions<string>({ fetch, debounceMs: 0 }), {
      wrapper: createQueryWrapper(),
    });

    act(() => result.current.setQuery("nik"));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    act(() => result.current.setQuery("adidas"));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    // Resolve the second (latest) query first, then the stale first query.
    act(() => resolvers[1]?.(["adidas"]));
    await waitFor(() => expect(result.current.options).toEqual(["adidas"]));
    act(() => resolvers[0]?.(["nike-stale"]));
    await Promise.resolve();

    expect(result.current.options).toEqual(["adidas"]);
  });

  it("clears options when the query drops below the minimum", async () => {
    const fetch = vi.fn().mockResolvedValue(["nike"]);
    const { result } = renderHook(() => useAsyncOptions<string>({ fetch, debounceMs: 0 }), {
      wrapper: createQueryWrapper(),
    });

    act(() => result.current.setQuery("nike"));
    await waitFor(() => expect(result.current.options).toHaveLength(1));

    act(() => result.current.setQuery(""));
    await waitFor(() => expect(result.current.options).toEqual([]));
  });
});
