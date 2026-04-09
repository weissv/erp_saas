// Calendar/Event types
export interface Event {
  id: number;
  title: string;      // Тема/название
  date: string;       // Дата
  groupId: number | null;  // ID класса
  group?: { id: number; name: string } | null;  // Класс (связь)
  organizer: string;  // Организатор
  performers: string[]; // Исполнители
  createdAt: string;
}
