import React, { useState } from "react";
import { Modal } from "../Modal";
import { getTenantUrl } from "../../features/marketing/url";
import { BuildingIcon } from "lucide-react";

interface LoginWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginWorkspaceModal({ isOpen, onClose }: LoginWorkspaceModalProps) {
  const [domain, setDomain] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    const url = getTenantUrl(domain.trim().toLowerCase(), "/auth/login");
    window.location.href = url;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Войти в свое пространство"
      description="Введите адрес вашего рабочего пространства для входа в систему"
      size="md"
      icon={<BuildingIcon className="h-6 w-6 text-macos-blue" />}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="workspace-domain" className="text-sm font-medium text-text-primary">
            Workspace URL
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              id="workspace-domain"
              className="block w-full min-w-0 flex-1 rounded-none rounded-l-md border border-card bg-surface-primary px-3 py-2 text-base text-text-primary placeholder:text-text-tertiary focus:border-macos-blue focus:outline-none focus:ring-1 focus:ring-macos-blue sm:text-sm"
              placeholder="my-school"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              autoFocus
            />
            <span className="inline-flex items-center rounded-r-md border border-l-0 border-card bg-surface-secondary px-3 text-text-tertiary sm:text-sm whitespace-nowrap">
              .mirai-edu.space
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-card bg-white px-4 py-2 text-sm font-medium text-text-primary shadow-sm hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-macos-blue focus:ring-offset-2"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={!domain.trim()}
            className="inline-flex justify-center rounded-md border border-transparent bg-macos-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-macos-blue-hover focus:outline-none focus:ring-2 focus:ring-macos-blue focus:ring-offset-2 disabled:opacity-50"
          >
            Продолжить
          </button>
        </div>
      </form>
    </Modal>
  );
}
