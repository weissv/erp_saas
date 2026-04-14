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
