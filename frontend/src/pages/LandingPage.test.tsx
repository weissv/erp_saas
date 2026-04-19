import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "./LandingPage";
import i18n, { syncMarketingLanguage } from "../i18n";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

function setBrowserLanguage(language: string, languages: string[] = [language]) {
  Object.defineProperty(window.navigator, "language", {
    configurable: true,
    value: language,
  });

  Object.defineProperty(window.navigator, "languages", {
    configurable: true,
    value: languages,
  });
}

describe("LandingPage", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    window.scrollTo = vi.fn();
    vi.mocked(api.post).mockReset();
    setBrowserLanguage("ru-RU", ["ru-RU", "en-US"]);
    await syncMarketingLanguage();
  });

  afterEach(async () => {
    window.history.replaceState({}, "", "/");
    await i18n.changeLanguage("ru");
  });

  it("renders the refactored marketing sections in russian", () => {
    render(<LandingPage />);
    const header = screen.getByRole("banner");

    expect(
      screen.getByRole("heading", {
        name: /Запустите школу на AI-native ERP \+ LMS с единым контуром управления/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Закрываем ключевые контуры работы образовательного бизнеса/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /AI вшит в операционные сценарии, а не добавлен как отдельный виджет/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mirai/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Как проходит запуск Mirai/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Открыть демо/i })[0]).toHaveAttribute(
      "href",
      expect.stringMatching(/^http:\/\/demo\..+$/)
    );
    expect(screen.getAllByRole("button", { name: /^Log in$/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Встать в очередь/i })[0]).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Выбор языка/i })).toBeInTheDocument();
    expect(within(header).queryByRole("link", { name: /Демо/i })).not.toBeInTheDocument();
    expect(within(header).queryByRole("link", { name: /Встать в очередь/i })).not.toBeInTheDocument();
    expect(within(header).queryByText(/AI-first ERP/i)).not.toBeInTheDocument();
  });

  it("uses browser language and updates metadata for english", async () => {
    window.localStorage.clear();
    setBrowserLanguage("en-US", ["en-US", "ja-JP"]);
    await syncMarketingLanguage();

    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: /Launch your school on an AI-native ERP \+ LMS with one operating system/i,
      })
    ).toBeInTheDocument();
    expect(document.title).toBe("Mirai — AI platform for school operations");
    expect(document.documentElement.lang).toBe("en");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      expect.stringContaining("AI automation")
    );
  });

  it("allows switching language manually and persists japanese selection", async () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole("button", { name: "日本語" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /AI-native ERP \+ LMS で、学校運営をひとつの基盤にまとめます/i,
        })
      ).toBeInTheDocument();
    });

    expect(window.localStorage.getItem("miraiEdu.language")).toBe("ja");
    expect(document.title).toBe("Mirai — 学校運営のためのAIプラットフォーム");
    expect(document.documentElement.lang).toBe("ja");
  });

  it("redirects to the waitlist success page after a successful submit", async () => {
    vi.mocked(api.post).mockResolvedValue({ id: 1 });

    render(<LandingPage />);

    fireEvent.change(screen.getByLabelText("Школа"), {
      target: { value: "Mirai Academy" },
    });
    fireEvent.change(screen.getByLabelText("Канал связи"), {
      target: { value: "@mirai_admin" },
    });
    fireEvent.change(screen.getByLabelText("Что резервируем в очереди"), {
      target: { value: "Нужен запуск школы и demo для команды." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Встать в очередь" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/waitlist/success");
    });

    expect(
      screen.getByRole("heading", {
        name: /Спасибо. Заявка на запуск Mirai уже в работе/i,
      })
    ).toBeInTheDocument();
  });
});
