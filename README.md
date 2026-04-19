# Mirai ERP SaaS

Многофункциональная мультитенантная ERP-платформа для школ и дошкольных учреждений с интегрированной LMS, AI-ассистентом, модулем контрольных работ и глубокой интеграцией с 1С:Предприятие.

---

## Оглавление

- [Обзор](#обзор)
- [Архитектура](#архитектура)
- [Технологический стек](#технологический-стек)
- [Структура проекта](#структура-проекта)
- [Быстрый старт](#быстрый-старт)
- [Переменные окружения](#переменные-окружения)
- [Backend](#backend)
  - [API маршруты](#api-маршруты)
  - [Модули](#модули)
  - [Сервисы](#сервисы)
  - [Middleware](#middleware)
  - [Аутентификация и авторизация](#аутентификация-и-авторизация)
  - [Мультитенантность](#мультитенантность)
  - [Очереди (BullMQ)](#очереди-bullmq)
  - [AI / LLM интеграции](#ai--llm-интеграции)
  - [Загрузка файлов](#загрузка-файлов)
- [Frontend](#frontend)
  - [Страницы и маршруты](#страницы-и-маршруты)
  - [Компоненты](#компоненты)
  - [Управление состоянием](#управление-состоянием)
  - [API клиент](#api-клиент)
  - [Интернационализация](#интернационализация)
- [База данных](#база-данных)
  - [Control Plane (Master DB)](#control-plane-master-db)
  - [Tenant DB (Схема)](#tenant-db-схема)
- [Интеграция с 1С](#интеграция-с-1с)
- [LMS (Система управления обучением)](#lms-система-управления-обучением)
- [Платформа контрольных работ](#платформа-контрольных-работ)
- [Тестирование](#тестирование)
- [Деплой](#деплой)
  - [Docker Compose](#docker-compose)
  - [Caddy (reverse proxy)](#caddy-reverse-proxy)
  - [Cloudflare Tunnel](#cloudflare-tunnel)
  - [Systemd сервисы](#systemd-сервисы)
  - [Автодеплой](#автодеплой)
- [Скрипты](#скрипты)
- [Лицензия](#лицензия)

---

## Обзор

**Mirai ERP SaaS** — облачная платформа для управления образовательными учреждениями. Каждый клиент (школа/детский сад) получает изолированный поддомен и отдельную базу данных.

### Ключевые возможности

| Модуль | Описание |
|--------|----------|
| **Управление контингентом** | Дети, родители, группы/классы, временные отсутствия |
| **Кадры** | Сотрудники, посещаемость, штатное расписание |
| **Финансы** | Транзакции (приход/расход), баланс, экспорт в Excel |
| **Склад** | Товары, движения, списания, срок годности |
| **Закупки** | Заявки с workflow одобрения (Создатель → Директор → Завхоз) |
| **Кружки** | Запись, посещаемость, оценки |
| **Питание** | Меню, блюда, ингредиенты, рецепты |
| **Расписание** | Предметы, кабинеты, временные слоты |
| **LMS** | Журнал оценок, домашние задания, посещаемость учеников |
| **Контрольные работы** | Создание экзаменов с AI-проверкой, публичные ссылки |
| **AI-ассистент** | RAG-чат на основе базы знаний (Gemini + Groq) |
| **База знаний** | Markdown-статьи с семантическим поиском (pgvector) |
| **Документооборот** | Шаблоны, привязка к сотрудникам/детям |
| **Коммуникации** | Уведомления, события, обратная связь, Telegram |
| **Безопасность** | Журнал происшествий, проверки ПБ, учёт посторонних |
| **Интеграция 1С** | Двусторонняя синхронизация справочников, документов, регистров |
| **Аудит** | Полный журнал действий пользователей |
| **White-label** | Брендирование по тенанту (логотип, цвета, favicon) |
| **Демо-режим** | Read-only демо-тенант для ознакомления |

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Tunnel                         │
│      *.mirai-edu.space → Tunnel → Caddy (localhost:80)      │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │     Caddy Server     │
              │   (reverse proxy)    │
              └───┬─────────────┬────┘
                  │             │
          /api, /ws          /*
                  │             │
     ┌────────────┴──┐   ┌─────┴──────────┐
     │   Backend     │   │   Frontend      │
     │ Express:4000  │   │   Nginx:3000    │
     │  TypeScript   │   │  React SPA      │
     └───┬───────┬───┘   └────────────────┘
         │       │
    ┌────┴──┐ ┌──┴────┐
    │ Redis │ │ PG 16 │
    │ 7     │ │pgvector│
    └───────┘ └───┬───┘
                  │
        ┌─────────┴──────────┐
        │                    │
   ┌────┴─────┐   ┌─────────┴─────────┐
   │ Master DB│   │  Tenant DBs       │
   │erp_master│   │ erp_db, erp_demo, │
   │(tenants, │   │ erp_test, ...     │
   │ settings)│   │(вся бизнес-логика)│
   └──────────┘   └───────────────────┘
```

### Поток запроса

```
Браузер → hogwarts.mirai-edu.space/api/children
       ↓
  Cloudflare Tunnel → Caddy
       ↓
  tenantResolver middleware
       ↓
  Master DB: SELECT * FROM tenants WHERE subdomain = 'hogwarts'
       ↓
  Создание tenant-scoped Prisma клиента (dbUrl из тенанта)
       ↓
  req.prisma = изолированный клиент → все запросы идут в БД hogwarts
```

---

## Технологический стек

### Backend

| Технология | Версия | Назначение |
|-----------|--------|------------|
| Node.js | 18+ | Runtime |
| TypeScript | 5.3+ | Язык |
| Express.js | 4.18 | HTTP-фреймворк |
| Prisma | 6.19 | ORM + миграции |
| PostgreSQL | 16 | СУБД (с расширением pgvector) |
| Redis | 7 | Кэш и очереди |
| BullMQ | 5.73 | Фоновые задачи |
| Socket.IO | 4.8 | WebSocket (реал-тайм) |
| JWT | HS256 | Аутентификация |
| Zod | 3.23 | Валидация |
| Stripe | 22.0 | Платежи / подписки |
| Telegraf | 4.16 | Telegram-бот |
| Multer | 2.1 | Загрузка файлов |
| AWS S3 SDK | 3.x | Хранение файлов (S3/R2) |
| OpenAI SDK | 4.77 | AI (Groq-совместимый) |
| Google Generative AI | 0.24 | Embeddings (Gemini) |
| Nodemailer | 8.0 | Отправка email |
| ExcelJS | 4.4 | Генерация Excel |
| Mammoth | 1.11 | Парсинг DOCX |
| Archiver | 7.0 | Создание ZIP-архивов |
| node-cron | 4.2 | Планировщик задач |

### Frontend

| Технология | Версия | Назначение |
|-----------|--------|------------|
| React | 18.3 | UI-библиотека |
| TypeScript | 5.9 | Язык |
| Vite | 5.2 | Сборщик |
| React Router | 6.24 | Клиентский роутинг |
| Tailwind CSS | 3.4 | Утилитарные стили |
| Radix UI | 1.x–2.x | Headless-компоненты (8 пакетов) |
| Shadcn/ui | — | Design-система (CVA + Radix) |
| React Hook Form | 7.52 | Управление формами |
| Zod | 3.25 | Валидация форм |
| TanStack Table | 8.21 | Headless таблицы |
| Recharts | 3.8 | Графики и диаграммы |
| Framer Motion | 12.38 | Анимации |
| i18next | 25.6 | Интернационализация |
| Socket.IO Client | 4.8 | WebSocket |
| Lucide React | 0.408 | Иконки (1000+) |
| cmdk | 1.1 | Командная палитра |
| Sonner | 1.5 | Toast-уведомления |
| react-grid-layout | 2.2 | Drag&Drop дашборд |
| react-markdown | 9.0 | Рендеринг Markdown |
| html2canvas | 1.4 | Экспорт HTML в PNG |
| papaparse | 5.4 | CSV парсинг |
| date-fns | 4.1 | Работа с датами |

### Инфраструктура

| Технология | Назначение |
|-----------|------------|
| Docker + Docker Compose | Контейнеризация |
| Caddy | Reverse proxy с автоматическим TLS |
| Cloudflare Tunnel | Безопасный туннель (без открытых портов) |
| systemd | Управление сервисами (автозапуск, автодеплой) |
| pgvector | Векторный поиск для RAG |

---

## Структура проекта

```
erp_saas/
├── README.md                    # Этот файл
├── DEPLOYMENT.md                # Детальный гайд по деплою
├── Caddyfile                    # Конфигурация reverse proxy
├── docker-compose.yml           # Оркестрация контейнеров
├── patch_demo_access.js         # Скрипт для демо-доступа
│
├── backend/                     # Серверная часть
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile               # Multi-stage Docker сборка
│   ├── vitest.config.ts         # Конфиг тестов
│   ├── AI_KEYS_SETUP.md         # Инструкция по API ключам AI
│   ├── prisma/
│   │   ├── schema.prisma        # Tenant DB схема (60+ моделей)
│   │   ├── master/
│   │   │   └── schema.prisma    # Control Plane схема (Tenant, GlobalSetting)
│   │   ├── migrations/          # Prisma миграции
│   │   ├── seed.ts              # Основной seed
│   │   ├── seed_school.ts       # Seed школьных данных
│   │   ├── seed_economics_exam.ts  # Seed контрольной по экономике
│   │   ├── seed_inventory_items.ts # Seed складских товаров
│   │   └── seed_knowledge_base.ts  # Seed базы знаний
│   └── src/
│       ├── index.ts             # Точка входа (порт 4000)
│       ├── app.ts               # Express приложение
│       ├── config.ts            # Конфигурация из env
│       ├── prisma.ts            # Prisma клиенты
│       ├── constants/           # Константы
│       ├── lib/                 # Внутренние библиотеки
│       ├── middleware/          # Express middleware
│       ├── modules/             # Бизнес-модули (1С, SaaS)
│       ├── queues/              # BullMQ очереди
│       ├── routes/              # API маршруты
│       ├── schemas/             # Zod-схемы валидации
│       ├── scripts/             # CLI-скрипты (bootstrap, миграции)
│       ├── services/            # Бизнес-логика
│       ├── test/                # Тестовая инфраструктура
│       └── utils/               # Утилиты
│
├── frontend/                    # Клиентская часть
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.js           # Vite с мульти-entry (ERP + LMS)
│   ├── tailwind.config.js       # Design-токены
│   ├── Dockerfile               # Multi-stage Docker сборка
│   ├── nginx.conf               # Nginx для раздачи статики
│   ├── index.html               # ERP SPA точка входа
│   ├── lms.html                 # LMS SPA точка входа
│   ├── cypress.config.ts        # E2E тесты
│   ├── scripts/
│   │   ├── build.mjs            # Кастомный build-скрипт
│   │   └── serve-dist.mjs       # Локальный сервер для dist/
│   └── src/
│       ├── main.tsx             # ERP entry point
│       ├── lms.tsx              # LMS entry point (отдельное приложение)
│       ├── router/              # Маршруты (30+ страниц ERP, 7 LMS)
│       ├── pages/               # Страницы
│       ├── components/          # Переиспользуемые компоненты
│       │   ├── ui/              # Атомарные UI-примитивы (Shadcn)
│       │   ├── DataTable/       # Табличные компоненты (V1, V2)
│       │   ├── DashboardWidgets/ # Виджеты дашборда
│       │   ├── dashboard/       # Персонализация дашборда
│       │   ├── forms/           # Доменные формы (15+)
│       │   └── modals/          # Модальные окна
│       ├── features/            # Фичи (AI, 1C, маркетинг)
│       ├── contexts/            # React Context (Auth, Tenant, Permissions, Demo)
│       ├── hooks/               # Кастомные хуки (15+)
│       ├── lib/                 # API клиент, роли, утилиты
│       ├── types/               # TypeScript типы
│       ├── i18n/                # Локализация
│       ├── layouts/             # Layoutы (Auth, Main, LMS)
│       └── styles/              # Глобальные стили, CSS переменные
│
├── cloudflared/
│   └── config.yml.example       # Шаблон Cloudflare Tunnel
│
├── scripts/
│   ├── setup-ubuntu.sh          # Полный скрипт установки на Ubuntu
│   ├── erp-saas-autodeploy.sh   # Автодеплой из GitHub
│   └── erp-saas-stack-start.sh  # Запуск стека при старте системы
│
└── systemd/
    ├── erp-saas-stack.service         # Автозапуск стека
    ├── erp-saas-autodeploy.service    # Деплой unit
    └── erp-saas-autodeploy.timer      # Поллинг GitHub каждые 1 мин
```

---

## Быстрый старт

### Требования

- **Node.js** ≥ 18
- **PostgreSQL** 16 с расширением `pgvector`
- **Redis** 7+
- **Docker** + **Docker Compose** (для продакшена)

### Локальная разработка

```bash
# 1. Клонирование
git clone https://github.com/weissv/erp_saas.git
cd erp_saas

# 2. Backend
cd backend
cp .env.example .env          # Заполнить переменные окружения
npm install
npm run prisma:generate       # Генерация Prisma клиентов
npm run prisma:master:push    # Создание Control Plane схемы
npm run prisma:tenant:deploy  # Применение миграций Tenant DB
npm run dev                   # → http://localhost:4000

# 3. Frontend (в отдельном терминале)
cd frontend
npm install
npm run dev                   # → http://localhost:5173
```

### Запуск через Docker Compose

```bash
cd erp_saas

# Заполнить backend/.env и frontend/.env.production
docker compose up -d --build

# Проверка
docker compose ps
curl http://localhost:4000/api/health
curl http://localhost:3000/health
```

### Установка на Ubuntu (полная автоматизация)

```bash
sudo -E bash scripts/setup-ubuntu.sh
```

Скрипт выполняет:
1. Установку Docker, Caddy, cloudflared
2. Клонирование/обновление репозитория
3. Генерацию секретов (`POSTGRES_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY`)
4. Настройку Caddyfile и перезагрузку Caddy
5. Сборку Docker-образов
6. Запуск PostgreSQL и Redis
7. Создание БД `erp_master` и применение миграций
8. Провижининг тенантов: `mirai` (основной), `demo` (только чтение), `test`
9. Создание первого администратора
10. Запуск backend и frontend контейнеров

---

## Переменные окружения

### Backend (`backend/.env`)

| Переменная | Обязательная | Описание |
|-----------|:---:|--------|
| `DATABASE_URL` | ✅ | URL базы данных тенанта по умолчанию |
| `MASTER_DATABASE_URL` | ✅ | URL Control Plane базы данных |
| `JWT_SECRET` | ✅ | Секрет для подписи JWT (обязателен в prod) |
| `ENCRYPTION_KEY` | ✅ | 32-байтный hex ключ для AES-256-GCM шифрования |
| `POSTGRES_USER` | ✅ | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | ✅ | Пароль PostgreSQL |
| `POSTGRES_DB` | ✅ | Имя БД тенанта по умолчанию |
| `REDIS_URL` | — | URL Redis (по умолчанию `redis://redis:6379`) |
| `PORT` | — | Порт бэкенда (по умолчанию `4000`) |
| `NODE_ENV` | — | `development` / `production` |
| `CORS_ORIGIN` | — | Разрешённые origins для CORS |
| `GROQ_API_KEY` | — | API ключ Groq для AI-чата |
| `GEMINI_API_KEY` | — | API ключ Google Gemini для embeddings |
| `GOOGLE_DRIVE_API_KEY` | — | API ключ Google Drive для синхронизации документов |
| `GOOGLE_DRIVE_FOLDER_ID` | — | ID папки Google Drive |
| `STRIPE_SECRET_KEY` | — | Секретный ключ Stripe |
| `STRIPE_WEBHOOK_SECRET` | — | Webhook секрет Stripe |
| `TELEGRAM_BOT_TOKEN` | — | Токен Telegram-бота |
| `WAITLIST_TELEGRAM_ADMIN_CHAT_ID` | `8240936731` | Chat ID администратора для мгновенных waitlist-заявок |
| `STORAGE_BUCKET` | — | Имя S3/R2 бакета |
| `STORAGE_REGION` | — | Регион S3 |
| `STORAGE_ENDPOINT` | — | Endpoint S3/R2 |
| `STORAGE_ACCESS_KEY_ID` | — | Ключ доступа S3 |
| `STORAGE_SECRET_ACCESS_KEY` | — | Секретный ключ S3 |
| `SMTP_HOST` | — | SMTP сервер |
| `SMTP_PORT` | — | SMTP порт |
| `SMTP_USER` | — | SMTP пользователь |
| `SMTP_PASS` | — | SMTP пароль |
| `INITIAL_ADMIN_EMAIL` | — | Email первого администратора |
| `INITIAL_ADMIN_PASSWORD` | — | Пароль первого администратора |
| `INITIAL_TENANT_SUBDOMAIN` | — | Поддомен первого тенанта (по умолчанию `mirai`) |

### Frontend (`frontend/.env.production`)

| Переменная | Описание |
|-----------|---------|
| `VITE_API_URL` | URL бэкенда (например, `https://api.mirai-edu.space`) |
| `VITE_TELEGRAM_BOT_NAME` | Имя Telegram-бота для интеграции |
| `VITE_MARKETING_HOSTNAME` | Хосты маркетинговой страницы (через запятую) |

---

## Backend

### API маршруты

#### Публичные (без авторизации)

| Метод | Путь | Описание |
|-------|------|---------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/login` | Вход в систему |
| `POST` | `/api/auth/demo-access` | Быстрый доступ к демо-тенанту |
| `GET` | `/api/public/exams/:id` | Публичный доступ к контрольной |
| `GET` | `/api/tenant` | Информация о тенанте (брендинг) |

#### Интеграция 1С (API Key)

| Метод | Путь | Описание |
|-------|------|---------|
| `POST` | `/api/v1/integration/*` | Приём данных из 1С (push) |
| `GET` | `/api/v1/integration/sync-status` | Статус синхронизации |

#### Защищённые маршруты (JWT)

| Модуль | Базовый путь | Операции |
|--------|-------------|----------|
| Дети | `/api/children` | CRUD, поиск, фильтрация, пагинация |
| Родители | `/api/children/:id/parents` | CRUD |
| Временные отсутствия | `/api/children/:id/absences` | CRUD |
| Группы | `/api/groups` | CRUD |
| Сотрудники | `/api/employees` | CRUD, посещаемость |
| Пользователи | `/api/users` | CRUD, управление ролями |
| Финансы | `/api/finance` | CRUD, баланс, экспорт |
| Склад | `/api/inventory` | CRUD, движения, просрочки |
| Закупки | `/api/procurement` | CRUD, workflow одобрения |
| Кружки | `/api/clubs` | CRUD, записи, рейтинги |
| Посещаемость | `/api/attendance` | Отметки, статистика |
| Расписание | `/api/schedule` | Предметы, слоты, кабинеты |
| Меню | `/api/menu` | Меню, блюда, ингредиенты |
| Техобслуживание | `/api/maintenance` | Заявки с workflow |
| Документы | `/api/documents` | Загрузка, шаблоны |
| Безопасность | `/api/security` | Журнал инцидентов |
| Уведомления | `/api/notifications` | CRUD |
| События | `/api/events` | CRUD |
| Обратная связь | `/api/feedback` | CRUD, ответы |
| Журнал действий | `/api/action-log` | Чтение |
| База знаний | `/api/knowledge-base` | CRUD, семантический поиск |
| AI-ассистент | `/api/ai` | Чат, управление документами |
| Контрольные | `/api/exams` | CRUD, AI-проверка, результаты |
| LMS | `/api/lms/*` | Оценки, ДЗ, расписание, посещаемость |
| Файлы | `/api/upload` | Загрузка в S3/R2 |
| Telegram | `/api/telegram` | Настройка бота, привязка пользователей |
| Настройки 1С | `/api/integrations/onec` | Конфигурация |
| Роли и права | `/api/permissions` | CRUD прав доступа по ролям |
| Дашборд | `/api/dashboard` | Персонализация |
| Штатное расписание | `/api/staffing` | Позиции, ставки |

### Модули

#### Интеграция с 1С (`src/modules/onec/`)

Двусторонняя интеграция с «1С:Предприятие» через OData и Push API:

- **Pull (OData)**: Периодический опрос 1С сервера через OData API
  - Финансовые документы (ПКО, РКО, банковские выписки)
  - Контрагенты, физические лица, статьи ДДС
  - Справочники (номенклатура, организации, сотрудники, должности, склады и т.д.)
  - Кадровые документы (приём, увольнение, отпуск)
  - Зарплатные документы
  - Регистры накопления и сведений
  - UTF-8 Basic Auth, настраиваемый таймаут
- **Push (REST)**: 1С отправляет данные на наш endpoint
  - Bearer-токен аутентификация (SHA-256 хэш)
  - BullMQ очередь для обработки
  - Audit log для каждого синк-задания

#### SaaS модуль (`src/modules/saas/`)

Управление жизненным циклом подписок:

```
ACTIVE → SOFT_LOCKED (1 день) → HARD_LOCKED (14 дней) → PURGING (60 дней) → PURGED
```

- Обработка Stripe Webhooks
- Провижининг тенанта при оплате подписки
- Автоматическое создание БД и применение миграций
- Grace-периоды при неоплате

### Сервисы

| Сервис | Описание |
|--------|---------|
| `AiService` | Gemini embeddings (768-dim), Groq чат, синхронизация Google Drive |
| `ChildService` | Управление детьми с поиском, фильтрацией, пагинацией |
| `EmployeeService` | Управление персоналом + посещаемость сотрудников |
| `KnowledgeBaseService` | Статьи + семантический векторный поиск (pgvector) |
| `StorageService` | Загрузка в S3/R2 с tenant-scoped путями |
| `PermissionService` | RBAC — ролевой контроль доступа |
| `ProcurementService` | Workflow закупок (Создатель → Одобряющий → Принимающий) |
| `InventorySyncService` | Синхронизация складских документов с 1С |
| `SystemSettingsService` | Персистентное key-value хранилище настроек |
| `TelegramService` | Telegram-бот + привязка к пользователям |
| `TenantIntegrationsService` | Управление per-tenant учётными данными (с 1-мин кэшем) |
| `EncryptionService` | AES-256-GCM для шифрования BYOK ключей |
| `UserService` | Аутентификация и жизненный цикл пользователей |
| `ExamAiService` | AI-проверка контрольных работ (открытые вопросы) |
| `CronJitterService` | Рандомизация расписания cron для предотвращения thundering herd |

### Middleware

| Middleware | Назначение |
|-----------|-----------|
| `tenantResolver` | Извлечение поддомена → поиск тенанта в Master DB → создание scoped Prisma клиента |
| `auth` | JWT из cookie / Authorization header → `req.user` (id, role, employeeId) |
| `checkRole` | Проверка доступа по ролям (массив разрешённых ролей) |
| `validate` | Валидация request body/params/query через Zod-схемы |
| `errorHandler` | Централизованная обработка ошибок (Zod, Prisma, JWT, операционные) |
| `actionLogger` | Аудит действий пользователей (action + details → ActionLog) |
| `cors` | Cross-Origin Resource Sharing |
| `morgan` | HTTP request logging |
| `cookie-parser` | Парсинг cookies |

### Аутентификация и авторизация

- **Метод**: JWT (HS256), время жизни — 12 часов
- **Хранение токена**: HTTP-only cookie (prod: `secure` + `sameSite: none`)
- **Fallback**: заголовок `Authorization: Bearer <token>`
- **Роли** (7 типов):

| Роль | Описание | Полный доступ |
|------|---------|:---:|
| `DEVELOPER` | Разработчик | ✅ |
| `DIRECTOR` | Директор | ✅ |
| `DEPUTY` | Завуч | — |
| `ADMIN` | Администратор | — |
| `TEACHER` | Учитель | — |
| `ACCOUNTANT` | Бухгалтер | — |
| `ZAVHOZ` | Завхоз | — |

- **DEVELOPER** и **DIRECTOR** имеют полный доступ ко всем модулям
- Для остальных ролей доступ контролируется через `RolePermission` (модули + CRUD флаги)

### Мультитенантность

Архитектура **database-per-tenant** с полной изоляцией данных:

1. **Поддомен-based роутинг**: `hogwarts.mirai-edu.space` → `subdomain = 'hogwarts'`
2. **Control Plane (Master DB)**: хранит метаданные тенантов (`subdomain`, `dbUrl`, `status`)
3. **Tenants**: каждый получает отдельную PostgreSQL БД
4. **Prisma клиент**: создаётся per-request с подключением к БД тенанта
5. **AsyncLocalStorage**: tenant context доступен в любом месте кода

```
Tenant "hogwarts" → erp_hogwarts (своя изолированная БД)
Tenant "demo"     → erp_demo     (read-only демо)
Tenant "mirai"    → erp_db       (основная школа)
```

**Жизненный цикл тенанта:**
- `TRIAL` → `ACTIVE` → `SUSPENDED` → `DEACTIVATED`
- Stripe подписка управляет переходами

### Очереди (BullMQ)

| Очередь | Назначение | Частота |
|---------|-----------|---------|
| `onec-sync` | Синхронизация с 1С через OData | Каждые 15 минут (настраивается) |
| `onec-push` | Обработка входящих webhook от 1С | По событию |

- **Retry**: 3 попытки с экспоненциальной задержкой
- **Автоочистка**: хранит последние 50 завершённых + 100 неудачных заданий
- **Изоляция**: задания привязаны к конкретному тенанту

### AI / LLM интеграции

| Провайдер | Назначение | Модель | Бесплатный лимит |
|-----------|-----------|--------|-----------------|
| **Google Gemini** | Embeddings (768-dim векторы) | `text-embedding-004` | 1,500 запросов/день |
| **Groq** | AI-чат (основной / быстрый / мощный) | `qwen/qwen3-32b`, `llama-3.1-8b-instant`, `openai/gpt-oss-120b` | 14,400 запросов/день |
| **OpenAI** | BYOK — пользовательский ключ (per-tenant) | Выбор пользователя | Аккаунт пользователя |
| **Google Drive** | Автоматическая синхронизация учебных материалов | — | Google API |

**RAG Pipeline:**
1. Документы → разбиваются на чанки
2. Чанки → Gemini `text-embedding-004` → 768-dim вектор
3. Векторы → PostgreSQL + pgvector
4. Запрос пользователя → embedding → cosine similarity search → top-K документов
5. Top-K + запрос → Groq `qwen3-32b` → ответ с контекстом

**BYOK (Bring Your Own Key):**
- OpenAI ключ шифруется AES-256-GCM перед сохранением
- В БД хранится только ciphertext + IV + auth tag
- Plaintext ключ **никогда** не сохраняется

### Загрузка файлов

- **Хранилище**: S3 или Cloudflare R2 (через AWS SDK)
- **Путь**: `/{tenantId}/{userId}/{randomToken}_{filename}`
- **Макс. размер**: 50 MB
- **Безопасность**: валидация MIME-типа, санитизация имени файла
- **Изоляция**: tenant-scoped пути, контроль владельца

---

## Frontend

### Страницы и маршруты

#### ERP (30+ маршрутов)

| Путь | Компонент | Роли | Описание |
|------|-----------|------|---------|
| `/dashboard` | DashboardPage | Все | Главный дашборд с виджетами |
| `/children` | ChildrenPage | DIRECTOR, DEPUTY, ADMIN | Список детей |
| `/children/:id` | ChildDetailPage | DIRECTOR, DEPUTY, ADMIN | Профиль ребёнка |
| `/employees` | EmployeesPage | DIRECTOR, DEPUTY, ADMIN | Список сотрудников |
| `/schedule` | SchedulePage | DIRECTOR, DEPUTY, ADMIN, TEACHER | Расписание уроков |
| `/attendance` | AttendancePage | DIRECTOR, DEPUTY, ADMIN, TEACHER | Посещаемость |
| `/clubs` | ClubsPage | DIRECTOR, DEPUTY, ADMIN, ACCOUNTANT, TEACHER | Кружки |
| `/finance` | FinancePage | DIRECTOR, DEPUTY, ADMIN, ACCOUNTANT | Финансы |
| `/inventory` | InventoryPage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Склад |
| `/menu` | MenuPage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Меню питания |
| `/recipes` | RecipesPage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Рецепты |
| `/procurement` | ProcurementPage | DIRECTOR, DEPUTY, ADMIN, ACCOUNTANT, ZAVHOZ | Закупки |
| `/maintenance` | MaintenancePage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Техобслуживание |
| `/security` | SecurityPage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Безопасность |
| `/documents` | DocumentsPage | DIRECTOR, DEPUTY, ADMIN | Документы |
| `/calendar` | CalendarPage | DIRECTOR, DEPUTY, ADMIN, ZAVHOZ | Календарь |
| `/feedback` | FeedbackPage | Все | Обратная связь |
| `/integration` | IntegrationPage | DIRECTOR, DEPUTY, ADMIN, ACCOUNTANT | Импорт/экспорт |
| `/onec-data` | OneCDataPage | DIRECTOR, DEPUTY, ADMIN, ACCOUNTANT | Просмотр данных 1С |
| `/action-log` | ActionLogPage | DIRECTOR, DEPUTY, ADMIN | Журнал аудита |
| `/notifications` | NotificationsPage | DIRECTOR, DEPUTY, ADMIN | Уведомления |
| `/ai-assistant` | AiAssistantPage | DIRECTOR, DEPUTY, ADMIN, TEACHER | AI-ассистент |
| `/users` | UsersPage | DIRECTOR, DEPUTY, ADMIN | Управление пользователями |
| `/groups` | GroupsPage | DIRECTOR, DEPUTY, ADMIN | Группы/классы |
| `/staffing` | StaffingPage | DIRECTOR | Штатное расписание |
| `/exams` | ExamsPage | DIRECTOR, DEPUTY, ADMIN, TEACHER | Контрольные работы |
| `/exams/:id/edit` | ExamEditorPage | DIRECTOR, DEPUTY, ADMIN, TEACHER | Редактор экзамена |
| `/exams/:id/results` | ExamResultsPage | DIRECTOR, DEPUTY, ADMIN, TEACHER | Результаты |
| `/exam/:token` | ExamTakePage | **Публичный** | Прохождение экзамена |
| `/knowledge-base` | KnowledgeBase | Все | База знаний |
| `/knowledge-base/:slug` | KnowledgeBase | Все | Статья |
| `/auth/login` | LoginPage | Публичный | Авторизация |
| `/` | LandingPage | Публичный (маркетинг host) | Маркетинговая страница |

#### LMS (7 маршрутов)

| Путь | Компонент | Описание |
|------|-----------|---------|
| `/school` | LmsSchoolDashboard | Дашборд школьной LMS |
| `/school/classes` | LmsClassesPage | Управление классами |
| `/school/classes/:classId` | LmsClassesPage | Детальная страница класса |
| `/school/gradebook` | LmsGradebookPage | Журнал оценок учителя |
| `/school/schedule` | LmsSchedulePage | Расписание уроков |
| `/school/homework` | LmsAssignmentsPage | Домашние задания |
| `/school/attendance` | LmsProgressPage | Посещаемость |
| `/diary` | LmsDiaryPage | Дневник ученика/родителя |

### Компоненты

#### UI-примитивы (`components/ui/`)
Построены на базе Radix UI + CVA (class-variance-authority):
- `Button`, `Input`, `Card`, `Badge`, `Checkbox`
- `Dialog`, `DropdownMenu`, `Popover`, `Sheet`, `Tooltip`
- `Command` (командная палитра)
- `FormError`, `ErrorBoundary`
- `EmptyState`, `LoadingState`
- `InventoryAutocomplete`

#### Таблицы (`components/DataTable/`)
- `DataTable` — V1 (базовая)
- `DataTableV2` — V2 (рекомендуемая, с пагинацией и сортировкой)

#### Дашборд (`components/dashboard/` + `components/DashboardWidgets/`)
- `DashboardLayout` — контейнер дашборда
- `WidgetRenderer` — динамический рендеринг виджетов
- `WidgetChrome` — обёртка виджета
- `PersonalizationPanel` — UI настройки виджетов
- `FinanceChart` — графики на Recharts
- `KpiCard` — карточки KPI
- Drag&Drop раскладка через `react-grid-layout`

#### Формы (`components/forms/`)
15+ доменных форм:
- `ChildForm`, `EmployeeForm`, `UserForm`
- `TransactionForm`, `SupplierForm`, `PurchaseOrderForm`
- `DocumentForm`, `DocumentTemplateForm`
- `IngredientForm`, `DishForm`
- `MaintenanceForm`, `FeedbackForm`, `FeedbackResponseForm`
- `EventForm`, `BugReportForm`

#### Навигация
- `SideNav` — основная боковая панель ERP
- `LmsSideNav` — боковая панель LMS
- `DemoBanner` — баннер read-only демо-режима
- `CalendarGrid` — компонент календаря

#### Easter Egg
- `DoomGame` — игра, активируемая через Konami Code (↑↑↓↓←→←→BA)

### Управление состоянием

#### AuthContext
- Состояние аутентификации (`user`, `token`, `isAuthenticated`)
- 12-часовой auto-expiry
- HttpOnly cookie + localStorage fallback
- Методы: `hasRole()`, `hasPermission()`

#### TenantContext
- White-label брендирование (`name`, `logoUrl`, `faviconUrl`, `primaryColor`)
- Динамические CSS-переменные (`--primary-color`, `--primary-tint`)
- Обновление title и favicon документа

#### PermissionsContext
- Ролевые разрешения (`role`, `isFullAccess`, `modules`, `canCreate/Edit/Delete/Export`)
- Проверка доступа к модулям: `hasModuleAccess(modulePath)`

#### DemoContext
- Флаг `isDemo` для read-only режима
- Блокировка операций записи

### API клиент

Централизованный HTTP-клиент (`lib/api.ts`, 400+ строк):

```typescript
class API {
  get<T>(path, params)    // GET с query параметрами
  post<T>(path, data)     // POST
  put<T>(path, data)      // PUT
  patch<T>(path, data)    // PATCH
  delete<T>(path)         // DELETE

  setToken(token)                  // Управление JWT
  setOnUnauthorized(callback)      // Обработка 401
  addRequestInterceptor(fn)        // Interceptor запросов
  addResponseInterceptor(fn)       // Interceptor ответов
  addErrorInterceptor(fn)          // Interceptor ошибок
}
```

- Автоматическая инъекция Bearer токена
- `credentials: 'include'` для cookies
- Типизированный `ApiRequestError` с `statusCode`, `code`, `details`

**Специализированные API:**
- `lib/exams-api.ts` — API экзаменов (публичные + защищённые)
- `lib/lms-api.ts` — API LMS (70+ методов)

### Интернационализация

- Фреймворк: **i18next** + **react-i18next**
- Автодетекция языка браузера: `i18next-browser-languagedetector`
- Настройка через `src/i18n/`

---

## База данных

### Control Plane (Master DB)

Файл: `backend/prisma/master/schema.prisma`

| Модель | Описание |
|--------|---------|
| `Tenant` | `id`, `subdomain` (unique), `dbUrl`, `stripeId`, `status`, `name` |
| `GlobalSetting` | Key-value хранилище платформенных настроек |

**Статусы тенанта:** `ACTIVE`, `TRIAL`, `SUSPENDED`, `DEACTIVATED`

### Tenant DB (Схема)

Файл: `backend/prisma/schema.prisma` — **60+ моделей**, PostgreSQL 16 с расширением pgvector.

#### Пользователи и авторизация
| Модель | Описание |
|--------|---------|
| `User` | Пользователь системы (email, role, связь с Employee, Telegram) |
| `Employee` | Сотрудник (ФИО, должность, ставка, даты) |
| `RolePermission` | Права доступа по ролям (модули, CRUD флаги) |

#### Контингент
| Модель | Описание |
|--------|---------|
| `Child` | Ребёнок (ФИО, дата рождения, группа, здоровье, документы) |
| `Parent` | Родитель (ФИО, телефон, email, место работы) |
| `Group` | Класс/группа (название, учитель, вместимость) |
| `TemporaryAbsence` | Временное отсутствие ребёнка |

#### Кружки
| Модель | Описание |
|--------|---------|
| `Club` | Кружок (название, учитель, расписание, стоимость) |
| `ClubEnrollment` | Запись ребёнка в кружок |
| `Attendance` | Посещаемость (группа / кружок) |
| `ClubRating` | Оценка ребёнка в кружке (1-5) |

#### Финансы
| Модель | Описание |
|--------|---------|
| `FinanceTransaction` | Финансовая транзакция (сумма, тип, категория, 1С поля) |
| `Contractor` | Контрагент из 1С |
| `Person` | Физическое лицо из 1С |
| `CashFlowArticle` | Статья движения денежных средств из 1С |
| `Invoice` | Товарный документ (поступление / реализация) |
| `BalanceSnapshot` | Агрегированный остаток (касса, банк, контрагент) |

#### Склад и закупки
| Модель | Описание |
|--------|---------|
| `InventoryItem` | Складской товар (количество, единица, срок годности) |
| `InventoryTransaction` | Движение товара (приход, расход, списание, корректировка) |
| `PurchaseOrder` | Заявка на закупку с workflow |
| `PurchaseOrderItem` | Позиция заказа |
| `Supplier` | Поставщик |

#### Питание
| Модель | Описание |
|--------|---------|
| `Ingredient` | Ингредиент (КБЖУ) |
| `Dish` | Блюдо |
| `DishIngredient` | Связь блюдо-ингредиент |
| `Menu` | Меню на дату (по возрастной группе) |
| `MenuDish` | Связь меню-блюдо (тип приёма пищи) |

#### Расписание
| Модель | Описание |
|--------|---------|
| `Subject` | Учебный предмет |
| `Room` | Учебный кабинет |
| `TimeSlot` | Временной слот (звонок) |
| `TeacherSubject` | Связь учитель-предмет |
| `ScheduleSlot` | Слот расписания (урок) |

#### Хозяйство и безопасность
| Модель | Описание |
|--------|---------|
| `MaintenanceRequest` | Заявка на техобслуживание (workflow) |
| `MaintenanceItem` | Позиция заявки |
| `CleaningSchedule` | Графики уборки |
| `CleaningLog` | Журнал уборки |
| `Equipment` | Оборудование (дата следующего осмотра) |
| `SecurityLog` | Журнал безопасности |
| `StaffingTable` | Штатное расписание |
| `EmployeeAttendance` | Посещаемость сотрудников |

#### Документооборот и коммуникации
| Модель | Описание |
|--------|---------|
| `DocumentTemplate` | Шаблон документа |
| `Document` | Документ (привязка к сотруднику/ребёнку) |
| `Notification` | Уведомление (по роли/группе) |
| `Event` | Событие/мероприятие |
| `Feedback` | Обратная связь (жалобы, предложения) |

#### AI / RAG / База знаний
| Модель | Описание |
|--------|---------|
| `KnowledgeBaseDocument` | Документ для RAG (embedding 768-dim) |
| `KnowledgeBaseArticle` | Статья базы знаний (Markdown + embedding + теги) |
| `SystemSetting` | Персистентное key-value хранилище (промпты, флаги) |

#### LMS
| Модель | Описание |
|--------|---------|
| `LmsSchoolStudent` | Связь ребёнок-класс для LMS |
| `LmsSubject` | Школьный предмет LMS |
| `LmsScheduleItem` | Элемент расписания LMS |
| `LmsGrade` | Оценка (1-5, типы: обычная/тест/экзамен/четвертная) |
| `LmsHomework` | Домашнее задание |
| `LmsHomeworkSubmission` | Сдача ДЗ |
| `LmsStudentAttendance` | Посещаемость ученика |
| `LmsClassAnnouncement` | Объявление для класса |

#### Контрольные работы
| Модель | Описание |
|--------|---------|
| `Exam` | Контрольная работа (настройки, публичный токен) |
| `ExamQuestion` | Вопрос (6 типов: выбор, текст, задача, верно/неверно) |
| `ExamTargetGroup` | Привязка к классам |
| `ExamSubmission` | Прохождение студентом |
| `ExamAnswer` | Ответ (авто + AI + ручная проверка) |

#### Персонализация
| Модель | Описание |
|--------|---------|
| `DashboardPreference` | Настройки дашборда (layout, виджеты, фильтры, пресеты) |
| `ActionLog` | Журнал действий пользователей |

#### Интеграции
| Модель | Описание |
|--------|---------|
| `TenantIntegrations` | Per-tenant API ключи (Telegram, Gemini, Groq, OpenAI, Google Drive, 1C) |
| `OneCPushSyncLog` | Audit log для push-синхронизации с 1С |

#### 1С: Справочники
| Модель | Описание |
|--------|---------|
| `OneCOrganization` | Catalog_Организации |
| `OneCNomenclature` | Catalog_Номенклатура |
| `OneCBankAccount` | Catalog_БанковскиеСчета |
| `OneCContract` | Catalog_ДоговорыКонтрагентов |
| `OneCEmployee` | Catalog_Сотрудники |
| `OneCPosition` | Catalog_Должности |
| `OneCFixedAsset` | Catalog_ОсновныеСредства |
| `OneCWarehouse` | Catalog_Склады |
| `OneCCurrency` | Catalog_Валюты |
| `OneCDepartment` | Catalog_ПодразделенияОрганизаций |
| `OneCCatalog` | Универсальный справочник (для всех остальных каталогов) |

#### 1С: Документы
| Модель | Описание |
|--------|---------|
| `OneCDocument` | Универсальная модель документов (счета-фактуры, авансы, и т.д.) |
| `OneCHRDocument` | Кадровые документы (приём, увольнение, отпуск, больничный) |
| `OneCPayrollDocument` | Зарплатные документы (начисление, ведомости) |
| `OneCRegister` | Регистры 1С (накопления и сведений) |

---

## Интеграция с 1С

Платформа поддерживает два режима синхронизации с «1С:Предприятие»:

### Pull (OData) — ERP забирает данные из 1С

```
1С:Предприятие → OData API → BullMQ очередь (onec-sync) → Обработка → Tenant DB
```

- Интервал: настраивается через `oneCCronSchedule` (по умолчанию `*/15 * * * *`)
- Данные: финансовые документы, справочники, кадровые документы, зарплата, регистры
- Аутентификация: UTF-8 Basic Auth
- Per-tenant учётные данные из `TenantIntegrations`

### Push (REST) — 1С отправляет данные к нам

```
1С:Предприятие → POST /api/v1/integration/* → BullMQ очередь (onec-push) → Обработка → Tenant DB
```

- Аутентификация: Bearer-токен (SHA-256 хэш хранится в БД)
- Подтверждение каждого задания через `OneCPushSyncLog`
- Поддержка батчевой отправки

### Синхронизируемые сущности

**Справочники:** Организации, Номенклатура, Банковские счета, Контрагенты, Договоры, Сотрудники, Должности, Основные средства, Склады, Валюты, Подразделения, и ещё ~10 через универсальный `OneCCatalog`.

**Документы:** ПКО, РКО, Банковские выписки, Поступления товаров, Реализации, Счета-фактуры, Авансовые отчёты, Инвентаризации, и ещё ~15 через универсальный `OneCDocument`.

**Кадры:** Приём на работу, Увольнение, Перевод, Отпуск, Больничный.

**Зарплата:** Начисление, Ведомости, Удержания.

**Регистры:** Регистры накопления и сведений (графики работы, НДС, и т.д.).

---

## LMS (Система управления обучением)

Отдельное React-приложение со своей точкой входа (`lms.html` → `lms.tsx`):

- **Журнал оценок**: Оценки 1-5, типы (обычная, тест, экзамен, четвертная), комментарии
- **Домашние задания**: Создание, сдача, проверка с баллами и обратной связью
- **Расписание**: Привязка к классам, предметам, учителям, кабинетам
- **Посещаемость**: Статусы (присутствует, отсутствует, опоздал, по уважительной причине)
- **Объявления**: Для класса или всей школы, с закреплением и датой истечения
- **Дневник**: Интерфейс для учеников/родителей

Интеграция с основным ERP через общие модели (`Group`, `Employee`, `Child`).

---

## Платформа контрольных работ

Полнофункциональная система для проведения экзаменов с AI-проверкой:

### Типы вопросов
| Тип | Описание | Проверка |
|-----|---------|----------|
| `MULTIPLE_CHOICE` | Выбор нескольких вариантов | Авто |
| `SINGLE_CHOICE` | Выбор одного варианта | Авто |
| `TEXT_SHORT` | Короткий текстовый ответ | Авто |
| `TEXT_LONG` | Развёрнутый ответ | AI + ручная |
| `PROBLEM` | Задача с решением | AI + ручная |
| `TRUE_FALSE` | Верно/Неверно | Авто |

### Возможности
- Публичная ссылка для прохождения (без авторизации) по уникальному токену
- Лимит времени, перемешивание вопросов и вариантов
- AI-проверка открытых ответов (Groq) с обратной связью
- Частичный зачёт баллов
- Ручная проверка учителем поверх AI
- Привязка к классам/группам
- Экспорт результатов

---

## Тестирование

### Backend (Vitest)

```bash
cd backend
npm test                 # Запуск тестов
npm run test:watch       # Watch-режим
npm run test:coverage    # Покрытие кода
npm run test:ui          # UI-дашборд
```

- **Framework**: Vitest 2.1.4
- **Pool**: single fork (стабильность)
- **Coverage**: порог 60%
- **Моки**: Prisma клиент, переменные окружения
- **Supertest**: для E2E тестирования API

### Frontend (Vitest + Cypress)

#### Unit-тесты (Vitest)
```bash
cd frontend
npm test                 # Vitest
```

- **Testing Library**: `@testing-library/react`, `jest-dom`
- **Среда**: jsdom

#### E2E-тесты (Cypress)
```bash
cd frontend
npm run cypress:open     # Открыть UI Cypress
npm run cypress:run      # Запуск в CI-режиме
```

- **Framework**: Cypress 13.13
- 10+ тестовых сценариев
- Автоматический запуск dev-сервера (порт 5172)

---

## Деплой

### Docker Compose

Файл: `docker-compose.yml`

| Сервис | Образ | Порт | Описание |
|--------|-------|------|---------|
| `postgres` | `pgvector/pgvector:pg16` | (внутренний) | PostgreSQL 16 + pgvector |
| `redis` | `redis:7-alpine` | (внутренний) | Redis с AOF-персистенцией |
| `backend` | Custom (multi-stage) | `127.0.0.1:4000` | Express API |
| `frontend` | Custom (multi-stage + Nginx) | `127.0.0.1:3000` | React SPA |

Все сервисы в единой Docker-сети `erp_network`. Порты привязаны к `127.0.0.1` (не доступны извне).

#### Backend Dockerfile (multi-stage)
1. `deps` — установка node_modules (кэшируемый слой)
2. `builder` — генерация Prisma, компиляция TypeScript, prune
3. `runner` — минимальный production образ

#### Frontend Dockerfile (multi-stage)
1. Установка зависимостей
2. Сборка Vite (TypeScript + production build)
3. Nginx для раздачи статики + SPA fallback

### Caddy (reverse proxy)

Файл: `Caddyfile`

Caddy выступает единым входом:

```
http://mirai-edu.space         → /api*, /ws* → backend:4000
                               → /*          → frontend:3000

http://*.mirai-edu.space       → /api*, /ws* → backend:4000
                               → /*          → frontend:3000

http://api.mirai-edu.space     → всё         → backend:4000
```

- Инъекция `X-Tenant-Subdomain: mirai` для root-домена
- Сжатие gzip/zstd
- HTTPS через Cloudflare Tunnel (auto_https off)

### Cloudflare Tunnel

Обеспечивает безопасное подключение без открытых портов:

```
Интернет → Cloudflare Edge → Tunnel → localhost:80 (Caddy)
```

- Wildcard DNS `*.mirai-edu.space` — новые тенанты работают автоматически
- Конфигурация: `cloudflared/config.yml.example`
- Автоматическая настройка через `setup-ubuntu.sh` при наличии `CLOUDFLARE_TUNNEL_TOKEN`

### Systemd сервисы

| Файл | Тип | Описание |
|------|-----|---------|
| `erp-saas-stack.service` | oneshot + RemainAfterExit | Запуск стека при старте системы |
| `erp-saas-autodeploy.service` | oneshot | Проверка и деплой обновлений из Git |
| `erp-saas-autodeploy.timer` | timer | Поллинг GitHub каждые 1 минуту |

```bash
# Установка
sudo cp systemd/*.service systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable erp-saas-stack.service
sudo systemctl enable --now erp-saas-autodeploy.timer
```

### Автодеплой

Скрипт `scripts/erp-saas-autodeploy.sh`:
1. `git fetch origin main`
2. Сравнение `HEAD` с `origin/main`
3. Если есть новые коммиты — `git pull`
4. Копирование env-файла, обновление Caddyfile
5. `docker compose build backend frontend`
6. Применение миграций (master + tenant)
7. `bootstrap:mirai` — обновление тенанта
8. `docker compose up -d backend frontend`

---

## Скрипты

### Backend (`npm run ...`)

| Команда | Описание |
|---------|---------|
| `dev` | Запуск dev-сервера с авторестартом (`ts-node-dev`) |
| `build` | Компиляция TypeScript (`tsc`) |
| `start` | Запуск скомпилированного JS |
| `start:runtime` | Запуск через tsx (без компиляции) |
| `prisma:generate` | Генерация Prisma клиентов (tenant + master) |
| `prisma:migrate:deploy` | Применение миграций |
| `prisma:tenant:deploy` | Применение миграций тенанта (с fallback на `db push`) |
| `prisma:master:push` | Push схемы Control Plane |
| `bootstrap:mirai` | Создание/обновление тенанта mirai + первого администратора |
| `test` | Запуск тестов (vitest run) |
| `test:watch` | Watch-режим тестов |
| `test:coverage` | Отчёт о покрытии |
| `test:ui` | UI-дашборд тестов |

### Frontend (`npm run ...`)

| Команда | Описание |
|---------|---------|
| `dev` | Vite dev-сервер (порт 5173) |
| `build` | Production-сборка (TypeScript check + Vite) |
| `lint` | ESLint (строгий режим, 0 warnings) |
| `test` | Vitest unit-тесты |
| `preview` | Превью production-сборки |
| `cypress:open` | E2E тесты (UI) |
| `cypress:run` | E2E тесты (CI) |

### Инфраструктурные

| Скрипт | Описание |
|--------|---------|
| `scripts/setup-ubuntu.sh` | Полная установка на Ubuntu (Docker, Caddy, cloudflared, всё) |
| `scripts/erp-saas-autodeploy.sh` | Автодеплой из GitHub |
| `scripts/erp-saas-stack-start.sh` | Запуск стека (для systemd) |

---

## Настройка AI ключей

Подробная инструкция: [`backend/AI_KEYS_SETUP.md`](backend/AI_KEYS_SETUP.md)

| Ключ | Провайдер | Как получить | Стоимость |
|------|-----------|-------------|-----------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | Create API Key | Бесплатно (1,500 req/day) |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/keys) | Create API Key | Бесплатно (14,400 req/day) |
| `GOOGLE_DRIVE_API_KEY` | [Google Cloud Console](https://console.developers.google.com/) | Credentials → API Key | Бесплатно |

---

## DNS и маршрутизация

```
mirai-edu.space         → Cloudflare Tunnel → Caddy → frontend / backend
*.mirai-edu.space       → wildcard DNS → Tunnel catch-all → Caddy → tenant resolution
api.mirai-edu.space     → Tunnel → Caddy → backend (напрямую)
```

Wildcard DNS запись означает, что новые тенанты (`hogwarts.mirai-edu.space`, `demo.mirai-edu.space`) начинают работать **без ручного добавления DNS записей**.

---

## Лицензия

**Автор:** Izumi Amano

ISC License
