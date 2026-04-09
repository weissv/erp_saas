// backend/prisma/seed_school.ts
// Seed для текущей структуры БД
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Список учителей
const teachersData = [
  { name: "Abbasova Gulchexra Kasimovna", role: "TEACHER" },
  { name: "Grekova Natal'ya Vladimirovna", role: "TEACHER" },
  { name: "PАК YELENA VLADIMIROVNA", role: "DEPUTY" },
  { name: "Safarova Nigina Alisherovna", role: "TEACHER" },
  { name: "Yo`ldosheva Aziza Odilovna", role: "TEACHER" },
  { name: "Yusupova Yekaterina Konstantinovna", role: "TEACHER" },
  { name: "Африна Валентина Михайловна", role: "TEACHER" },
  { name: "Ахпержаньянц Арфеня Давидовна", role: "TEACHER" },
  { name: "Бакаушина Марина Фёдоровна", role: "TEACHER" },
  { name: "Батыкова Надежда Викторовна", role: "TEACHER" },
  { name: "Бекирова Линара Искендеровна", role: "TEACHER" },
  { name: "Бурова Елена Петровна", role: "TEACHER" },
  { name: "Дадаева Манзура Шухратовна", role: "TEACHER" },
  { name: "Зуфарова Гулчехра Баходировна", role: "TEACHER" },
  { name: "Зябликова Анна Геннадьевна", role: "TEACHER" },
  { name: "Искандаров Сирожиддин Шарофаддин угли", role: "TEACHER" },
  { name: "Кабаев Ислом Гайратович", role: "TEACHER" },
  { name: "Казанцева Наталья Витальевна", role: "TEACHER" },
  { name: "Косимов Зафар Мирзохидович", role: "TEACHER" },
  { name: "Круглова Марина Юрьевна", role: "TEACHER" },
  { name: "Мурудова Анастасия Васильевна", role: "TEACHER" },
  { name: "Отрезова Эльмира Нуралиевна", role: "TEACHER" },
  { name: "Сергеева Наталья Владимировна", role: "TEACHER" },
  { name: "Синельникова Светлана Владимировна", role: "TEACHER" },
  { name: "Сулейманова Сабина Гайратовна", role: "TEACHER" },
  { name: "Тен Лариса Владимировна", role: "TEACHER" },
  { name: "Турчаев Артур Рушанович", role: "TEACHER" },
  { name: "Усмонов Жахонгир Тохир угли", role: "TEACHER" },
  { name: "Фёдорова Ирина Васильевна", role: "TEACHER" },
  { name: "Худоян Лейла Броевна", role: "TEACHER" },
  { name: "Юлдашева Зульфия Иноятуллаевна", role: "TEACHER" },
  { name: "Юнусова Тамила Фаритовна", role: "TEACHER" },
];

// Список учеников 4-Б
const studentsData = [
  { name: "Гурджиев Артур Александрович", age: 10 },
  { name: "Ким Леонид Вадимович", age: 10 },
  { name: "Мустапаева Жасмин Ерназаровна", age: 11 },
  { name: "Мухамедиева Василиса Дмитриевна", age: 10 },
  { name: "Розанова Ясина Голибжон Кизи", age: 10 },
  { name: "Сайдикаримов Абусаид Кахрамон Угли", age: 10 },
  { name: "Тимурова Амелия Тимуровна", age: 10 },
  { name: "Хакимжанов Абу Бакир Нодиржон Угли", age: 10 },
  { name: "Хасанова Сафия Исломжоновна", age: 10 },
];

