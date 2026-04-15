export function getErpSectionLabel(pathname: string): string {
  return [
    ["/children", "Контингент и семьи"],
    ["/employees", "Команда и роли"],
    ["/finance", "Финансы и отчетность"],
    ["/schedule", "Академический контур"],
    ["/documents", "Документы и согласования"],
    ["/dashboard", "Операционный центр"],
  ].find(([path]) => pathname.startsWith(path))?.[1] ?? "Единое рабочее пространство";
}

export function getLmsSectionLabel(pathname: string): string {
  return [
    ["/lms/school/classes", "Классы и потоки"],
    ["/lms/school/gradebook", "Журнал и оценки"],
    ["/lms/school/schedule", "Расписание занятий"],
    ["/lms/school/homework", "Домашние задания"],
    ["/lms/school/attendance", "Посещаемость"],
    ["/lms/diary", "Дневник ученика"],
    ["/lms/school", "Школьная аналитика"],
  ].find(([path]) => pathname.startsWith(path))?.[1] ?? "Школьная LMS";
}

export const ERP_WORKSPACE_COPY = {
  eyebrow: "ERP · рабочее пространство",
  description:
    "Интерфейс ERP теперь следует визуальному языку лендинга: мягкие стеклянные поверхности, акцентные метки и единый сценарий для команды",
  operatorTitle: "Текущий оператор",
  supportTitle: "Поддержка",
  supportFallback: "Контакты поддержки доступны в профиле тенанта.",
  continuityTitle: "Навигация без разрыва",
  continuityDescription:
    "Один визуальный язык для модулей ERP, чтобы переход между разделами ощущался как единый маршрут.",
};

export const LMS_WORKSPACE_COPY = {
  eyebrow: "LMS · учебный контур",
  description:
    "Школьная LMS получила тот же визуальный язык, что и лендинг: светлые стеклянные панели, акцентные CTA и спокойную иерархию для ежедневной работы преподавателей, учеников и администрации.",
  participantTitle: "Текущий участник",
  supportTitle: "Коммуникация и поддержка",
  supportFallback: "Контакты поддержки доступны внутри тенанта.",
  continuityTitle: "Сквозной сценарий",
  continuityDescription:
    "От расписания до дневника — учебный контур визуально синхронизирован с ERP и лендингом.",
};
