// src/components/dashboard/PersonalizationPanel.tsx
// Панель настройки дашборда: включение/отключение виджетов, presets, сброс

import { useState, useEffect} from 'react';
import { Settings, Eye, EyeOff, RotateCcw, Save, Bookmark, X} from 'lucide-react';
import { Button} from '../ui/button';
import type { WidgetDefinition, DashboardPreferences, SavedView, QuickAction} from '../../types/dashboard';

const CATEGORY_LABELS: Record<string, string> = {
 kpi: 'Ключевые показатели',
 finance: 'Финансы',
 operations: 'Операции',
 hr: 'Кадры',
 alerts: 'Оповещения',
 activity: 'Активность',
 actions: 'Действия',
};

interface PersonalizationPanelProps {
 isOpen: boolean;
 onClose: () => void;
 availableWidgets: WidgetDefinition[];
 preferences: DashboardPreferences;
 quickActions: QuickAction[];
 onToggleWidget: (widgetId: string) => void;
 onSaveView: (name: string) => void;
 onLoadView: (view: SavedView) => void;
 onResetDefaults: () => void;
 onTogglePinnedAction: (actionId: string) => void;
}

export default function PersonalizationPanel({
 isOpen,
 onClose,
 availableWidgets,
 preferences,
 quickActions,
 onToggleWidget,
 onSaveView,
 onLoadView,
 onResetDefaults,
 onTogglePinnedAction,
}: PersonalizationPanelProps) {
 const [newViewName, setNewViewName] = useState('');
 const [activeTab, setActiveTab] = useState<'widgets' | 'views' | 'actions'>('widgets');
 const [isVisible, setIsVisible] = useState(false);

 // Animate in/out
 useEffect(() => {
 if (isOpen) {
 // Trigger animation on next frame
 requestAnimationFrame(() => setIsVisible(true));
} else {
 setIsVisible(false);
}
}, [isOpen]);

 if (!isOpen) return null;

 // Группируем виджеты по категориям
 const byCategory = availableWidgets.reduce<Record<string, WidgetDefinition[]>>((acc, w) => {
 const cat = w.category;
 if (!acc[cat]) acc[cat] = [];
 acc[cat].push(w);
 return acc;
}, {});

 return (
 <div
 className="personalization-overlay"
 style={{ opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none'}}
 onClick={onClose}
 >
 <div
 className="personalization-panel"
 style={{ transform: isVisible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 250ms ease'}}
 onClick={e => e.stopPropagation()}
 >
 {/* Header */}
 <div className="personalization-panel__header">
 <div className="flex items-center gap-2">
 <Settings className="h-5 w-5 text-macos-blue"/>
 <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-primary">Настройка дашборда</h2>
 </div>
 <button onClick={onClose} className="personalization-panel__close"aria-label="Закрыть">
 <X className="h-5 w-5"/>
 </button>
 </div>

 {/* Tabs */}
 <div className="personalization-panel__tabs">
 <button
 className={`personalization-panel__tab ${activeTab === 'widgets' ? 'personalization-panel__tab--active' : ''}`}
 onClick={() => setActiveTab('widgets')}
 aria-selected={activeTab === 'widgets'}
 role="tab"
 >
 Виджеты
 </button>
 <button
 className={`personalization-panel__tab ${activeTab === 'views' ? 'personalization-panel__tab--active' : ''}`}
 onClick={() => setActiveTab('views')}
 aria-selected={activeTab === 'views'}
 role="tab"
 >
 Представления
 </button>
 <button
 className={`personalization-panel__tab ${activeTab === 'actions' ? 'personalization-panel__tab--active' : ''}`}
 onClick={() => setActiveTab('actions')}
 aria-selected={activeTab === 'actions'}
 role="tab"
 >
 Быстрые действия
 </button>
 </div>

 {/* Content */}
 <div className="personalization-panel__body"role="tabpanel">
 {/* Widgets tab */}
 {activeTab === 'widgets' && (
 <div className="space-y-4">
 {Object.entries(byCategory).map(([cat, widgets]) => (
 <div key={cat}>
 <h3 className="personalization-panel__category">{CATEGORY_LABELS[cat] || cat}</h3>
 <div className="space-y-1">
 {widgets.map(w => {
 const isEnabled = preferences.enabledWidgets.includes(w.id);
 return (
 <button
 key={w.id}
 className={`personalization-panel__widget-row ${isEnabled ? 'personalization-panel__widget-row--enabled' : ''}`}
 onClick={() => w.canHide && onToggleWidget(w.id)}
 disabled={!w.canHide}
 aria-pressed={isEnabled}
 >
 <div className="flex items-center gap-2">
 {isEnabled ? <Eye className="h-4 w-4 text-macos-green"/> : <EyeOff className="h-4 w-4 text-tertiary"/>}
 <span className="text-[11px] font-medium uppercase tracking-widest">{w.title}</span>
 </div>
 <span className="text-xs text-tertiary">{w.description}</span>
 </button>
 );
})}
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Views tab */}
 {activeTab === 'views' && (
 <div className="space-y-4">
 {/* Save current view */}
 <div className="flex gap-2">
 <input
 type="text"
 value={newViewName}
 onChange={e => setNewViewName(e.target.value)}
 placeholder="Название представления..."
 className="personalization-panel__input"
 aria-label="Название представления"
 />
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 if (newViewName.trim()) {
 onSaveView(newViewName.trim());
 setNewViewName('');
}
}}
 disabled={!newViewName.trim()}
 >
 <Save className="h-4 w-4 mr-1"/>
 Сохранить
 </Button>
 </div>

 {/* Saved views */}
 {preferences.savedViews.length > 0 ? (
 <div className="space-y-1">
 {preferences.savedViews.map((view, i) => (
 <button
 key={i}
 className="personalization-panel__view-row"
 onClick={() => onLoadView(view)}
 aria-label={`Загрузить представление ${view.name}`}
 >
 <Bookmark className="h-4 w-4 text-macos-blue"/>
 <span className="text-[11px] font-medium uppercase tracking-widest">{view.name}</span>
 <span className="text-xs text-tertiary">{view.enabledWidgets.length} виджетов</span>
 </button>
 ))}
 </div>
 ) : (
 <p className="text-sm text-tertiary text-center py-4">Нет сохранённых представлений</p>
 )}

 <Button variant="outline"className="w-full"onClick={onResetDefaults}>
 <RotateCcw className="h-4 w-4 mr-2"/>
 Сбросить к настройкам по умолчанию
 </Button>
 </div>
 )}

 {/* Quick Actions tab */}
 {activeTab === 'actions' && (
 <div className="space-y-1">
 {quickActions.map(action => {
 const isPinned = preferences.pinnedActions.includes(action.id);
 return (
 <button
 key={action.id}
 className={`personalization-panel__widget-row ${isPinned ? 'personalization-panel__widget-row--enabled' : ''}`}
 onClick={() => onTogglePinnedAction(action.id)}
 aria-pressed={isPinned}
 >
 <div className="flex items-center gap-2">
 {isPinned ? <Eye className="h-4 w-4 text-macos-green"/> : <EyeOff className="h-4 w-4 text-tertiary"/>}
 <span className="text-[11px] font-medium uppercase tracking-widest">{action.label}</span>
 </div>
 </button>
 );
})}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
