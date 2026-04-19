import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  Clock3,
  FileText,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

export type MarketingLanguage = "ru" | "en" | "ja";

export interface MarketingMetric {
  value: string;
  label: string;
  description: string;
}

export interface MarketingFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
}

export interface MarketingAudience {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
}

export interface MarketingStep {
  title: string;
  description: string;
  bullets: string[];
}

export interface MarketingSectionCopy {
  badge: string;
  title: string;
  description: string;
}

export interface MarketingTextBlock {
  title: string;
  description: string;
  bullets: string[];
}

export interface MarketingSimpleItem {
  title: string;
  description: string;
}

export interface MarketingNavItem {
  label: string;
  href: string;
}

export interface MarketingLanguageOption {
  code: MarketingLanguage;
  shortLabel: string;
  nativeLabel: string;
}

export interface MarketingCopy {
  metadata: {
    title: string;
    description: string;
  };
  brandTagline: string;
  navigationAriaLabel: string;
  languageSwitcherLabel: string;
  headerDemoCta: string;
  loginCta: string;
  waitlistCta: string;
  hero: {
    badge: string;
    title: string;
    description: string;
    demoCta: string;
    learnMoreCta: string;
  };
  heroPanel: {
    eyebrow: string;
    title: string;
    description: string;
  };
  capabilities: MarketingSectionCopy;
  aiSection: MarketingSectionCopy;
  operations: MarketingSectionCopy;
  audiences: MarketingSectionCopy;
  implementation: MarketingSectionCopy;
  implementationAside: {
    eyebrow: string;
    title: string;
    description: string;
  };
  waitlist: {
    badge: string;
    title: string;
    description: string;
    schoolLabel: string;
    schoolPlaceholder: string;
    contactLabel: string;
    contactPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    validationError: string;
    successMessage: string;
    errorFallback: string;
    submitIdle: string;
    submitLoading: string;
  };
  unifiedExperience: {
    eyebrow: string;
    title: string;
    description: string;
    demoCta: string;
  };
  footerDescription: string;
  loginModal: {
    title: string;
    description: string;
    eyebrow: string;
    highlightLabel: string;
    highlightDescription: string;
    addressLabel: string;
    addressPlaceholder: string;
    examples: string;
    redirectLabel: string;
    defaultTarget: string;
    cancelCta: string;
    submitCta: string;
  };
  navItems: MarketingNavItem[];
  heroHighlights: MarketingSimpleItem[];
  metrics: MarketingMetric[];
  features: MarketingTextBlock[];
  aiScenarios: MarketingTextBlock[];
  operationsList: MarketingTextBlock[];
  audiencesList: MarketingTextBlock[];
  implementationSteps: MarketingStep[];
  trustSignals: MarketingSimpleItem[];
}

export interface MarketingContent {
  copy: MarketingCopy;
  navItems: MarketingNavItem[];
  heroHighlights: MarketingSimpleItem[];
  metrics: MarketingMetric[];
  features: MarketingFeature[];
  aiScenarios: MarketingFeature[];
  operations: MarketingFeature[];
  audiences: MarketingAudience[];
  implementationSteps: MarketingStep[];
  trustSignals: Array<MarketingSimpleItem & { icon: LucideIcon }>;
}

export const MARKETING_LANGUAGE_OPTIONS: MarketingLanguageOption[] = [
  { code: "ru", shortLabel: "RU", nativeLabel: "Русский" },
  { code: "en", shortLabel: "EN", nativeLabel: "English" },
  { code: "ja", shortLabel: "日本語", nativeLabel: "日本語" },
];

export const MARKETING_SUPPORTED_LANGUAGES = MARKETING_LANGUAGE_OPTIONS.map(
  ({ code }) => code
) as MarketingLanguage[];

export function resolveMarketingLanguage(language: string | null | undefined): MarketingLanguage {
  const normalized = language?.toLowerCase().split(/[-_]/)[0];
  return MARKETING_SUPPORTED_LANGUAGES.includes(normalized as MarketingLanguage)
    ? (normalized as MarketingLanguage)
    : "ru";
}

