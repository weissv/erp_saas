// src/components/dashboard/widgets/FinanceOverviewWidget.tsx
import { TrendingUp, TrendingDown, Wallet, Landmark } from 'lucide-react';

interface FinanceData {
  period: number;
  income: { total: number; count: number };
  expense: { total: number; count: number };
  balance: number;
  balances?: {
    cash: number | null;
    bank: number | null;
    snapshotDate: string | null;
  };
}

function formatCompact(amount: number) {
  return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
}

export default function FinanceOverviewWidget({ data }: { data: FinanceData | undefined }) {
  if (!data) return null;

  const isPositive = data.balance >= 0;
  const hasCashBalances = data.balances && (data.balances.cash != null || data.balances.bank != null);

  return (
    <div className="bento-finance">
      {/* Balance hero */}
      <div className="bento-finance__balance">
        <p className="bento-finance__balance-label">Баланс · {data.period} дн.</p>
        <p className={`bento-finance__balance-value ${isPositive ? 'bento-finance__balance-value--pos' : 'bento-finance__balance-value--neg'}`}>
          {isPositive ? '+' : ''}{formatCompact(data.balance)}
        </p>
      </div>

      {/* Income / expense */}
      <div className="bento-finance__row">
        <div className="bento-finance__cell">
          <div className="bento-finance__cell-icon">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="bento-finance__cell-value">{formatCompact(data.income.total)}</p>
          <p className="bento-finance__cell-meta">{data.income.count} опер. · доход</p>
        </div>
        <div className="bento-finance__cell">
          <div className="bento-finance__cell-icon">
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <p className="bento-finance__cell-value">{formatCompact(data.expense.total)}</p>
          <p className="bento-finance__cell-meta">{data.expense.count} опер. · расход</p>
        </div>
      </div>

      {/* Cash / bank balances */}
      {hasCashBalances && (
        <div className="bento-finance__row">
          {data.balances!.cash != null && (
            <div className="bento-finance__cell">
              <div className="bento-finance__cell-icon">
                <Wallet className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <p className="bento-finance__cell-value">{formatCompact(data.balances!.cash!)}</p>
              <p className="bento-finance__cell-meta">Касса</p>
            </div>
          )}
          {data.balances!.bank != null && (
            <div className="bento-finance__cell">
              <div className="bento-finance__cell-icon">
                <Landmark className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <p className="bento-finance__cell-value">{formatCompact(data.balances!.bank!)}</p>
              <p className="bento-finance__cell-meta">Банк</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
