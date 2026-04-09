// src/components/dashboard/widgets/InventoryRiskWidget.tsx
import { AlertTriangle, Package } from 'lucide-react';

interface RiskItem {
  id: string;
  name: string;
  currentQty: number;
  minQty: number;
  unit: string;
  daysLeft: number;
}

interface InventoryRiskData {
  critical: RiskItem[];
  warning: RiskItem[];
  totalLow: number;
}

export default function InventoryRiskWidget({ data }: { data: InventoryRiskData | undefined }) {
  if (!data) return null;

  const items = [...(data.critical ?? []), ...(data.warning ?? [])].slice(0, 6);

  return (
    <div className="bento-inventory">
      <div className="bento-inventory__header">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <div>
          <p className="bento-inventory__total">{data.totalLow}</p>
          <p className="bento-inventory__total-lbl">позиций с низким запасом</p>
        </div>
      </div>

      {items.map(item => {
        const ratio = Math.min(item.currentQty / Math.max(item.minQty, 1), 1);
        const isCritical = item.daysLeft <= 2;
        return (
          <div key={item.id} className="bento-inventory-row">
            <Package className={`h-3.5 w-3.5 flex-shrink-0 ${isCritical ? 'text-red-500' : 'text-amber-500'}`} />
            <span className="bento-inventory-row__name">{item.name}</span>
            <div className="bento-inventory-row__track">
              <div
                className={`bento-inventory-row__fill ${isCritical ? 'bento-inventory-row__fill--critical' : 'bento-inventory-row__fill--warn'}`}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <span className="bento-inventory-row__qty">{item.currentQty} {item.unit}</span>
          </div>
        );
      })}

      {data.totalLow > 6 && (
        <p className="text-[10px] text-tertiary text-center pt-1">ещё {data.totalLow - 6} позиций…</p>
      )}
    </div>
  );
}