const MARKETING_COPY: Record<MarketingLanguage, MarketingCopy> = {
  ru: {
    metadata: {
      title: "Mirai Edu — AI-платформа для управления школой",
      description:
        "Mirai Edu объединяет ERP, LMS, финансы, коммуникации и AI-автоматизацию в единой SaaS-платформе для школ.",
    },
    brandTagline: "AI-first ERP и LMS для школ в одном контуре",
    navigationAriaLabel: "Разделы лендинга",
    languageSwitcherLabel: "Выбор языка",
    headerDemoCta: "Демо",
    loginCta: "Log in",
    waitlistCta: "Встать в очередь",
    hero: {
      badge: "Mirai Edu · AI-платформа для школ, академий и учебных центров",
      title: "Запустите школу на AI-native ERP + LMS с единым контуром управления.",
      description:
        "Mirai Edu ставит школу в очередь на подключение, открывает рабочее демо без страницы входа и помогает перевести администрацию, педагогов и семьи в единый операционный контур с AI-ассистентами и автоматизацией рутинных задач.",
      demoCta: "Открыть демо",
      learnMoreCta: "Как идет запуск",
    },
    heroPanel: {
      eyebrow: "Операционное ядро школы",
      title: "Один сценарий для очереди, запуска, ERP, LMS и AI-оркестрации.",
      description:
        "Вместо разрозненных таблиц, мессенджеров и локальных сервисов команда получает единый цифровой маршрут: очередь на запуск, рабочее демо, AI-подсказки и стабильную production-среду.",
    },
    capabilities: {
      badge: "Продуктовые направления",
      title: "Закрываем ключевые контуры работы образовательного бизнеса",
      description:
        "Mirai Edu помогает управлять филиалами, финансами, учебным процессом и сервисными задачами в одном цифровом контуре без разрозненных инструментов.",
    },
    aiSection: {
      badge: "AI-оркестрация",
      title: "AI вшит в операционные сценарии, а не добавлен как отдельный виджет",
      description:
        "Платформа помогает команде быстрее принимать решения, снижать ручную нагрузку и запускать новые процессы без потери контроля над качеством данных.",
    },
    operations: {
      badge: "Сквозные сценарии",
      title: "Не только учеба — вся операционная экосистема школы работает синхронно",
      description:
        "Коммуникации, документы, события и сервисные процессы связаны между собой, поэтому школа управляет операционными задачами без потерь контекста.",
    },
    audiences: {
      badge: "Кому подходит",
      title: "Роль-ориентированный опыт для всех участников процесса",
      description:
        "Каждая роль видит свой сценарий работы: руководство — показатели и контроль, команда — процессы и расписание, семьи — прозрачный доступ к важной информации.",
    },
    implementation: {
      badge: "Запуск и рост",
      title: "Как проходит запуск Mirai Edu",
      description:
        "Запуск строится поэтапно: сначала анализируем процессы, затем включаем базовые модули и после этого расширяем платформу под рост школы.",
    },
    implementationAside: {
      eyebrow: "Что получает школа",
      title: "Платформа даёт управляемость сегодня и запас для роста завтра.",
      description:
        "Mirai Edu помогает быстрее запускать процессы, удерживать качество сервиса и выстраивать прозрачную цифровую среду для администрации, педагогов, родителей и студентов.",
    },
    waitlist: {
      badge: "Очередь на запуск",
      title: "Встаньте в очередь на запуск школы в Mirai Edu.",
      description:
        "Оставьте школу и канал связи. Мы ставим вас в очередь на запуск, резервируем demo-сценарий и отправляем следующий шаг, чтобы быстро открыть ERP, LMS и AI-автоматизацию в одном контуре.",
      schoolLabel: "Школа",
      schoolPlaceholder: "Например, Mirai Test School",
      contactLabel: "Канал связи",
      contactPlaceholder: "Email, Telegram или телефон",
      messageLabel: "Что резервируем в очереди",
      messagePlaceholder:
        "Например: нужен запуск школы, demo-проверка и AI-контур ERP/LMS для команды.",
      validationError: "Укажите школу, канал связи и коротко опишите, что резервируем в очереди.",
      successMessage: "Школа добавлена в очередь. Мы закрепили слот и отправим следующий шаг по запуску.",
      errorFallback: "Не удалось отправить заявку. Попробуйте ещё раз.",
      submitIdle: "Встать в очередь",
      submitLoading: "Отправляем...",
    },
    unifiedExperience: {
      eyebrow: "Единый сценарий",
      title: "Визитка, demo, ERP, LMS и AI-подсказки говорят одним визуальным языком.",
      description:
        "Одинаковые токены, одна типографика, общая навигационная логика и единый бренд-контур помогают пользователю бесшовно переходить от витрины к ежедневной работе школы.",
      demoCta: "Демо",
    },
    footerDescription: "Цифровая AI-платформа для управления школой.",
    loginModal: {
      title: "Введите адрес вашего рабочего пространства",
      description:
        "Укажите свой субдомен или вставьте полный адрес школы. Мы сразу откроем страницу входа нужной организации.",
      eyebrow: "Log in",
      highlightLabel: "Workspace access",
      highlightDescription:
        "Можно ввести короткий subdomain, полный адрес школы или просто вставить ссылку из браузера.",
      addressLabel: "Адрес пространства",
      addressPlaceholder: "school или school.mirai-edu.space",
      examples: "Примеры: school, school.mirai-edu.space, https://school.mirai-edu.space",
      redirectLabel: "Переход",
      defaultTarget: "https://school.mirai-edu.space/auth/login",
      cancelCta: "Отмена",
      submitCta: "Перейти к входу",
    },
    navItems: [
      { label: "Возможности", href: "#capabilities" },
      { label: "AI", href: "#ai" },
      { label: "Кому подходит", href: "#audiences" },
      { label: "Запуск", href: "#implementation" },
      { label: "Очередь", href: "#waitlist" },
    ],
    heroHighlights: [
      {
        title: "Для руководителя",
        description: "Финансы, филиалы, KPI, загрузка команд и AI-сводки в одном окне.",
      },
      {
        title: "Для учебной части",
        description: "Расписание, журнал, LMS, уведомления и AI-помощь без ручной рутины.",
      },
      {
        title: "Для родителей и студентов",
        description: "Прозрачная коммуникация, доступ к материалам, оплатам и домашним заданиям 24/7.",
      },
    ],
    metrics: [
      {
        value: "1 платформа",
        label: "вместо набора разрозненных сервисов",
        description: "Mirai Edu объединяет операционный, академический и сервисный контуры школы.",
      },
      {
        value: "24/7",
        label: "доступ для всей экосистемы школы",
        description: "Администрация, педагоги и семьи работают в едином цифровом пространстве.",
      },
      {
        value: "SaaS",
        label: "быстрый запуск без сложной инфраструктуры",
        description: "Многотенантная архитектура позволяет масштабировать продукт по филиалам и брендам.",
      },
      {
        value: "AI-ready",
        label: "автоматизация рутинных операций",
        description: "Подсказки, аналитика и сценарии для ускорения управленческих решений.",
      },
    ],
    features: [
      {
        title: "Управление школой",
        description: "Единый слой управления для собственника, директора и операционной команды.",
        bullets: [
          "Дашборды по филиалам и направлениям",
          "Роли и права доступа для сотрудников",
          "Контроль задач, событий и дедлайнов",
        ],
      },
      {
        title: "Финансы и сервисные процессы",
        description: "Операционная дисциплина без таблиц и ручной сверки.",
        bullets: [
          "Учёт оплат, расходов и бюджетов",
          "Питание, закупки и внутренние заявки",
          "Документы, согласования и уведомления",
        ],
      },
      {
        title: "Академический контур",
        description: "Инструменты для учебной части, методистов и преподавателей.",
        bullets: [
          "Расписание и журнал посещаемости",
          "LMS, материалы и домашние задания",
          "Прозрачная коммуникация по обучению",
        ],
      },
      {
        title: "Автоматизация и аналитика",
        description: "Поддержка принятия решений и снижение нагрузки на команду.",
        bullets: [
          "AI-ассистент для администрации",
          "Сценарии напоминаний и триггерных действий",
          "Аналитические сводки по ключевым метрикам",
        ],
      },
    ],
    aiScenarios: [
      {
        title: "AI-ассистент администрации",
        description: "Собирает сигналы из ERP и LMS в понятные next steps для управляющей команды.",
        bullets: [
          "Ежедневные сводки по рискам и блокерам",
          "Подсказки по кассовым разрывам, загрузке и просадкам",
          "Приоритеты для запуска новых процессов и кампаний",
        ],
      },
      {
        title: "AI для учебной части",
        description: "Снижает нагрузку на методистов и преподавателей без потери качества обучения.",
        bullets: [
          "Черновики уведомлений и напоминаний",
          "Выявление пропусков, просадок и повторяющихся паттернов",
          "Быстрые рекомендации по расписанию и коммуникациям",
        ],
      },
      {
        title: "AI-аналитика для собственника",
        description: "Подсвечивает точки роста и отклонения раньше, чем они становятся проблемой.",
        bullets: [
          "Сводка по филиалам и направлениям",
          "План-факт по выручке, загрузке и retention",
          "Сигналы для масштабирования и оптимизации команды",
        ],
      },
    ],
    operationsList: [
      {
        title: "Единый календарь",
        description: "Расписание, события, переносы и занятость команд синхронизированы между модулями.",
        bullets: [
          "Академические и операционные события",
          "Контроль конфликтов расписания",
          "Планирование без двойного ввода",
        ],
      },
      {
        title: "Коммуникации",
        description: "Уведомления и точки контакта собираются в управляемый поток сообщений.",
        bullets: [
          "Системные оповещения и напоминания",
          "Контекстные сообщения для семей и команды",
          "Снижение потерь информации между отделами",
        ],
      },
      {
        title: "Документы и регламенты",
        description: "Шаблоны и процессы помогают команде работать по единым правилам.",
        bullets: [
          "Формы, заявки и внутренние согласования",
          "Архив важных документов и историй изменений",
          "Быстрое внедрение новых регламентов",
        ],
      },
      {
        title: "Питание и сервис",
        description: "Сервисные контуры перестают жить отдельно от учебного процесса.",
        bullets: [
          "Учёт питания и внутренних заказов",
          "Связка с оплатами и административными задачами",
          "Прозрачность для ответственных сотрудников",
        ],
      },
    ],
    audiencesList: [
      {
        title: "Собственники и управляющие",
        description: "Получают прозрачную картину бизнеса и быстрее принимают решения.",
        bullets: [
          "Единые KPI по филиалам и командам",
          "Контроль кассовых разрывов и маржинальности",
          "План-факт по ключевым операционным показателям",
        ],
      },
      {
        title: "Учебная часть и преподаватели",
        description: "Фокусируются на качестве обучения, а не на ручной координации.",
        bullets: [
          "Управление расписанием и нагрузкой",
          "Быстрый доступ к журналу, заданиям и материалам",
          "Снижение количества рутинных согласований",
        ],
      },
      {
        title: "Родители и студенты",
        description: "Видят всё важное в понятном интерфейсе и меньше обращаются в поддержку.",
        bullets: [
          "Домашние задания, посещаемость и успеваемость",
          "Напоминания об оплатах и событиях",
          "История коммуникации со школой в одном месте",
        ],
      },
    ],
    implementationSteps: [
      {
        title: "Аудит и проектирование",
        description: "Фиксируем текущие процессы школы, приоритетные сценарии и точки роста.",
        bullets: [
          "Карта ролей и бизнес-процессов",
          "Определение стартового контура запуска",
          "План по данным, доступам и структуре филиалов",
        ],
      },
      {
        title: "Запуск базовых модулей",
        description: "Разворачиваем рабочее пространство, подготавливаем команды и запускаем первый поток пользователей.",
        bullets: [
          "Настройка структуры школы и доступов",
          "Подготовка сценариев для администрации и учебной части",
          "Переход на единый операционный контур",
        ],
      },
      {
        title: "Масштабирование и автоматизация",
        description: "Подключаем дополнительные модули, автоматизации и управленческую аналитику.",
        bullets: [
          "Расширение на филиалы и новые отделы",
          "Внедрение уведомлений и AI-подсказок",
          "Регулярная оптимизация ключевых метрик",
        ],
      },
    ],
    trustSignals: [
      {
        title: "Безопасность и роли доступа",
        description: "Доступ к данным строится по ролям и уровням ответственности команды.",
      },
      {
        title: "Прозрачная коммуникация",
        description: "Критичные события не теряются: команда и семьи получают понятные уведомления.",
      },
      {
        title: "Быстрый выход в работу",
        description: "SaaS-модель ускоряет запуск и снижает стоимость сопровождения по мере роста школы.",
      },
      {
        title: "Готовность к развитию продукта",
        description: "Платформа поддерживает масштабирование, новые сценарии и продуктовые эксперименты.",
      },
    ],
  },
  en: {
    metadata: {
      title: "Mirai Edu — AI platform for school operations",
      description:
        "Mirai Edu unifies ERP, LMS, finance, communication, and AI automation in one SaaS platform for schools.",
    },
    brandTagline: "AI-first ERP and LMS for schools in one operating system",
    navigationAriaLabel: "Landing page sections",
    languageSwitcherLabel: "Language selector",
    headerDemoCta: "Demo",
    loginCta: "Log in",
    waitlistCta: "Join waitlist",
    hero: {
      badge: "Mirai Edu · AI platform for schools, academies, and learning centers",
      title: "Launch your school on an AI-native ERP + LMS with one operating system.",
      description:
        "Mirai Edu puts your school in the onboarding queue, opens a working demo without a login page, and moves administrators, teachers, and families into one production-ready operating environment with AI copilots and workflow automation.",
      demoCta: "Open demo",
      learnMoreCta: "How launch works",
    },
    heroPanel: {
      eyebrow: "School operating core",
      title: "One flow for waitlist, launch, ERP, LMS, and AI orchestration.",
      description:
        "Instead of scattered spreadsheets, chats, and disconnected tools, your team gets one digital path: waitlist, working demo, AI guidance, and a stable production environment.",
    },
    capabilities: {
      badge: "Product areas",
      title: "Cover the critical workflows of an education business",
      description:
        "Mirai Edu helps manage campuses, finance, academics, and service operations in one digital operating layer without fragmented tools.",
    },
    aiSection: {
      badge: "AI orchestration",
      title: "AI is embedded into real workflows, not bolted on as a separate widget",
      description:
        "The platform helps teams act faster, reduce manual workload, and launch new processes without losing control of data quality and accountability.",
    },
    operations: {
      badge: "Cross-functional workflows",
      title: "Beyond academics — the whole school operation stays in sync",
      description:
        "Communication, documents, events, and service workflows stay connected, so the school manages operations without losing context.",
    },
    audiences: {
      badge: "Who it is for",
      title: "Role-based experience for every stakeholder",
      description:
        "Each role gets the right workflow: leadership sees KPIs and control, teams run daily operations, and families get transparent access to what matters.",
    },
    implementation: {
      badge: "Launch and growth",
      title: "How Mirai Edu goes live",
      description:
        "Launch happens in stages: we map processes first, switch on core modules next, then expand the platform as the school grows.",
    },
    implementationAside: {
      eyebrow: "What the school gets",
      title: "Operational control today and growth capacity for tomorrow.",
      description:
        "Mirai Edu helps schools move faster, protect service quality, and build a transparent digital environment for admins, teachers, parents, and students.",
    },
    waitlist: {
      badge: "Launch waitlist",
      title: "Join the Mirai Edu school launch waitlist.",
      description:
        "Leave your school name and contact channel. We reserve your launch slot, prepare the demo scenario, and send the next step to activate ERP, LMS, and AI automation in one system.",
      schoolLabel: "School",
      schoolPlaceholder: "For example, Mirai Test School",
      contactLabel: "Contact channel",
      contactPlaceholder: "Email, Telegram, or phone",
      messageLabel: "What should we reserve in the queue",
      messagePlaceholder:
        "For example: we need a school launch, demo review, and an AI-enabled ERP/LMS environment for the team.",
      validationError: "Please enter the school, contact channel, and a short note on what we should reserve.",
      successMessage: "Your school is on the waitlist. We reserved the slot and will send the next launch step.",
      errorFallback: "We could not submit the request. Please try again.",
      submitIdle: "Join waitlist",
      submitLoading: "Sending...",
    },
    unifiedExperience: {
      eyebrow: "Unified experience",
      title: "Landing, demo, ERP, LMS, and AI guidance speak one visual language.",
      description:
        "Shared tokens, typography, navigation logic, and brand system let users move seamlessly from the landing page to daily school operations.",
      demoCta: "Demo",
    },
    footerDescription: "AI platform for modern school operations.",
    loginModal: {
      title: "Enter your workspace address",
      description:
        "Type your subdomain or paste the full school URL. We will open the login page for the right organization immediately.",
      eyebrow: "Log in",
      highlightLabel: "Workspace access",
      highlightDescription:
        "You can enter a short subdomain, the full school address, or paste the link directly from your browser.",
      addressLabel: "Workspace address",
      addressPlaceholder: "school or school.mirai-edu.space",
      examples: "Examples: school, school.mirai-edu.space, https://school.mirai-edu.space",
      redirectLabel: "Redirect",
      defaultTarget: "https://school.mirai-edu.space/auth/login",
      cancelCta: "Cancel",
      submitCta: "Go to login",
    },
    navItems: [
      { label: "Capabilities", href: "#capabilities" },
      { label: "AI", href: "#ai" },
      { label: "Audience", href: "#audiences" },
      { label: "Launch", href: "#implementation" },
      { label: "Waitlist", href: "#waitlist" },
    ],
    heroHighlights: [
      {
        title: "For leadership",
        description: "Finance, campuses, KPIs, team capacity, and AI summaries in one workspace.",
      },
      {
        title: "For academic teams",
        description: "Scheduling, gradebook, LMS, alerts, and AI support without manual overhead.",
      },
      {
        title: "For families and students",
        description: "Transparent communication and 24/7 access to materials, payments, and homework.",
      },
    ],
    metrics: [
      {
        value: "1 platform",
        label: "instead of fragmented tools",
        description: "Mirai Edu unifies school operations, academics, and service workflows.",
      },
      {
        value: "24/7",
        label: "access for the whole school ecosystem",
        description: "Admins, teachers, and families work in one digital environment.",
      },
      {
        value: "SaaS",
        label: "fast launch without heavy infrastructure",
        description: "Multi-tenant architecture scales across campuses, brands, and teams.",
      },
      {
        value: "AI-ready",
        label: "automation for repetitive work",
        description: "Insights, summaries, and triggers help teams move faster with confidence.",
      },
    ],
    features: [
      {
        title: "School management",
        description: "One control layer for owners, principals, and operating teams.",
        bullets: [
          "Dashboards across campuses and business lines",
          "Roles and permissions for every employee",
          "Tasks, events, and deadline control",
        ],
      },
      {
        title: "Finance and service operations",
        description: "Operational discipline without spreadsheets and manual reconciliation.",
        bullets: [
          "Payments, expenses, and budgets",
          "Food service, purchasing, and internal requests",
          "Documents, approvals, and notifications",
        ],
      },
      {
        title: "Academic workflow",
        description: "Tools for academic managers, methodologists, and teachers.",
        bullets: [
          "Timetable and attendance journal",
          "LMS, materials, and homework",
          "Clear communication around learning progress",
        ],
      },
      {
        title: "Automation and analytics",
        description: "Decision support that reduces operational burden on the team.",
        bullets: [
          "AI copilot for administrators",
          "Reminder flows and trigger-based actions",
          "Analytical summaries for core metrics",
        ],
      },
    ],
    aiScenarios: [
      {
        title: "AI copilot for operations",
        description: "Turns ERP and LMS signals into clear next steps for the leadership team.",
        bullets: [
          "Daily summaries for risks and blockers",
          "Prompts around cash gaps, occupancy, and performance drops",
          "Prioritized next moves for launches and campaigns",
        ],
      },
      {
        title: "AI support for academics",
        description: "Reduces manual coordination for academic teams without lowering quality.",
        bullets: [
          "Draft reminders and parent updates",
          "Detection of absences, drop-offs, and recurring issues",
          "Quick recommendations for schedule and communication actions",
        ],
      },
      {
        title: "AI analytics for owners",
        description: "Highlights growth points and deviations before they turn into problems.",
        bullets: [
          "Campus-by-campus performance overview",
          "Plan-vs-actual on revenue, occupancy, and retention",
          "Signals for scaling and team optimization",
        ],
      },
    ],
    operationsList: [
      {
        title: "Unified calendar",
        description: "Schedules, events, changes, and team capacity stay synchronized across modules.",
        bullets: [
          "Academic and operational events",
          "Conflict detection for schedules",
          "Planning without double entry",
        ],
      },
      {
        title: "Communication",
        description: "Notifications and touchpoints become a controlled message flow.",
        bullets: [
          "System alerts and reminders",
          "Context-aware messages for teams and families",
          "Less information loss between departments",
        ],
      },
      {
        title: "Documents and policies",
        description: "Templates and workflows help teams operate with shared rules.",
        bullets: [
          "Forms, requests, and internal approvals",
          "Archive of critical documents and change history",
          "Fast rollout of new operating policies",
        ],
      },
      {
        title: "Food service and support",
        description: "Service workflows stop living separately from academics.",
        bullets: [
          "Meal tracking and internal orders",
          "Connected to payments and admin workflows",
          "Transparency for responsible staff",
        ],
      },
    ],
    audiencesList: [
      {
        title: "Owners and operators",
        description: "Get a clear business view and make decisions faster.",
        bullets: [
          "Unified KPIs across campuses and teams",
          "Visibility into cash gaps and margins",
          "Plan-vs-actual for core operating metrics",
        ],
      },
      {
        title: "Academic teams and teachers",
        description: "Focus on learning quality instead of manual coordination.",
        bullets: [
          "Schedule and workload management",
          "Fast access to journals, assignments, and materials",
          "Fewer routine approvals and follow-ups",
        ],
      },
      {
        title: "Families and students",
        description: "See what matters in a clear interface and contact support less often.",
        bullets: [
          "Homework, attendance, and progress",
          "Payment and event reminders",
          "One place for the history of school communication",
        ],
      },
    ],
    implementationSteps: [
      {
        title: "Audit and design",
        description: "We map current school workflows, top priorities, and growth constraints.",
        bullets: [
          "Role and process map",
          "Definition of the launch scope",
          "Plan for data, access, and campus structure",
        ],
      },
      {
        title: "Core modules go live",
        description: "We launch the workspace, prepare the teams, and switch on the first user flow.",
        bullets: [
          "School structure and access setup",
          "Operational and academic workflow preparation",
          "Transition to one operating environment",
        ],
      },
      {
        title: "Scale and automate",
        description: "We expand into more modules, more campuses, and stronger analytics.",
        bullets: [
          "Rollout to new campuses and departments",
          "Notifications and AI guidance activation",
          "Continuous optimization of core metrics",
        ],
      },
    ],
    trustSignals: [
      {
        title: "Security and access roles",
        description: "Data access is structured by team responsibility and role boundaries.",
      },
      {
        title: "Transparent communication",
        description: "Critical events are visible: teams and families receive clear notifications.",
      },
      {
        title: "Fast time to value",
        description: "The SaaS model speeds up launch and lowers support cost as the school grows.",
      },
      {
        title: "Built for product evolution",
        description: "The platform supports new workflows, experiments, and scaling paths.",
      },
    ],
  },
  ja: {
    metadata: {
      title: "Mirai Edu — 学校運営のためのAIプラットフォーム",
      description:
        "Mirai Edu は ERP、LMS、財務、コミュニケーション、AI 自動化をひとつの SaaS プラットフォームに統合します。",
    },
    brandTagline: "学校向けの AI-first ERP と LMS をひとつの運営基盤に",
    navigationAriaLabel: "ランディングページのセクション",
    languageSwitcherLabel: "言語切替",
    headerDemoCta: "デモ",
    loginCta: "Log in",
    waitlistCta: "順番待ちに登録",
    hero: {
      badge: "Mirai Edu · 学校・アカデミー・学習センター向け AI プラットフォーム",
      title: "AI-native ERP + LMS で、学校運営をひとつの基盤にまとめます。",
      description:
        "Mirai Edu は学校を導入キューに登録し、ログイン不要の実働デモを提供し、その後は管理者・講師・保護者を AI アシスタントと自動化を備えたひとつの運営環境へ移行します。",
      demoCta: "デモを開く",
      learnMoreCta: "導入の流れ",
    },
    heroPanel: {
      eyebrow: "学校運営のコア",
      title: "順番待ち、導入、ERP、LMS、AI オーケストレーションをひとつの流れで。",
      description:
        "分散した表計算、チャット、個別ツールの代わりに、導入キュー、実働デモ、AI ガイダンス、本番環境までを一貫したデジタルフローで提供します。",
    },
    capabilities: {
      badge: "プロダクト領域",
      title: "教育ビジネスの重要な業務をひとつの基盤でカバー",
      description:
        "Mirai Edu は、校舎運営、財務、学務、サービス業務を、分断されたツールなしでひとつの運営レイヤーにまとめます。",
    },
    aiSection: {
      badge: "AI オーケストレーション",
      title: "AI は別ウィジェットではなく、実際の業務フローに組み込まれています",
      description:
        "チームの判断を速め、手作業を減らし、データ品質と責任範囲を保ったまま新しい業務を立ち上げられます。",
    },
    operations: {
      badge: "横断ワークフロー",
      title: "授業だけではなく、学校全体の運営が同期します",
      description:
        "コミュニケーション、文書、イベント、サービス業務がつながることで、文脈を失わずに運営できます。",
    },
    audiences: {
      badge: "対象ユーザー",
      title: "すべての関係者に合わせたロールベース体験",
      description:
        "経営層には KPI と統制、現場チームには日々の運営、保護者には必要情報への透明なアクセスを提供します。",
    },
    implementation: {
      badge: "導入と拡張",
      title: "Mirai Edu 導入の流れ",
      description:
        "まず業務を可視化し、次にコア機能を有効化し、その後に学校の成長に合わせて拡張します。",
    },
    implementationAside: {
      eyebrow: "学校が得るもの",
      title: "今日の運営統制と、明日の成長余地を同時に確保。",
      description:
        "Mirai Edu は、学校がより早く動き、サービス品質を守り、管理者・講師・保護者・生徒のための透明なデジタル環境を作るのを支援します。",
    },
    waitlist: {
      badge: "導入順番待ち",
      title: "Mirai Edu 導入の順番待ちに登録してください。",
      description:
        "学校名と連絡先を残してください。導入枠を確保し、デモシナリオを予約し、ERP・LMS・AI 自動化を有効化する次のステップをご案内します。",
      schoolLabel: "学校名",
      schoolPlaceholder: "例: Mirai Test School",
      contactLabel: "連絡先",
      contactPlaceholder: "Email、Telegram、または電話番号",
      messageLabel: "順番待ちで確保したい内容",
      messagePlaceholder:
        "例: 学校の立ち上げ、デモ確認、チーム向けの AI 対応 ERP/LMS 環境が必要です。",
      validationError: "学校名、連絡先、確保したい内容を短く入力してください。",
      successMessage: "順番待ちに登録されました。枠を確保し、次の導入ステップをお送りします。",
      errorFallback: "送信できませんでした。もう一度お試しください。",
      submitIdle: "順番待ちに登録",
      submitLoading: "送信中...",
    },
    unifiedExperience: {
      eyebrow: "統一された体験",
      title: "ランディング、デモ、ERP、LMS、AI ガイダンスがひとつの視覚言語でつながります。",
      description:
        "共通のトークン、タイポグラフィ、ナビゲーション、ブランド設計により、ランディングから日常業務までシームレスに移動できます。",
      demoCta: "デモ",
    },
    footerDescription: "学校運営のための AI プラットフォーム。",
    loginModal: {
      title: "ワークスペースのアドレスを入力してください",
      description:
        "サブドメインを入力するか、学校の完全な URL を貼り付けてください。該当する組織のログインページをすぐに開きます。",
      eyebrow: "Log in",
      highlightLabel: "Workspace access",
      highlightDescription:
        "短いサブドメイン、完全な学校アドレス、またはブラウザのリンクをそのまま入力できます。",
      addressLabel: "ワークスペースのアドレス",
      addressPlaceholder: "school または school.mirai-edu.space",
      examples: "例: school, school.mirai-edu.space, https://school.mirai-edu.space",
      redirectLabel: "遷移先",
      defaultTarget: "https://school.mirai-edu.space/auth/login",
      cancelCta: "キャンセル",
      submitCta: "ログインへ進む",
    },
    navItems: [
      { label: "機能", href: "#capabilities" },
      { label: "AI", href: "#ai" },
      { label: "対象", href: "#audiences" },
      { label: "導入", href: "#implementation" },
      { label: "順番待ち", href: "#waitlist" },
    ],
    heroHighlights: [
      {
        title: "経営層向け",
        description: "財務、校舎、KPI、チーム稼働率、AI サマリーをひとつの画面で把握。",
      },
      {
        title: "学務チーム向け",
        description: "時間割、出席、LMS、通知、AI 支援で手作業の負担を削減。",
      },
      {
        title: "保護者・生徒向け",
        description: "教材、支払い、宿題、重要な連絡に 24/7 でアクセスできます。",
      },
    ],
    metrics: [
      {
        value: "1 platform",
        label: "分断された複数ツールの代わりに",
        description: "Mirai Edu は学校運営、学務、サービス業務をひとつに統合します。",
      },
      {
        value: "24/7",
        label: "学校全体のエコシステムが常時アクセス可能",
        description: "管理者、講師、保護者が同じデジタル環境で動けます。",
      },
      {
        value: "SaaS",
        label: "重いインフラなしで素早く導入",
        description: "マルチテナント構成により、校舎やブランド単位で拡張できます。",
      },
      {
        value: "AI-ready",
        label: "繰り返し業務を自動化",
        description: "インサイト、要約、トリガーにより、判断と実行を速めます。",
      },
    ],
    features: [
      {
        title: "学校マネジメント",
        description: "オーナー、校長、運営チームのための統合管理レイヤー。",
        bullets: [
          "校舎・事業別ダッシュボード",
          "役割と権限の管理",
          "タスク、イベント、期限のコントロール",
        ],
      },
      {
        title: "財務とサービス運営",
        description: "表計算や手作業の照合に頼らない運営管理。",
        bullets: [
          "入金、支出、予算の管理",
          "給食、購買、内部申請",
          "文書、承認、通知",
        ],
      },
      {
        title: "学務ワークフロー",
        description: "学務責任者、教務担当、講師のための機能。",
        bullets: [
          "時間割と出席管理",
          "LMS、教材、宿題",
          "学習進捗に関する明確なコミュニケーション",
        ],
      },
      {
        title: "自動化と分析",
        description: "意思決定を支援し、チームの運営負荷を減らします。",
        bullets: [
          "管理者向け AI コパイロット",
          "リマインドとトリガー型アクション",
          "主要指標の分析サマリー",
        ],
      },
    ],
    aiScenarios: [
      {
        title: "運営向け AI コパイロット",
        description: "ERP と LMS のシグナルを、経営チーム向けの明確な次アクションに変換します。",
        bullets: [
          "リスクとボトルネックの日次サマリー",
          "資金ギャップ、稼働率、成果低下の示唆",
          "新規導入や施策の優先順位づけ",
        ],
      },
      {
        title: "学務向け AI 支援",
        description: "教育品質を落とさずに、学務チームの手作業を減らします。",
        bullets: [
          "リマインドや保護者連絡の下書き",
          "欠席、離脱兆候、繰り返し課題の検知",
          "時間割や連絡対応の提案",
        ],
      },
      {
        title: "オーナー向け AI 分析",
        description: "問題になる前に成長機会と逸脱を可視化します。",
        bullets: [
          "校舎ごとのパフォーマンス一覧",
          "売上、稼働率、継続率の計画対実績",
          "拡張とチーム最適化のシグナル",
        ],
      },
    ],
    operationsList: [
      {
        title: "統合カレンダー",
        description: "時間割、イベント、変更、チーム稼働が各モジュールで同期されます。",
        bullets: [
          "学務・運営イベントの一元管理",
          "時間割の競合検知",
          "二重入力なしの計画",
        ],
      },
      {
        title: "コミュニケーション",
        description: "通知と接点を、管理可能なメッセージフローにまとめます。",
        bullets: [
          "システム通知とリマインド",
          "チームと保護者向けの文脈付きメッセージ",
          "部門間の情報ロスを削減",
        ],
      },
      {
        title: "文書とルール",
        description: "テンプレートとワークフローで、共通ルールに沿った運営を支援します。",
        bullets: [
          "フォーム、申請、内部承認",
          "重要文書と変更履歴の保管",
          "新ルールの迅速な展開",
        ],
      },
      {
        title: "給食とサポート業務",
        description: "サービス業務を学務から切り離さずに運用できます。",
        bullets: [
          "給食管理と内部注文",
          "支払い・管理業務との連携",
          "担当者向けの可視性向上",
        ],
      },
    ],
    audiencesList: [
      {
        title: "オーナーと運営責任者",
        description: "事業の全体像を把握し、より速く意思決定できます。",
        bullets: [
          "校舎・チーム横断の KPI",
          "資金ギャップと利益率の可視化",
          "主要運営指標の計画対実績",
        ],
      },
      {
        title: "学務チームと講師",
        description: "手作業の調整ではなく、教育品質に集中できます。",
        bullets: [
          "時間割と負荷の管理",
          "成績、課題、教材への高速アクセス",
          "日常的な承認・確認作業の削減",
        ],
      },
      {
        title: "保護者と生徒",
        description: "必要な情報をわかりやすく見られ、問い合わせも減ります。",
        bullets: [
          "宿題、出席、学習進捗",
          "支払いとイベントの通知",
          "学校とのやり取り履歴を一箇所で確認",
        ],
      },
    ],
    implementationSteps: [
      {
        title: "監査と設計",
        description: "現在の業務、優先事項、成長制約を可視化します。",
        bullets: [
          "役割と業務フローの整理",
          "導入スコープの定義",
          "データ、権限、校舎構成の計画",
        ],
      },
      {
        title: "コアモジュール導入",
        description: "ワークスペースを立ち上げ、チームを準備し、最初の利用フローを有効化します。",
        bullets: [
          "学校構成とアクセス設定",
          "運営・学務フローの準備",
          "単一運営環境への移行",
        ],
      },
      {
        title: "拡張と自動化",
        description: "追加モジュール、校舎展開、分析強化を進めます。",
        bullets: [
          "新しい校舎・部門への展開",
          "通知と AI ガイダンスの有効化",
          "主要指標の継続的な最適化",
        ],
      },
    ],
    trustSignals: [
      {
        title: "セキュリティと権限制御",
        description: "データアクセスは役割と責任範囲に基づいて設計されます。",
      },
      {
        title: "透明なコミュニケーション",
        description: "重要な出来事を見逃さず、チームと保護者に明確な通知を届けます。",
      },
      {
        title: "迅速な立ち上がり",
        description: "SaaS モデルにより導入を速め、成長に応じた運用コストを抑えます。",
      },
      {
        title: "進化し続ける基盤",
        description: "新しい業務、実験、スケール戦略に対応できる設計です。",
      },
    ],
  },
};

