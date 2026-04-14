import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Building2, Link2, Sparkles } from "lucide-react";
import { Modal } from "../Modal";
import { getWorkspaceLoginUrl } from "../../features/marketing/url";

interface LoginWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginWorkspaceModal({ isOpen, onClose }: LoginWorkspaceModalProps) {
  const [workspace, setWorkspace] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setWorkspace("");
    }
  }, [isOpen]);

  const targetUrl = getWorkspaceLoginUrl(workspace);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetUrl) {
      return;
    }

    window.location.assign(targetUrl);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Введите адрес вашего рабочего пространства"
      description="Укажите свой субдомен или вставьте полный адрес школы. Мы сразу откроем страницу входа нужной организации."
      size="md"
      eyebrow="Log in"
      icon={<Building2 className="h-6 w-6 text-macos-blue" />}
      overlayClassName="bg-[rgba(238,244,255,0.74)] backdrop-blur-[18px]"
      frameClassName="px-4 py-6 sm:px-6"
      surfaceClassName="overflow-hidden rounded-[32px] border border-card/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,247,255,0.94))] shadow-[0_28px_90px_rgba(15,23,42,0.18)]"
      bodyClassName="pt-0"
      contentClassName="space-y-5"
    >
      <div className="rounded-[28px] border border-[rgba(0,122,255,0.14)] bg-[linear-gradient(135deg,rgba(0,122,255,0.08),rgba(52,199,89,0.05))] p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-macos-blue shadow-subtle">
          <Sparkles className="h-3.5 w-3.5" />
          Workspace access
        </div>
        <p className="mt-4 text-sm leading-6 text-text-tertiary">
          Можно ввести короткий subdomain, полный адрес школы или просто вставить ссылку из браузера.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-[28px] border border-card bg-white/80 p-2 shadow-subtle backdrop-blur-[18px]">
          <label
            htmlFor="workspace-domain"
            className="mb-2 flex items-center gap-2 px-2 text-sm font-medium text-text-primary"
          >
            <Link2 className="h-4 w-4 text-macos-blue" />
            Адрес пространства
          </label>
          <div className="flex items-center gap-3 rounded-[22px] border border-card bg-surface-primary px-4 py-3 focus-within:border-macos-blue focus-within:ring-2 focus-within:ring-[rgba(0,122,255,0.12)]">
            <input
              type="text"
              id="workspace-domain"
              className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-tertiary"
              placeholder="school или school.mirai-edu.space"
              value={workspace}
              onChange={(event) => setWorkspace(event.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            <span className="hidden rounded-full bg-[rgba(0,122,255,0.08)] px-3 py-1 text-xs font-medium text-macos-blue sm:inline-flex">
              /auth/login
            </span>
          </div>
          <p className="mt-3 px-2 text-xs leading-5 text-text-tertiary">
            Примеры: school, school.mirai-edu.space, https://school.mirai-edu.space
          </p>
        </div>

        <div className="rounded-[24px] border border-card bg-[rgba(255,255,255,0.78)] p-4 backdrop-blur-[16px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-macos-blue">Переход</p>
          <p className="mt-2 break-all text-sm font-semibold text-text-primary">
            {targetUrl ?? "https://school.mirai-edu.space/auth/login"}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-card bg-surface-primary px-5 py-3 text-sm font-semibold text-text-primary shadow-subtle transition hover:bg-white"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={!targetUrl}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-macos-blue px-5 py-3 text-sm font-semibold text-white shadow-subtle transition hover:bg-macos-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Перейти к входу
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </Modal>
  );
}
