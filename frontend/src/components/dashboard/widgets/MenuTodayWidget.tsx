// src/components/dashboard/widgets/MenuTodayWidget.tsx
import { UtensilsCrossed, Users } from 'lucide-react';

interface MenuItem {
  name: string;
  mealType: string;
}

interface MenuTodayData {
  date: string;
  items: MenuItem[];
  childrenOnMeals: number;
  totalChildren: number;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch:     'Обед',
  snack:     'Полдник',
  dinner:    'Ужин',
};

const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

export default function MenuTodayWidget({ data }: { data: MenuTodayData | undefined }) {
  if (!data) return null;

  const items = data.items ?? [];

  const grouped = MEAL_ORDER
    .map(type => ({
      type,
      label: MEAL_LABELS[type] ?? type,
      items: items.filter(i => i.mealType === type),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="bento-menu">
      <div className="bento-menu__meals-header">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>{data.childrenOnMeals} / {data.totalChildren} на питании</span>
        </div>
        <span>{new Date(data.date).toLocaleDateString('ru-RU')}</span>
      </div>

      {grouped.map(group => (
        <div key={group.type}>
          <p className="bento-menu__group-label">{group.label}</p>
          <div className="bento-menu__items">
            {group.items.map((item, i) => (
              <span key={i} className="bento-menu__dish">
                <UtensilsCrossed className="h-3 w-3 flex-shrink-0" />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      ))}

      {grouped.length === 0 && (
        <p className="text-xs text-tertiary text-center py-2">Меню не задано</p>
      )}
    </div>
  );
}