const FEATURE_ICONS = [Building2, Wallet, BookOpen, Bot] as const;
const AI_SCENARIO_ICONS = [Bot, Sparkles, BarChart3] as const;
const OPERATION_ICONS = [CalendarDays, MessageSquare, FileText, UtensilsCrossed] as const;
const AUDIENCE_ICONS = [BarChart3, GraduationCap, Users] as const;
const TRUST_SIGNAL_ICONS = [ShieldCheck, BellRing, Clock3, Sparkles] as const;

function withIcons<T extends { title: string; description: string; bullets?: string[] }>(
  items: T[],
  icons: readonly LucideIcon[]
) {
  if (items.length > icons.length) {
    throw new Error("Not enough icons configured for marketing content.");
  }

  return items.map((item, index) => ({
    ...item,
    icon: icons[index],
  }));
}

export function getMarketingContent(language: MarketingLanguage): MarketingContent {
  const copy = MARKETING_COPY[language];

  return {
    copy,
    navItems: copy.navItems,
    heroHighlights: copy.heroHighlights,
    metrics: copy.metrics,
    features: withIcons(copy.features, FEATURE_ICONS),
    aiScenarios: withIcons(copy.aiScenarios, AI_SCENARIO_ICONS),
    operations: withIcons(copy.operationsList, OPERATION_ICONS),
    audiences: withIcons(copy.audiencesList, AUDIENCE_ICONS),
    implementationSteps: copy.implementationSteps,
    trustSignals: withIcons(copy.trustSignals, TRUST_SIGNAL_ICONS),
  };
}
