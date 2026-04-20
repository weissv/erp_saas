import { useState, useCallback} from 'react';
import { AlertCircle, Settings, Pencil, X, RefreshCw} from 'lucide-react';
import { Button} from '../components/ui/button';
import { useDashboardPreferences} from '../hooks/useDashboardPreferences';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import DashboardOverview from '../components/dashboard/DashboardOverview';
import PersonalizationPanel from '../components/dashboard/PersonalizationPanel';
import type { LayoutItem, SavedView} from '../types/dashboard';

export default function DashboardPage() {
 const {
 bootstrap,
 preferences,
 isLoading,
 error,
 savePreferences,
 saveLayout,
 resetPreferences,
 refetch,
} = useDashboardPreferences();

 const [isEditMode, setIsEditMode] = useState(false);
 const [isPanelOpen, setIsPanelOpen] = useState(false);
 const activeView = preferences?.savedViews.find(view => view.id === preferences.activeView) ?? null;

 /* ---- Handlers ---- */

 const handleLayoutChange = useCallback(
 (layout: LayoutItem[]) => {
 saveLayout(layout);
},
 [saveLayout],
 );

 const handleToggleCollapse = useCallback(
 (widgetId: string) => {
 if (!preferences) return;
 const collapsed = preferences.collapsedSections.includes(widgetId)
 ? preferences.collapsedSections.filter(id => id !== widgetId)
 : [...preferences.collapsedSections, widgetId];
 savePreferences({ collapsedSections: collapsed});
},
 [preferences, savePreferences],
 );

 const handleToggleWidget = useCallback(
 (widgetId: string) => {
 if (!preferences) return;
 const enabled = preferences.enabledWidgets.includes(widgetId)
 ? preferences.enabledWidgets.filter(id => id !== widgetId)
 : [...preferences.enabledWidgets, widgetId];
 savePreferences({ enabledWidgets: enabled});
},
 [preferences, savePreferences],
 );

 const handleSaveView = useCallback(
 (name: string) => {
 if (!preferences) return;
 const view: SavedView = {
 id: crypto.randomUUID(),
 name,
 layout: preferences.layout,
 enabledWidgets: preferences.enabledWidgets,
 createdAt: new Date().toISOString(),
};
 const views = [...(preferences.savedViews ?? []), view];
 savePreferences({ savedViews: views});
},
 [preferences, savePreferences],
 );

 const handleLoadView = useCallback(
 (view: SavedView) => {
 savePreferences({
 layout: view.layout,
 enabledWidgets: view.enabledWidgets,
 activeView: view.id,
});
},
 [savePreferences],
 );

 const handleTogglePinnedAction = useCallback(
 (actionId: string) => {
 if (!preferences) return;
 const pinned = preferences.pinnedActions.includes(actionId)
 ? preferences.pinnedActions.filter(id => id !== actionId)
 : [...preferences.pinnedActions, actionId];
 savePreferences({ pinnedActions: pinned});
},
 [preferences, savePreferences],
 );

 /* ---- Render states ---- */

 if (isLoading) {
 return (
 <div className="space-y-4 animate-pulse">
 <div className="h-10 rounded-lg w-1/3 dashboard-skeleton"/>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {Array.from({ length: 8}).map((_, i) => (
 <div key={i} className="h-40 rounded-xl dashboard-skeleton"/>
 ))}
 </div>
 </div>
 );
}

  if (error || !bootstrap || !preferences) {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/85 px-6 py-12 text-center shadow-card backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-red-50 via-transparent to-transparent" />
        <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 shadow-subtle">
            <AlertCircle className="h-6 w-6" />
          </span>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-500">Состояние дашборда</p>
            <p className="font-semibold text-[20px] tracking-[-0.02em] text-foreground">{error ?? 'Не удалось загрузить дашборд'}</p>
            <p className="text-[14px] leading-6 text-muted-foreground">
              Попробуйте повторить загрузку. Если проблема останется, проверьте API или настройки окружения.
            </p>
          </div>
          <Button onClick={refetch}>Повторить</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root space-y-5">
      {/* ---- Header ---- */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-primary leading-tight">Дашборд</h1>
          <p className="text-[13px] text-secondary mt-0.5">
            {activeView ? `Вид: ${activeView.name}` : 'Операционная рабочая поверхность'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={refetch} title="Обновить">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant={isEditMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsEditMode(prev => !prev)}
          >
            {isEditMode ? <X className="h-4 w-4 mr-1" /> : <Pencil className="h-4 w-4 mr-1" />}
            {isEditMode ? 'Готово' : 'Редактировать'}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsPanelOpen(true)}>
            <Settings className="h-4 w-4 mr-1" />
            Настроить
          </Button>
        </div>
      </header>

 {/* ---- Overview strip ---- */}
 {bootstrap.overview && (
 <DashboardOverview overview={bootstrap.overview} />
 )}

 {/* ---- Grid ---- */}
 <DashboardLayout
 preferences={preferences}
 availableWidgets={bootstrap.availableWidgets}
 quickActions={bootstrap.quickActions}
 isEditMode={isEditMode}
 onLayoutChange={handleLayoutChange}
 onToggleCollapse={handleToggleCollapse}
 />

 {/* ---- Personalization side-panel ---- */}
 <PersonalizationPanel
 isOpen={isPanelOpen}
 onClose={() => setIsPanelOpen(false)}
 availableWidgets={bootstrap.availableWidgets}
 preferences={preferences}
 quickActions={bootstrap.quickActions}
 onToggleWidget={handleToggleWidget}
 onSaveView={handleSaveView}
 onLoadView={handleLoadView}
 onResetDefaults={resetPreferences}
 onTogglePinnedAction={handleTogglePinnedAction}
 />
 </div>
 );
}
