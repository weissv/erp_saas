import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarX,
  DollarSign,
  LayoutDashboard,
  Search,
  Settings,
  Users,
} from "lucide-react";

import { DataTable, type Column } from "../components/DataTable/DataTable";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/input";

type PreviewTransaction = {
  date: string;
  channel: "CASH" | "BANK";
  type: "INCOME" | "EXPENSE";
  amount: string;
  category: string;
  contractor: string;
  documentNumber: string;
  description: string;
};

const transactions: PreviewTransaction[] = [
  {
    date: "18 апр 26",
    channel: "BANK",
    type: "INCOME",
    amount: "14 500 000 UZS",
    category: "Обучение",
    contractor: "Green Hill Parents",
    documentNumber: "INV-4021",
    description: "Оплата обучения за апрель",
  },
  {
    date: "17 апр 26",
    channel: "CASH",
    type: "EXPENSE",
    amount: "-3 420 000 UZS",
    category: "Питание",
    contractor: "Fresh Kitchen",
    documentNumber: "PO-210",
    description: "Закупка питания на неделю",
  },
  {
    date: "16 апр 26",
    channel: "BANK",
    type: "EXPENSE",
    amount: "-9 800 000 UZS",
    category: "Зарплата",
    contractor: "Payroll Batch",
    documentNumber: "PAY-044",
    description: "Выплата заработной платы преподавателям",
  },
];

