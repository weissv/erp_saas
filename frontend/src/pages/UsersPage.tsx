import { useState } from 'react';
import { Shield, Users, Lock } from 'lucide-react';
import { UsersDirectoryView } from './users/UsersDirectoryView';
import { RolesPermissionsView } from './users/RolesPermissionsView';

type ViewTab = 'users' | 'roles';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('users');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-tint-blue text-macos-blue shadow-subtle">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.025em] text-primary leading-tight mb-0">Управление пользователями</h1>
          <p className="text-[15px] font-medium text-secondary leading-relaxed tracking-[-0.01em]">Каталог сотрудников, роли и права доступа в одном рабочем пространстве.</p>
        </div>
      </div>

      <div className="inline-flex w-fit gap-1 rounded-xl border border-separator bg-inset p-1 shadow-subtle">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
            activeTab === 'users'
              ? 'bg-surface-primary text-primary shadow-sm border border-card'
              : 'text-secondary hover:bg-fill-quaternary hover:text-primary border border-transparent'
          }`}
        >
          <Users className="h-4 w-4" />
          Пользователи
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
            activeTab === 'roles'
              ? 'bg-surface-primary text-primary shadow-sm border border-card'
              : 'text-secondary hover:bg-fill-quaternary hover:text-primary border border-transparent'
          }`}
        >
          <Lock className="h-4 w-4" />
          Роли и права
        </button>
      </div>

      {/* Active View */}
      {activeTab === 'users' ? <UsersDirectoryView /> : <RolesPermissionsView />}
    </div>
  );
}