async function main() {
  console.log("🚀 Start seeding Mezon School data...");

  // 1. Создаем Админа (Izumi)
  const adminPassword = await bcrypt.hash("8p09VhXW", 10);
  
  let adminEmployee = await prisma.employee.findFirst({ where: { id: 999 } });
  if (!adminEmployee) {
    adminEmployee = await prisma.employee.create({
      data: {
        id: 999,
        firstName: "Izumi",
        lastName: "Amano",
        position: "Директор",
        rate: 1.0,
        hireDate: new Date(),
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "izumi" },
    update: { passwordHash: adminPassword, role: "DIRECTOR" },
    create: {
      email: "izumi",
      passwordHash: adminPassword,
      role: "DIRECTOR",
      employeeId: adminEmployee.id,
    },
  });
  console.log("✅ Admin 'izumi' created.");

  // 2. Создаем Учителей
  const teacherMap = new Map<string, number>();

  for (const t of teachersData) {
    const parts = t.name.trim().split(/\s+/);
    const lastName = parts[0];
    const firstName = parts[1] || "";
    const middleName = parts.slice(2).join(" ");

    const email = `${lastName.toLowerCase()}.${firstName.toLowerCase()}@mezon.school`.replace(/['`]/g, "");
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.employeeId) {
        teacherMap.set(lastName.toLowerCase(), existingUser.employeeId);
      }
      continue;
    }

    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        middleName: middleName || undefined,
        position: t.role === "DEPUTY" ? "Завуч" : "Учитель",
        rate: 1.0,
        hireDate: new Date(),
        user: {
          create: {
            email,
            passwordHash: await bcrypt.hash("123456", 10),
            role: t.role as any,
          },
        },
      },
    });

    teacherMap.set(lastName.toLowerCase(), employee.id);
  }
  console.log(`✅ Created/updated ${teachersData.length} teachers.`);

  // 3. Создаем Класс 4-Б
  const group4B = await prisma.group.upsert({
    where: { name: "4-Б" },
    update: {},
    create: {
      name: "4-Б",
      grade: 4,
      academicYear: "2025-2026",
      capacity: 30,
    },
  });
  console.log("✅ Group '4-Б' created.");

  // 4. Зачисляем учеников напрямую в LmsSchoolStudent (без Child)
  for (const s of studentsData) {
    const parts = s.name.split(" ");
    const lastName = parts[0];
    const firstName = parts[1] || "";
    const middleName = parts.slice(2).join(" ");
    const birthYear = new Date().getFullYear() - s.age;
    
    // Проверяем существует ли уже ученик
    const existingStudent = await prisma.lmsSchoolStudent.findFirst({
      where: { firstName, lastName, classId: group4B.id }
    });
    
    if (existingStudent) {
      continue;
    }

    await prisma.lmsSchoolStudent.create({
      data: {
        firstName,
        lastName,
        middleName: middleName || undefined,
        birthDate: new Date(`${birthYear}-01-01`),
        classId: group4B.id,
        isActive: true,
      }
    });
  }
  console.log(`✅ Enrolled ${studentsData.length} students to 4-Б.`);

  // 5. Создаем предметы (LMS Subjects)
  async function getOrCreateSubject(name: string) {
    const existing = await prisma.lmsSubject.findFirst({ where: { name } });
    if (existing) return existing;
    return await prisma.lmsSubject.create({ data: { name } });
  }

  // 6. Генерируем Расписание
  const scheduleItems = [
    // --- ПОНЕДЕЛЬНИК ---
    { day: 1, time: "08:30", subject: "Келажак соати", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 1, time: "09:20", subject: "Родной язык", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 1, time: "10:10", subject: "Родной язык", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 1, time: "11:00", subject: "Родной язык", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 1, time: "12:00", subject: "Чит.грам.", teacher: "Мурудова", room: "6, 2 корпус" },
    
    // --- ВТОРНИК ---
    { day: 2, time: "08:30", subject: "Математика", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 2, time: "09:20", subject: "Математика", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 2, time: "10:10", subject: "Родной язык", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 2, time: "11:00", subject: "Родной язык", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 2, time: "12:00", subject: "Англ. язык", teacher: "Худоян", room: "7, 2 корпус" },
    { day: 2, time: "13:50", subject: "Музыкальное искусство", teacher: "Мурудова", room: "Мини зал" },
    
    // --- СРЕДА ---
    { day: 3, time: "08:30", subject: "Математика", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 3, time: "09:20", subject: "Родной язык", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 3, time: "10:10", subject: "Естествознание", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 3, time: "11:00", subject: "Англ. язык", teacher: "Худоян", room: "7, 2 корпус" },
    { day: 3, time: "12:00", subject: "Узбекский язык", teacher: "Юлдашева", room: "6, 2 корпус" },
    { day: 3, time: "13:50", subject: "Плавание", teacher: "Казанцева", room: "Бассейн" },

    // --- ЧЕТВЕРГ ---
    { day: 4, time: "08:30", subject: "Математика", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 4, time: "09:20", subject: "Родной язык", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 4, time: "10:10", subject: "Чит.грам.", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 4, time: "11:00", subject: "Англ. язык", teacher: "Худоян", room: "7, 2 корпус" },
    { day: 4, time: "12:00", subject: "Воспитание", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 4, time: "13:50", subject: "Естествознание", teacher: "Мурудова", room: "6, 2 корпус" },
    
    // --- ПЯТНИЦА ---
    { day: 5, time: "08:30", subject: "Математика", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 5, time: "09:20", subject: "Родной язык", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 5, time: "10:10", subject: "Узбекский язык", teacher: "Юлдашева", room: "6, 2 корпус" },
    { day: 5, time: "11:00", subject: "Англ. язык", teacher: "Худоян", room: "7, 2 корпус" },
    { day: 5, time: "12:00", subject: "IT", teacher: "Искандаров", room: "7, Asosiy bino" },
    { day: 5, time: "13:50", subject: "Шахматы", teacher: "Косимов", room: "2 корпус" },
    
    // --- СУББОТА ---
    { day: 6, time: "08:30", subject: "Логика", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 6, time: "09:20", subject: "Чит.грам.", teacher: "Мурудова", room: "6, 2 корпус" },
    { day: 6, time: "10:10", subject: "Естествознание", teacher: "Мурудова", room: "6, 2 корпус" },
  ];

  // Очищаем старое расписание для 4-Б
  await prisma.lmsScheduleItem.deleteMany({ where: { classId: group4B.id } });

  for (const item of scheduleItems) {
    const subject = await getOrCreateSubject(item.subject);
    
    // Ищем ID учителя по фамилии
    let teacherId: number | null = null;
    for (const [lname, id] of teacherMap.entries()) {
      if (lname.includes(item.teacher.toLowerCase()) || item.teacher.toLowerCase().includes(lname)) {
        teacherId = id;
        break;
      }
    }
    
    // Вычисляем время конца урока (+45 мин)
    const [h, m] = item.time.split(":").map(Number);
    const endH = m + 45 >= 60 ? h + 1 : h;
    const endM = (m + 45) % 60;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    
    await prisma.lmsScheduleItem.create({
      data: {
        classId: group4B.id,
        subjectId: subject.id,
        teacherId: teacherId,
        dayOfWeek: item.day,
        startTime: item.time,
        endTime: endTime,
        room: item.room,
      }
    });
  }
  console.log("✅ Schedule for 4-Б generated.");

  console.log("🎉 Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