const columns: Column<PreviewTransaction>[] = [
  { key: "date", header: "Дата" },
  {
    key: "channel",
    header: "Канал",
    render: (row) => (
      <Badge variant={row.channel === "BANK" ? "default" : "success"}>
        {row.channel === "BANK" ? <Building2 className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
        {row.channel}
      </Badge>
    ),
  },
  {
    key: "type",
    header: "Тип",
    render: (row) => (
      <Badge variant={row.type === "INCOME" ? "success" : "danger"}>
        {row.type === "INCOME" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {row.type === "INCOME" ? "Доход" : "Расход"}
      </Badge>
    ),
  },
  { key: "amount", header: "Сумма" },
  { key: "category", header: "Категория" },
  { key: "contractor", header: "Контрагент" },
  { key: "documentNumber", header: "Документ" },
  { key: "description", header: "Описание" },
];

const stats = [
  { label: "Доходы", value: "124.6M", tone: "success" },
  { label: "Расходы", value: "81.2M", tone: "danger" },
  { label: "Активных учеников", value: "486", tone: "default" },
  { label: "Задач на сегодня", value: "14", tone: "neutral" },
] as const;

const navGroups = [
  { label: "Обзор", icon: LayoutDashboard, links: ["Дашборд", "Расписание", "Календарь"] },
  { label: "Люди", icon: Users, links: ["Дети", "Сотрудники", "Классы"] },
  { label: "Финансы", icon: DollarSign, links: ["Транзакции", "Накладные", "Дебиторы"] },
  { label: "Платформа", icon: Settings, links: ["Пользователи", "Безопасность", "Интеграции"] },
];

export default function DesignPreviewPage() {
  return (
    <div className="min-h-screen bg-[hsl(220,20%,98%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <Card className="border-border/70 bg-card/90 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge variant="neutral">Visual preview</Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">Mirai Enterprise UI Preview</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Статические рендеры ключевых экранов для проверки визуального направления перед релизом.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline">Dashboard</Button>
              <Button variant="outline">Finance</Button>
              <Button variant="outline">Student profile</Button>
              <Button variant="outline">Sidebar</Button>
            </div>
          </div>
        </Card>

        <section id="preview-dashboard">
          <Card className="border-border/70 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <Badge variant="neutral">Main Dashboard Overview</Badge>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Dashboard Overview</h2>
              </div>
              <Button>Настроить виджеты</Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-background p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{stat.label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-xl border border-border bg-background p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Операционная активность</p>
                    <p className="text-sm text-muted-foreground">Сводка задач, посещаемости и уведомлений за день</p>
                  </div>
                  <Badge>Live</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Посещаемость</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">97.4%</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Просроченные счета</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">8</p>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Новые обращения</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">5</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background p-5">
                <p className="text-sm font-semibold text-foreground">Pinned actions</p>
                <div className="mt-4 space-y-2">
                  {["Добавить ученика", "Создать транзакцию", "Открыть журнал", "Экспортировать отчёт"].map((item) => (
                    <div key={item} className="rounded-lg border border-border px-3 py-3 text-sm font-medium text-foreground">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section id="preview-finance">
          <Card className="border-border/70 p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Badge variant="neutral">Finance / Transactions</Badge>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Transactions table</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-[180px_180px_minmax(0,1fr)]">
                <select className="mezon-field">
                  <option>Все каналы</option>
                </select>
                <select className="mezon-field">
                  <option>Все типы</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Поиск по документу или контрагенту" />
                </div>
              </div>
            </div>

            <DataTable
              title="Журнал операций"
              description="Компактная таблица с акцентом на ключевые финансовые поля и навигацию по страницам."
              columns={columns}
              data={transactions}
              page={1}
              pageSize={20}
              total={124}
              onPageChange={() => {}}
            />
          </Card>
        </section>

        <section id="preview-child">
          <Card className="border-border/70 p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <Badge variant="neutral">Detailed Child / Student Profile</Badge>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Student profile</h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Отсутствия</Button>
                <Button>Редактировать</Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="success">Активен</Badge>
                <Badge variant="outline">4-А класс</Badge>
                <Badge variant="neutral">Student profile</Badge>
              </div>
              <h3 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Алиева Мадина Рустамовна</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Дата рождения</p>
                  <p className="mt-2 text-sm font-medium text-foreground">12.03.2017</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Контракт</p>
                  <p className="mt-2 text-sm font-medium text-foreground">№ SH-2026-188</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Родители</p>
                  <p className="mt-2 text-sm font-medium text-foreground">2 контакта</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-5">
                <p className="text-sm font-semibold text-foreground">Основные данные</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Пол</dt><dd className="font-medium text-foreground">Женский</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Адрес</dt><dd className="font-medium text-foreground">Ташкент, Мирзо-Улугбек</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Метрика</dt><dd className="font-medium text-foreground">I-TN 004812</dd></div>
                </dl>
              </div>
              <div className="rounded-xl border border-border bg-background p-5">
                <p className="text-sm font-semibold text-foreground">Медицинские сведения</p>
                <div className="mt-4 space-y-3 text-sm text-foreground">
                  <p><span className="font-medium">Аллергии:</span> орехи</p>
                  <p><span className="font-medium">Особые условия:</span> освобождение от бега</p>
                  <p><span className="font-medium">Примечания:</span> уведомлять родителей при температуре</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background p-5 md:col-span-2">
                <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarX className="h-4 w-4" />
                  Последние отсутствия
                </p>
                <div className="space-y-2 text-sm text-foreground">
                  <div className="flex justify-between rounded-lg bg-muted px-3 py-3"><span>04.04.2026 — 08.04.2026</span><span className="text-muted-foreground">ОРВИ</span></div>
                  <div className="flex justify-between rounded-lg bg-muted px-3 py-3"><span>18.03.2026 — 19.03.2026</span><span className="text-muted-foreground">Семейные обстоятельства</span></div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section id="preview-sidebar">
          <Card className="border-border/70 p-6">
            <div className="mb-6">
              <Badge variant="neutral">Sidebar and Navigation State</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Sidebar / Navigation</h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="flex h-16 items-center justify-between border-b border-border px-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Green Hill Academy</p>
                  <p className="text-sm font-semibold text-foreground">Финансы</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">LMS</Button>
                  <div className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground">МК · CFO</div>
                </div>
              </div>
              <div className="flex min-h-[420px]">
                <aside className="w-[72px] border-r border-border bg-card p-3">
                  <div className="space-y-2">
                    {navGroups.map((group, index) => {
                      const Icon = group.icon;
                      return (
                        <div
                          key={group.label}
                          className={`flex h-11 w-11 items-center justify-center rounded-xl border ${index === 2 ? "border-primary/20 bg-primary text-primary-foreground" : "border-transparent bg-background text-muted-foreground"}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      );
                    })}
                  </div>
                </aside>
                <aside className="w-[280px] border-r border-border bg-card p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Навигация</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Финансы</p>
                  <div className="mt-4 space-y-2">
                    {["Обзор", "Транзакции", "Накладные", "Дебиторы"].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-xl px-3 py-3 text-sm font-medium ${index === 1 ? "bg-primary/10 text-primary" : "text-foreground"}`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </aside>
                <div className="flex-1 p-6">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <LayoutDashboard className="h-5 w-5 text-primary" />
                      <p className="text-lg font-semibold text-foreground">Enterprise shell content area</p>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Двухуровневая навигация даёт быстрый доступ к модулям и сохраняет высокий информационный контраст в основном рабочем полотне.
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg bg-muted p-4 text-sm font-medium text-foreground">Текущий модуль: Финансы</div>
                      <div className="rounded-lg bg-muted p-4 text-sm font-medium text-foreground">Активный раздел: Транзакции</div>
                      <div className="rounded-lg bg-muted p-4 text-sm font-medium text-foreground">Системный поиск: ⌘K</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
