// src/hooks/useQuery.test.ts
// Unit тесты для useQuery хука

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useQuery } from "./useQuery";

const mockGet = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
  },
  ApiRequestError: class extends Error {
    statusCode: number;
    code: string;

    constructor(message: string, statusCode: number, code = "API_ERROR") {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.name = "ApiRequestError";
    }
  },
  getApiErrorMessage: (err: any) => err?.message || "Unknown error",
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("useQuery", () => {
  const mockData = { id: 1, name: "Test Item" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(mockData);
  });

  describe("Начальное состояние", () => {
    it("инициализируется с правильными значениями по умолчанию", () => {
      mockGet.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useQuery({ url: "/api/item" }));

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it("использует initialData когда предоставлено", async () => {
      const initialData = { id: 0, name: "Initial" };
      mockGet.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useQuery({ url: "/api/item", initialData }));

      expect(result.current.data).toEqual(initialData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isFetching).toBe(true);
    });
  });

  describe("Загрузка данных", () => {
    it("загружает данные при enabled=true", async () => {
      const { result } = renderHook(() => useQuery({ url: "/api/item", enabled: true }));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isFetching).toBe(false);
      });
    });

    it("не загружает данные при enabled=false", () => {
      const { result } = renderHook(() => useQuery({ url: "/api/item", enabled: false }));

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });

    it("передаёт параметры в запрос", async () => {
      renderHook(() =>
        useQuery({
          url: "/api/item",
          params: { filter: "active", page: 1 },
        })
      );

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith("/api/item", { filter: "active", page: 1 });
      });
    });
  });

  describe("Обработка ошибок", () => {
    it("устанавливает error при неудачном запросе", async () => {
      const error = new Error("Network error");
      mockGet.mockRejectedValue(error);

      const { result } = renderHook(() => useQuery({ url: "/api/item" }));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe("Network error");
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("вызывает onError callback при ошибке", async () => {
      const error = new Error("Failed");
      const onError = vi.fn();
      mockGet.mockRejectedValue(error);

      renderHook(() => useQuery({ url: "/api/item", onError }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0].message).toBe("Failed");
      });
    });
  });

  describe("Callbacks", () => {
    it("вызывает onSuccess callback при успехе", async () => {
      const onSuccess = vi.fn();

      renderHook(() => useQuery({ url: "/api/item", onSuccess }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockData);
      });
    });
  });

  describe("Трансформация данных", () => {
    it("применяет select функцию к данным", async () => {
      const select = vi.fn((data: typeof mockData) => ({ ...data, transformed: true }));

      const { result } = renderHook(() => useQuery({ url: "/api/item", select }));

      await waitFor(() => {
        expect(result.current.data).toEqual({
          ...mockData,
          transformed: true,
        });
      });
    });
  });

  describe("refetch", () => {
    it("повторно загружает данные", async () => {
      const { result } = renderHook(() => useQuery({ url: "/api/item" }));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGet).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe("reset", () => {
    it("сбрасывает состояние", async () => {
      const { result } = renderHook(() => useQuery({ url: "/api/item" }));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe("staleTime", () => {
    it("не делает повторный запрос по focus, пока staleTime не истёк", async () => {
      let currentTime = 1_000;
      const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => currentTime);

      try {
        const { result } = renderHook(() =>
          useQuery({
            url: "/api/item",
            staleTime: 5000,
            refetchOnWindowFocus: true,
          })
        );

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockGet).toHaveBeenCalledTimes(1);

        act(() => {
          window.dispatchEvent(new Event("focus"));
        });

        await act(async () => {
          await Promise.resolve();
        });

        expect(mockGet).toHaveBeenCalledTimes(1);

        currentTime += 5001;

        act(() => {
          window.dispatchEvent(new Event("focus"));
        });

        await waitFor(() => {
          expect(mockGet).toHaveBeenCalledTimes(2);
        });
      } finally {
        dateNowSpy.mockRestore();
      }
    });
  });

  describe("Изменение параметров", () => {
    it("перезагружает данные при изменении params", async () => {
      const { result, rerender } = renderHook((props: { url: string; params: { filter: string } }) => useQuery(props), {
        initialProps: {
          url: "/api/item",
          params: { filter: "all" },
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGet).toHaveBeenCalledTimes(1);

      rerender({
        url: "/api/item",
        params: { filter: "active" },
      });

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledTimes(2);
      });
    });
  });
});
