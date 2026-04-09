import { useEffect, useMemo, useState} from 'react';
import { Check, Edit3, Lock, ShieldAlert, X} from 'lucide-react';
import { toast} from 'sonner';
import { Card} from '../../components/Card';
import { Button} from '../../components/ui/button';
import { api} from '../../lib/api';
import { PERMISSION_MODULES, ROLE_COLORS, ROLE_LABELS} from '../../lib/roles';
import type { Role} from '../../types/common';

type RolePermissionData = {
 role: Role;
 isFullAccess: boolean;
 canBeEdited: boolean;
 modules: string[];
 canCreate: boolean;
 canEdit: boolean;
 canDelete: boolean;
 canExport: boolean;
 customPermissions?: Record<string, boolean>;
};

export function RolesPermissionsView() {
 const [permissions, setPermissions] = useState<RolePermissionData[]>([]);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [selectedRole, setSelectedRole] = useState<RolePermissionData | null>(null);

 const fetchPermissions = async () => {
 setLoading(true);
 try {
 const data = await api.get('/api/permissions');
 setPermissions(data);
 setSelectedRole((current) => {
 if (!current) return data.find((item: RolePermissionData) => item.canBeEdited) || data[0] || null;
 return data.find((item: RolePermissionData) => item.role === current.role) || null;
});
} catch (error: any) {
 toast.error('Не удалось загрузить права ролей', { description: error?.message});
} finally {
 setLoading(false);
}
};

 useEffect(() => {
 fetchPermissions();
}, []);

 const summary = useMemo(() => ({
 roles: permissions.length,
 editable: permissions.filter((item) => item.canBeEdited).length,
 fullAccess: permissions.filter((item) => item.isFullAccess).length,
}), [permissions]);

 const updateSelectedRole = (patch: Partial<RolePermissionData>) => {
 setSelectedRole((current) => current ? { ...current, ...patch} : current);
};

 const toggleModule = (moduleId: string) => {
 if (!selectedRole) return;
 const modules = selectedRole.modules.includes(moduleId)
 ? selectedRole.modules.filter((item) => item !== moduleId)
 : [...selectedRole.modules, moduleId];
 updateSelectedRole({ modules});
};

 const handleSave = async () => {
 if (!selectedRole) return;
 setSaving(true);
 try {
 await api.put(`/api/permissions/${selectedRole.role}`, {
 modules: selectedRole.modules,
 canCreate: selectedRole.canCreate,
 canEdit: selectedRole.canEdit,
 canDelete: selectedRole.canDelete,
 canExport: selectedRole.canExport,
});
 toast.success('Права роли обновлены');
 await fetchPermissions();
} catch (error: any) {
 toast.error('Не удалось сохранить права', { description: error?.message});
} finally {
 setSaving(false);
}
};

 return (
  <div className="space-y-6">
    <Card className="p-5">
      <p className="text-[11px] font-semibold text-macos-blue uppercase tracking-widest">Роли и права</p>
      <h2 className="mt-1 text-xl font-semibold">Матрица доступа к модулям</h2>
      <p className="mt-2 text-sm text-secondary">Управляйте доступом по ролям отдельно от учётных записей. Защищённые роли можно просматривать, но не изменять без повышенных прав.</p>
    </Card>

    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-4"><p className="text-sm text-secondary">Всего ролей</p><p className="mt-1 text-2xl font-semibold">{summary.roles}</p></Card>
      <Card className="p-4"><p className="text-sm text-secondary">Редактируемые</p><p className="mt-1 text-2xl font-semibold">{summary.editable}</p></Card>
      <Card className="p-4"><p className="text-sm text-secondary">Полный доступ</p><p className="mt-1 text-2xl font-semibold">{summary.fullAccess}</p></Card>
    </div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <Card className="overflow-hidden p-0">
        <div className="border-b px-4 py-3">
          <p className="font-medium">Роли системы</p>
          <p className="text-sm text-secondary">Выберите роль, чтобы посмотреть или изменить её матрицу доступа.</p>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-secondary">Загрузка прав ролей...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-fill-quaternary text-left">
                  <th className="px-4 py-3">Роль</th>
                  <th className="px-4 py-3 text-center">Модули</th>
                  <th className="px-4 py-3 text-center">CRUD</th>
                  <th className="px-4 py-3 text-center">Экспорт</th>
                  <th className="px-4 py-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission.role} className="border-t hover:bg-fill-quaternary">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {permission.isFullAccess && <Lock className="h-4 w-4 text-amber-500" />}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[permission.role]}`}>
                          {ROLE_LABELS[permission.role]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{permission.isFullAccess ? 'Все' : `${permission.modules.length} / ${PERMISSION_MODULES.length}`}</td>
                    <td className="px-4 py-3 text-center">{permission.canCreate && permission.canEdit && permission.canDelete ? <Check className="mx-auto h-4 w-4 text-macos-green" /> : <ShieldAlert className="mx-auto h-4 w-4 text-amber-500" />}</td>
                    <td className="px-4 py-3 text-center">{permission.canExport ? <Check className="mx-auto h-4 w-4 text-macos-green" /> : <X className="mx-auto h-4 w-4 text-red-400" />}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRole(permission)}>
                        <Edit3 className="mr-2 h-4 w-4" /> {permission.canBeEdited ? 'Настроить' : 'Посмотреть'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
 </Card>

      <Card className="p-5">
        {!selectedRole ? (
          <div className="text-sm text-secondary">Выберите роль из списка слева.</div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {selectedRole.isFullAccess && <Lock className="h-4 w-4 text-amber-500" />}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[selectedRole.role]}`}>
                  {ROLE_LABELS[selectedRole.role]}
                </span>
              </div>
              <p className="text-sm text-secondary">{selectedRole.canBeEdited ? 'Настройте доступ к операциям и модулям для выбранной роли.' : 'Эта роль защищена. Её права доступны только для просмотра.'}</p>
            </div>

 <div>
 <p className="mb-3 font-medium">Операции</p>
 <div className="grid gap-3 sm:grid-cols-2">
 {[
 ['canCreate', 'Создание записей'],
 ['canEdit', 'Редактирование'],
 ['canDelete', 'Удаление'],
 ['canExport', 'Экспорт данных'],
 ].map(([key, label]) => (
 <label key={key} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
 <input type="checkbox"checked={Boolean(selectedRole[key as keyof RolePermissionData])} disabled={!selectedRole.canBeEdited} onChange={(event) => updateSelectedRole({ [key]: event.target.checked} as Partial<RolePermissionData>)} />
 <span>{label}</span>
 </label>
 ))}
 </div>
 </div>

 <div>
 <div className="mb-3 flex items-center justify-between gap-3">
 <p className="font-medium">Модули</p>
 <div className="flex gap-2">
 <Button variant="outline"size="sm"onClick={() => updateSelectedRole({ modules: PERMISSION_MODULES.map((module) => module.id)})} disabled={!selectedRole.canBeEdited}>Выбрать все</Button>
 <Button variant="outline"size="sm"onClick={() => updateSelectedRole({ modules: []})} disabled={!selectedRole.canBeEdited}>Очистить</Button>
 </div>
 </div>
              <div className="grid max-h-[420px] gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2">
                {PERMISSION_MODULES.map((module) => (
                  <label key={module.id} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-fill-quaternary">
                    <input type="checkbox" checked={selectedRole.modules.includes(module.id)} disabled={!selectedRole.canBeEdited} onChange={() => toggleModule(module.id)} />
                    <span>{module.label}</span>
                  </label>
                ))}
              </div>
 </div>

 <div className="flex justify-end gap-2 border-t pt-4">
 <Button variant="ghost"onClick={() => setSelectedRole(permissions.find((item) => item.role === selectedRole.role) || null)} disabled={saving}>Сбросить</Button>
 <Button onClick={handleSave} disabled={saving || !selectedRole.canBeEdited}>{saving ? 'Сохранение...' : 'Сохранить права'}</Button>
 </div>
 </div>
 )}
 </Card>
 </div>
 </div>
 );
}