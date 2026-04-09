import { useState, useCallback } from "react";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/ui/button";
import { useOneCSync } from "../hooks";
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";

type SyncReport = Awaited<ReturnType<ReturnType<typeof useOneCSync>["sync"]>>;

interface SyncLogEntry {
  id: number;
  report: NonNullable<SyncReport>;
  status: "success" | "error";
}

export function OneCIntegrationPanel() {
  const { syncing, sync } = useOneCSync();
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);

  const handleSync = useCallback(async () => {
    try {
      const report = await sync();
      if (!report) {
        toast.error("Синхронизация не вернула результат. Попробуйте повторить позже.");
        return;
      }
      setSyncLog((prev) => [
        { id: Date.now(), report, status: report.aborted ? "error" : "success" },
        ...prev,
      ]);
      const totalUpserted = report.results.reduce((s, r) => s + r.upserted, 0);
      const totalErrors = report.results.reduce((s, r) => s + r.errors, 0);
      if (report.aborted) {
        toast.error("Синхронизация прервана", { description: report.error });
      } else if (totalErrors > 0) {
        toast.warning(`Синхронизация завершена с ошибками. Загружено: ${totalUpserted}, ошибок: ${totalErrors}`);
      } else {
        toast.success(`Синхронизация завершена. Загружено ${totalUpserted} записей.`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setSyncLog((prev) => [
        {
          id: Date.now(),
          report: { startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), results: [], aborted: true, error: errorMessage },
          status: "error",
        },
        ...prev,
      ]);
      toast.error("Ошибка синхронизации с 1С", { description: errorMessage });
    }
  }, [sync]);

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">1C: Enterprise (Бухгалтерия)</h2>
          <p className="text-sm text-gray-500 mt-1">
            Автоматическая синхронизация финансовых транзакций с 1С: Бухгалтерия
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-medium text-green-700">Подключено</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={clsx("h-4 w-4 mr-2", syncing && "animate-spin")} />
          {syncing ? "Синхронизация..." : "Принудительная синхронизация"}
        </Button>
        <span className="text-xs text-gray-400">
          Следующая авто-синхронизация — через 15 мин.
        </span>
      </div>

      {/* Sync Log */}
      {syncLog.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Последние синхронизации</h3>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Статус</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Дата / Время</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Загружено</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Ошибок</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Этапов</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {syncLog.slice(0, 10).map((entry) => {
                  const totalUpserted = entry.report.results.reduce((s, r) => s + r.upserted, 0);
                  const totalErrors = entry.report.results.reduce((s, r) => s + r.errors, 0);
                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-2">
                        {entry.status === "success" ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" /> Успешно
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" /> {entry.report.aborted ? "Прервано" : "Ошибка"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(entry.report.finishedAt).toLocaleString("ru-RU")}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-medium">{totalUpserted}</td>
                      <td className="px-4 py-2 font-medium text-red-500">{totalErrors || "—"}</td>
                      <td className="px-4 py-2 text-gray-500">{entry.report.results.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
