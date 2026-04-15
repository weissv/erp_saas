// backend/prisma/seed.ts
// Realistic demo data for the ERP SaaS platform (private school context).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(10, 0, 0, 0);
  return d;
}
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Staff fixtures
// ---------------------------------------------------------------------------
const staffData = [
  { firstName: "Александр", lastName: "Смирнов",  middleName: "Петрович",  position: "Director",        role: "DIRECTOR",    rate: 1.0 },
  { firstName: "Ольга",     lastName: "Петрова",   middleName: "Ивановна",  position: "Deputy Director", role: "DEPUTY",      rate: 1.0 },
  { firstName: "Наталья",   lastName: "Иванова",   middleName: "Сергеевна", position: "Teacher",         role: "TEACHER",     rate: 1.0 },
  { firstName: "Дмитрий",   lastName: "Козлов",    middleName: "Андреевич", position: "Teacher",         role: "TEACHER",     rate: 1.0 },
  { firstName: "Елена",     lastName: "Новикова",  middleName: "Юрьевна",   position: "Teacher",         role: "TEACHER",     rate: 1.0 },
  { firstName: "Михаил",    lastName: "Морозов",   middleName: "Олегович",  position: "Teacher",         role: "TEACHER",     rate: 1.0 },
  { firstName: "Светлана",  lastName: "Волкова",   middleName: "Павловна",  position: "Teacher",         role: "TEACHER",     rate: 1.0 },
  { firstName: "Андрей",    lastName: "Соколов",   middleName: "Николаевич",position: "Teacher",         role: "TEACHER",     rate: 1.0 },
  { firstName: "Татьяна",   lastName: "Лебедева",  middleName: "Викторовна",position: "Teacher",         role: "TEACHER",     rate: 1.0 },
  { firstName: "Игорь",     lastName: "Попов",     middleName: "Александрович", position: "Teacher",    role: "TEACHER",     rate: 1.0 },
  { firstName: "Ирина",     lastName: "Зайцева",   middleName: "Михайловна",position: "Accountant",      role: "ACCOUNTANT",  rate: 1.0 },
  { firstName: "Василий",   lastName: "Крылов",    middleName: "Семёнович", position: "Facilities Manager", role: "ZAVHOZ",  rate: 1.0 },
];

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------
const classesData = [
  { name: "1-А", grade: 1 },
  { name: "2-А", grade: 2 },
  { name: "3-А", grade: 3 },
  { name: "4-А", grade: 4 },
  { name: "5-А", grade: 5 },
  { name: "6-А", grade: 6 },
  { name: "7-А", grade: 7 },
  { name: "8-А", grade: 8 },
  { name: "9-А", grade: 9 },
  { name: "10-А", grade: 10 },
  { name: "11-А", grade: 11 },
];

// ---------------------------------------------------------------------------
// Students per class (name pool — cyrillic)
// ---------------------------------------------------------------------------
const firstNamesMale   = ["Артём","Иван","Максим","Дмитрий","Александр","Никита","Егор","Андрей","Кирилл","Роман"];
const firstNamesFemale = ["Анна","Мария","София","Виктория","Полина","Екатерина","Дарья","Алина","Ксения","Юлия"];
const lastNames        = ["Иванов","Петров","Сидоров","Козлов","Новиков","Морозов","Волков","Соколов","Лебедев","Попов",
                          "Алексеев","Фёдоров","Захаров","Семёнов","Егоров","Давыдов","Никитин","Орлов","Степанов","Белов"];

// ---------------------------------------------------------------------------
// Schedule template (subjects × teachers)
// ---------------------------------------------------------------------------
const scheduleTemplate = [
  { day: 1, time: "08:30", subject: "Математика",       teacherIdx: 2, room: "101" },
  { day: 1, time: "09:20", subject: "Русский язык",      teacherIdx: 2, room: "101" },
  { day: 1, time: "10:10", subject: "Чтение",            teacherIdx: 2, room: "101" },
  { day: 1, time: "11:00", subject: "Окружающий мир",    teacherIdx: 4, room: "102" },
  { day: 1, time: "12:00", subject: "ИЗО",               teacherIdx: 6, room: "201" },
  { day: 2, time: "08:30", subject: "Математика",        teacherIdx: 2, room: "101" },
  { day: 2, time: "09:20", subject: "Русский язык",      teacherIdx: 2, room: "101" },
  { day: 2, time: "10:10", subject: "Английский язык",   teacherIdx: 3, room: "103" },
  { day: 2, time: "11:00", subject: "Физкультура",       teacherIdx: 7, room: "Спортзал" },
  { day: 2, time: "12:00", subject: "Музыка",            teacherIdx: 8, room: "201" },
  { day: 3, time: "08:30", subject: "Математика",        teacherIdx: 2, room: "101" },
  { day: 3, time: "09:20", subject: "Окружающий мир",    teacherIdx: 4, room: "102" },
  { day: 3, time: "10:10", subject: "Русский язык",      teacherIdx: 2, room: "101" },
  { day: 3, time: "11:00", subject: "Английский язык",   teacherIdx: 3, room: "103" },
  { day: 3, time: "12:00", subject: "Информатика",       teacherIdx: 5, room: "Компьютерный класс" },
  { day: 4, time: "08:30", subject: "Математика",        teacherIdx: 2, room: "101" },
  { day: 4, time: "09:20", subject: "Русский язык",      teacherIdx: 2, room: "101" },
  { day: 4, time: "10:10", subject: "Чтение",            teacherIdx: 2, room: "101" },
  { day: 4, time: "11:00", subject: "Английский язык",   teacherIdx: 3, room: "103" },
  { day: 4, time: "12:00", subject: "Окружающий мир",    teacherIdx: 4, room: "102" },
  { day: 5, time: "08:30", subject: "Математика",        teacherIdx: 2, room: "101" },
  { day: 5, time: "09:20", subject: "Русский язык",      teacherIdx: 2, room: "101" },
  { day: 5, time: "10:10", subject: "Английский язык",   teacherIdx: 3, room: "103" },
  { day: 5, time: "11:00", subject: "Информатика",       teacherIdx: 5, room: "Компьютерный класс" },
  { day: 5, time: "12:00", subject: "Физкультура",       teacherIdx: 7, room: "Спортзал" },
];

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🚀 Seeding realistic demo data …");

  // =========================================================================
  // 1. STAFF
  // =========================================================================
  const adminPassword = await bcrypt.hash("MiraiTest_2026!", 10);
  const teacherPassword = await bcrypt.hash("Teacher_2026!", 10);

  const employeeIds: number[] = [];

  for (let i = 0; i < staffData.length; i++) {
    const s = staffData[i];
    const email =
      i === 0
        ? "admin@test.local"
        : `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@school.demo`
            .replace(/ё/g, "e")
            .replace(/[а-яА-ЯёЁ]/g, (c) => translitChar(c));

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.employeeId) {
      employeeIds.push(existingUser.employeeId);
      continue;
    }

    const emp = await prisma.employee.create({
      data: {
        firstName:  s.firstName,
        lastName:   s.lastName,
        middleName: s.middleName,
        position:   s.position,
        rate:       s.rate,
        hireDate:   daysAgo(randomInt(180, 1200)),
        birthDate:  new Date(`${randomInt(1970, 1990)}-${String(randomInt(1,12)).padStart(2,"0")}-15`),
        medicalCheckupDate: daysAgo(randomInt(30, 300)),
        user: {
          create: {
            email,
            passwordHash: i === 0 ? adminPassword : teacherPassword,
            role: s.role as any,
          },
        },
      },
    });
    employeeIds.push(emp.id);
  }
  console.log(`✅ ${employeeIds.length} employees (staff) created.`);

  const adminEmpId    = employeeIds[0];
  const deputyEmpId   = employeeIds[1];
  const accountantId  = employeeIds[10];
  const zavhozId      = employeeIds[11];
  // teacher indices 2-9
  const teacherEmpIds = employeeIds.slice(2, 10);

  // =========================================================================
  // 2. CLASSES + STUDENTS + PARENTS
  // =========================================================================
  const classIds: number[] = [];
  const allStudentIds: number[] = [];

  for (let ci = 0; ci < classesData.length; ci++) {
    const cls = classesData[ci];
    const classTeacherId = teacherEmpIds[ci % teacherEmpIds.length];

    const group = await prisma.group.upsert({
      where: { name: cls.name },
      update: { teacherId: classTeacherId },
      create: {
        name: cls.name,
        grade: cls.grade,
        academicYear: "2025-2026",
        capacity: 30,
        teacherId: classTeacherId,
      },
    });
    classIds.push(group.id);

    const numStudents = randomInt(18, 28);
    for (let si = 0; si < numStudents; si++) {
      const isMale = si % 2 === 0;
      const firstName = isMale
        ? firstNamesMale[si % firstNamesMale.length]
        : firstNamesFemale[si % firstNamesFemale.length];
      const lastName = lastNames[(ci * numStudents + si) % lastNames.length];
      const birthYear = new Date().getFullYear() - cls.grade - 6;

      const existing = await prisma.child.findFirst({
        where: { firstName, lastName, groupId: group.id },
      });
      let child = existing;

      if (!child) {
        child = await prisma.child.create({
          data: {
            firstName,
            lastName,
            birthDate: new Date(`${birthYear}-${String(randomInt(1,12)).padStart(2,"0")}-${String(randomInt(1,28)).padStart(2,"0")}`),
            groupId: group.id,
            status: "ACTIVE",
            gender: isMale ? "MALE" : "FEMALE",
            contractNumber: `ДОГ-${new Date().getFullYear()}-${String(ci * 30 + si + 1).padStart(4, "0")}`,
            contractDate: daysAgo(randomInt(30, 400)),
          },
        });

        // Parent
        await prisma.parent.create({
          data: {
            childId:  child.id,
            fullName: `${lastName} ${isMale ? "Иван" : "Ирина"} Петрович`,
            relation: isMale ? "отец" : "мать",
            phone:    `+7 9${randomInt(10,99)} ${randomInt(100,999)}-${randomInt(10,99)}-${randomInt(10,99)}`,
            email:    `parent${ci * 30 + si + 1}@mail.demo`,
            workplace: pick(["ООО «Ромашка»", "АО «Прогресс»", "ИП Иванов", "ГБОУ Школа №5", "ПАО «Сбербанк»"]),
          },
        });

        // LMS enrollment
        await prisma.lmsSchoolStudent.create({
          data: { studentId: child.id, classId: group.id, enrollmentDate: daysAgo(180), status: "active" },
        });
      } else {
        // Ensure LMS enrollment exists for returning students
        const existingLms = await prisma.lmsSchoolStudent.findFirst({
          where: { studentId: child.id, classId: group.id },
        });
        if (!existingLms) {
          await prisma.lmsSchoolStudent.create({
            data: { studentId: child.id, classId: group.id, enrollmentDate: daysAgo(180), status: "active" },
          });
        }
      }

      allStudentIds.push(child.id);
    }
  }
  console.log(`✅ ${classesData.length} classes, ${allStudentIds.length} students created.`);

  // =========================================================================
  // 3. SCHEDULE (for class 4-А)
  // =========================================================================
  const mainClassId = classIds[3]; // 4-А

  async function getOrCreateLmsSubject(name: string) {
    const ex = await prisma.lmsSubject.findFirst({ where: { name } });
    if (ex) return ex;
    return prisma.lmsSubject.create({ data: { name } });
  }

  await prisma.lmsScheduleItem.deleteMany({ where: { classId: mainClassId } });

  for (const item of scheduleTemplate) {
    const subject   = await getOrCreateLmsSubject(item.subject);
    const teacherId = teacherEmpIds[item.teacherIdx - 2] ?? teacherEmpIds[0];
    const [h, m]    = item.time.split(":").map(Number);
    const endM      = m + 45;
    const endTime   = `${(endM >= 60 ? h + 1 : h).toString().padStart(2,"0")}:${(endM % 60).toString().padStart(2,"0")}`;

    await prisma.lmsScheduleItem.create({
      data: {
        classId: mainClassId,
        subjectId: subject.id,
        teacherId,
        dayOfWeek: item.day,
        startTime: item.time,
        endTime,
        room: item.room,
      },
    });
  }
  console.log("✅ Schedule created for 4-А.");

  // =========================================================================
  // 4. LMS GRADES & HOMEWORK (for 4-А students)
  // =========================================================================

  // Re-fetch 4-А LMS students properly
  const lms4AStudents = await prisma.lmsSchoolStudent.findMany({
    where: { classId: mainClassId },
  });

  const lmsSubjects = await prisma.lmsSubject.findMany({ take: 6 });
  const gradeTypes  = ["regular", "test", "quarterly", "exam"];
  const gradeValues = [3, 4, 4, 4, 5, 5, 5, 4, 3, 5];

  for (const lmsStu of lms4AStudents) {
    for (const subj of lmsSubjects) {
      // 6 grades per subject per student
      for (let g = 0; g < 6; g++) {
        const existing = await prisma.lmsGrade.findFirst({
          where: { studentId: lmsStu.id, subjectId: subj.id, date: daysAgo(g * 5) },
        });
        if (existing) continue;

        await prisma.lmsGrade.create({
          data: {
            studentId: lmsStu.id,
            subjectId: subj.id,
            classId:   mainClassId,
            teacherId: teacherEmpIds[0],
            value:     pick(gradeValues),
            gradeType: pick(gradeTypes),
            date:      daysAgo(g * 5),
          },
        });
      }
    }
  }
  console.log("✅ LMS grades created.");

  // Homework
  const mathSubject = lmsSubjects.find((s) => s.name === "Математика") ?? lmsSubjects[0];
  const hwTitles = [
    "Задачи на сложение и вычитание",
    "Умножение двузначных чисел",
    "Деление с остатком",
    "Решение уравнений",
    "Геометрические фигуры",
  ];
  for (let hi = 0; hi < hwTitles.length; hi++) {
    const existing = await prisma.lmsHomework.findFirst({
      where: { title: hwTitles[hi], classId: mainClassId },
    });
    if (existing) continue;

    const hw = await prisma.lmsHomework.create({
      data: {
        title:      hwTitles[hi],
        description: `Выполнить задания из учебника, стр. ${randomInt(50, 120)}, упр. ${randomInt(1,20)}`,
        subjectId:  mathSubject.id,
        classId:    mainClassId,
        teacherId:  teacherEmpIds[0],
        dueDate:    daysFromNow(randomInt(1, 7)),
        maxPoints:  10,
      },
    });

    // Submissions from some students
    for (const lmsStu of lms4AStudents.slice(0, 12)) {
      await prisma.lmsHomeworkSubmission.create({
        data: {
          homeworkId:  hw.id,
          studentId:   lmsStu.id,
          content:     "Задание выполнено.",
          submittedAt: daysAgo(randomInt(1, 3)),
          points:      randomInt(7, 10),
          gradedAt:    daysAgo(1),
        },
      });
    }
  }
  console.log("✅ LMS homework & submissions created.");

  // =========================================================================
  // 5. ATTENDANCE (children in 4-А, last 30 school days)
  // =========================================================================
  for (const lmsStu of lms4AStudents) {
    for (let day = 1; day <= 20; day++) {
      const date = daysAgo(day);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const existing = await prisma.lmsStudentAttendance.findFirst({
        where: { studentId: lmsStu.id, date },
      });
      if (existing) continue;

      await prisma.lmsStudentAttendance.create({
        data: {
          studentId: lmsStu.id,
          classId:   mainClassId,
          date,
          status:    Math.random() > 0.1 ? "present" : pick(["absent", "late", "excused"]),
        },
      });
    }
  }
  console.log("✅ Student attendance created.");

  // =========================================================================
  // 6. EMPLOYEE ATTENDANCE (last 20 work days)
  // =========================================================================
  for (const empId of employeeIds) {
    for (let day = 1; day <= 20; day++) {
      const date = daysAgo(day);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const dateOnly = new Date(date.toISOString().slice(0, 10));

      const existing = await prisma.employeeAttendance.findFirst({
        where: { employeeId: empId, date: dateOnly },
      });
      if (existing) continue;

      await prisma.employeeAttendance.create({
        data: {
          employeeId:  empId,
          date:        dateOnly,
          status:      Math.random() > 0.08 ? "PRESENT" : "SICK_LEAVE",
          hoursWorked: Math.random() > 0.08 ? 8 : 0,
        },
      });
    }
  }
  console.log("✅ Employee attendance created.");

  // =========================================================================
  // 7. CLUBS
  // =========================================================================
  const clubsData = [
    { name: "Робототехника",   desc: "Сборка и программирование роботов LEGO",        cost: 15000, max: 15, teacherIdx: 4 },
    { name: "Шахматы",         desc: "Обучение шахматам с нуля до уровня 3-го разряда", cost: 10000, max: 20, teacherIdx: 5 },
    { name: "Рисование",       desc: "Акварельная живопись и рисунок",                 cost: 12000, max: 18, teacherIdx: 6 },
    { name: "Вокал",           desc: "Вокальная студия, постановка голоса",             cost: 10000, max: 16, teacherIdx: 7 },
    { name: "Футбол",          desc: "Мини-футбол, тренировки 2 раза в неделю",        cost: 8000,  max: 22, teacherIdx: 3 },
    { name: "Английский клуб", desc: "Разговорный клуб на английском языке",           cost: 14000, max: 14, teacherIdx: 2 },
  ];

  const clubIds: number[] = [];
  for (const c of clubsData) {
    const existing = await prisma.club.findFirst({
      where: { name: c.name, teacherId: teacherEmpIds[c.teacherIdx - 2] },
    });
    if (existing) {
      clubIds.push(existing.id);
      continue;
    }
    const club = await prisma.club.create({
      data: {
        name:        c.name,
        description: c.desc,
        teacherId:   teacherEmpIds[c.teacherIdx - 2],
        cost:        c.cost,
        maxStudents: c.max,
        schedule: [
          { day: "Понедельник", time: "14:00" },
          { day: "Среда",       time: "14:00" },
        ],
      },
    });
    clubIds.push(club.id);
  }

  // Enrollments: first 40 students in random clubs
  for (let i = 0; i < Math.min(40, allStudentIds.length); i++) {
    const clubId  = clubIds[i % clubIds.length];
    const childId = allStudentIds[i];
    const existing = await prisma.clubEnrollment.findFirst({ where: { childId, clubId } });
    if (!existing) {
      await prisma.clubEnrollment.create({
        data: { childId, clubId, status: "ACTIVE" },
      });
    }
  }
  console.log(`✅ ${clubIds.length} clubs + enrollments created.`);

  // =========================================================================
  // 8. FINANCE TRANSACTIONS (6 months)
  // =========================================================================
  const financeRecords = [
    // Monthly tuition (income)
    ...Array.from({ length: 6 }, (_, mo) => ({
      amount: 4500000, type: "INCOME", category: "OTHER",
      source: "BUDGET", description: `Оплата обучения — ${monthName(mo)} 2025`,
      date: daysAgo(mo * 30 + 5),
    })),
    // Club fees (income)
    ...Array.from({ length: 6 }, (_, mo) => ({
      amount: 850000, type: "INCOME", category: "CLUBS",
      source: "EXTRA_BUDGET", description: `Кружки — ${monthName(mo)} 2025`,
      date: daysAgo(mo * 30 + 7),
    })),
    // Salaries (expense)
    ...Array.from({ length: 6 }, (_, mo) => ({
      amount: -2800000, type: "EXPENSE", category: "SALARY",
      source: "BUDGET", description: `Зарплата персонала — ${monthName(mo)} 2025`,
      date: daysAgo(mo * 30 + 15),
    })),
    // Nutrition (expense)
    ...Array.from({ length: 6 }, (_, mo) => ({
      amount: -620000, type: "EXPENSE", category: "NUTRITION",
      source: "BUDGET", description: `Продукты питания — ${monthName(mo)} 2025`,
      date: daysAgo(mo * 30 + 10),
    })),
    // Maintenance (expense)
    { amount: -45000, type: "EXPENSE", category: "MAINTENANCE",
      source: "BUDGET", description: "Ремонт сантехники в кабинете 201", date: daysAgo(12) },
    { amount: -32000, type: "EXPENSE", category: "MAINTENANCE",
      source: "BUDGET", description: "Замена лампочек — коридор 2-го этажа", date: daysAgo(25) },
    { amount: -88000, type: "EXPENSE", category: "MAINTENANCE",
      source: "BUDGET", description: "Покраска фасада — часть здания", date: daysAgo(45) },
    { amount: -15500, type: "EXPENSE", category: "OTHER",
      source: "BUDGET", description: "Канцтовары — офис администрации", date: daysAgo(8) },
    { amount: 120000, type: "INCOME", category: "OTHER",
      source: "EXTRA_BUDGET", description: "Грант на развитие STEAM-образования", date: daysAgo(60) },
  ];

  for (const r of financeRecords) {
    await prisma.financeTransaction.create({
      data: {
        amount:      Math.abs(r.amount),
        type:        r.type,
        category:    r.category,
        source:      r.source,
        description: r.description,
        date:        r.date,
      },
    });
  }
  console.log(`✅ ${financeRecords.length} finance transactions created.`);

  // =========================================================================
  // 9. INVENTORY ITEMS WITH STOCK
  // =========================================================================
  const inventoryItems = [
    { name: "Бумага А4 Svetocopy 80 гр/м²", qty: 45, unit: "пачка", type: "STATIONERY", min: 10 },
    { name: "Ручки шариковые синие (уп.50)",  qty: 8,  unit: "уп",    type: "STATIONERY", min: 2  },
    { name: "Маркеры для доски (набор 4 цв)", qty: 12, unit: "набор", type: "STATIONERY", min: 3  },
    { name: "Тетради в клетку А4",            qty: 60, unit: "шт",    type: "STATIONERY", min: 20 },
    { name: "Скотч прозрачный 48×100",        qty: 20, unit: "шт",    type: "STATIONERY", min: 5  },
    { name: "Туалетная бумага (уп.8 рул)",    qty: 24, unit: "уп",    type: "HOUSEHOLD",  min: 5  },
    { name: "Жидкое мыло для диспенсера 5л",  qty: 6,  unit: "канистра", type: "HOUSEHOLD", min: 2 },
    { name: "Средство для мытья посуды 5л",   qty: 4,  unit: "канистра", type: "HOUSEHOLD", min: 1 },
    { name: "Перчатки резиновые",             qty: 30, unit: "пара",  type: "HOUSEHOLD",  min: 10 },
    { name: "Мешки для мусора 60л (уп.20)",   qty: 15, unit: "уп",    type: "HOUSEHOLD",  min: 3  },
    { name: "Мука пшеничная в/с",             qty: 50, unit: "кг",    type: "FOOD",        min: 15 },
    { name: "Масло подсолнечное 1л",          qty: 20, unit: "бут",   type: "FOOD",        min: 5  },
    { name: "Рис длиннозёрный",               qty: 30, unit: "кг",    type: "FOOD",        min: 10 },
    { name: "Макароны (уп.0.5 кг)",           qty: 40, unit: "уп",    type: "FOOD",        min: 10 },
    { name: "Сахар-песок",                    qty: 25, unit: "кг",    type: "FOOD",        min: 5  },
    { name: "Соль пищевая",                   qty: 10, unit: "кг",    type: "FOOD",        min: 2  },
    { name: "Молоко 3.2% (л)",               qty: 30, unit: "л",     type: "FOOD",        min: 10 },
    { name: "Яйца куриные С1",               qty: 180, unit: "шт",   type: "FOOD",        min: 30 },
    { name: "Гречка ядрица",                  qty: 20, unit: "кг",    type: "FOOD",        min: 5  },
    { name: "Картофель",                      qty: 60, unit: "кг",    type: "FOOD",        min: 20 },
  ];

  const invItemMap = new Map<string, number>();
  for (const it of inventoryItems) {
    const existing = await prisma.inventoryItem.findFirst({ where: { name: it.name } });
    if (existing) {
      invItemMap.set(it.name, existing.id);
      continue;
    }
    const created = await prisma.inventoryItem.create({
      data: {
        name:        it.name,
        quantity:    it.qty,
        unit:        it.unit,
        type:        it.type,
        minQuantity: it.min,
      },
    });
    invItemMap.set(it.name, created.id);

    // Opening balance transaction
    await prisma.inventoryTransaction.create({
      data: {
        inventoryItemId: created.id,
        type:            "IN",
        quantity:        it.qty,
        quantityBefore:  0,
        quantityAfter:   it.qty,
        reason:          "Начальный остаток",
        performedById:   zavhozId,
      },
    });
  }
  console.log(`✅ ${inventoryItems.length} inventory items created.`);

  // =========================================================================
  // 10. SUPPLIERS & PURCHASE ORDERS
  // =========================================================================
  const suppliersData = [
    { name: "ООО «КанцМир»",       phone: "+7 495 123-45-67", email: "office@kanczmir.demo", inn: "7701234567", address: "г. Москва, ул. Ленина, 10" },
    { name: "АО «ПродОптТорг»",   phone: "+7 495 987-65-43", email: "sales@prodopt.demo",   inn: "7709876543", address: "г. Москва, пр. Мира, 55"  },
    { name: "ИП Сидоров С.П.",     phone: "+7 916 555-11-22", email: "sidorov.sp@mail.demo",  inn: "501234567890", address: "г. Москва, ул. Садовая, 3" },
  ];

  const supplierIds: number[] = [];
  for (const s of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (existing) { supplierIds.push(existing.id); continue; }
    const sup = await prisma.supplier.create({ data: { ...s, isActive: true } });
    supplierIds.push(sup.id);
  }

  const poData = [
    {
      title:       "Закупка канцтоваров — сентябрь 2025",
      type:        "PLANNED",
      status:      "RECEIVED",
      supplierId:  supplierIds[0],
      orderDate:   daysAgo(90),
      delivDate:   daysAgo(83),
      total:       48500,
      items: [
        { name: "Бумага А4",   qty: 20, unit: "пачка", price: 750  },
        { name: "Ручки синие", qty: 5,  unit: "уп",    price: 620  },
        { name: "Тетради А4",  qty: 50, unit: "шт",    price: 65   },
        { name: "Маркеры",     qty: 10, unit: "набор", price: 380  },
      ],
    },
    {
      title:       "Продукты питания — октябрь 2025",
      type:        "PLANNED",
      status:      "RECEIVED",
      supplierId:  supplierIds[1],
      orderDate:   daysAgo(60),
      delivDate:   daysAgo(55),
      total:       245000,
      items: [
        { name: "Мука пшеничная",   qty: 50, unit: "кг",  price: 60   },
        { name: "Масло подсол.",    qty: 20, unit: "бут",  price: 120  },
        { name: "Рис длиннозёрный", qty: 30, unit: "кг",  price: 90   },
        { name: "Сахар-песок",      qty: 25, unit: "кг",  price: 55   },
        { name: "Яйца С1",          qty: 200, unit: "шт", price: 12   },
      ],
    },
    {
      title:       "Хозтовары — ноябрь 2025",
      type:        "PLANNED",
      status:      "APPROVED",
      supplierId:  supplierIds[2],
      orderDate:   daysAgo(10),
      delivDate:   daysFromNow(5),
      total:       32800,
      items: [
        { name: "Туалетная бумага",  qty: 20, unit: "уп",      price: 380  },
        { name: "Жидкое мыло 5л",   qty: 4,  unit: "канистра", price: 890  },
        { name: "Мешки для мусора",  qty: 10, unit: "уп",      price: 220  },
      ],
    },
    {
      title:       "Срочная закупка: замена компьютерных мышей",
      type:        "OPERATIONAL",
      status:      "DRAFT",
      supplierId:  supplierIds[0],
      orderDate:   daysAgo(2),
      delivDate:   daysFromNow(3),
      total:       14400,
      items: [
        { name: "Компьютерная мышь Logitech B110", qty: 12, unit: "шт", price: 1200 },
      ],
    },
  ];

  for (const po of poData) {
    const existing = await prisma.purchaseOrder.findFirst({ where: { title: po.title } });
    if (existing) continue;

    const orderNum = `ЗАК-${new Date().getFullYear()}-${String(poData.indexOf(po) + 1).padStart(3, "0")}`;
    await prisma.purchaseOrder.create({
      data: {
        orderNumber:         orderNum,
        title:               po.title,
        type:                po.type,
        status:              po.status,
        supplierId:          po.supplierId,
        orderDate:           po.orderDate,
        expectedDeliveryDate: po.delivDate,
        actualDeliveryDate:  po.status === "RECEIVED" ? po.delivDate : undefined,
        totalAmount:         po.total,
        createdById:         zavhozId,
        approvedById:        po.status !== "DRAFT" ? adminEmpId : undefined,
        approvedAt:          po.status !== "DRAFT" ? daysAgo(9) : undefined,
        receivedById:        po.status === "RECEIVED" ? zavhozId : undefined,
        receivedAt:          po.status === "RECEIVED" ? po.delivDate : undefined,
        items: {
          create: po.items.map((it) => ({
            name:            it.name,
            quantity:        it.qty,
            unit:            it.unit,
            price:           it.price,
            totalPrice:      it.qty * it.price,
            receivedQuantity: po.status === "RECEIVED" ? it.qty : undefined,
          })),
        },
      },
    });
  }
  console.log(`✅ ${supplierIds.length} suppliers + ${poData.length} purchase orders created.`);

  // =========================================================================
  // 11. MAINTENANCE REQUESTS
  // =========================================================================
  const maintenanceData = [
    { title: "Протекает кран в туалете 2-го этажа",  type: "REPAIR",  status: "DONE",        desc: "Необходима замена прокладки", createdAgo: 20, items: [] },
    { title: "Сломан стул в кабинете 103",           type: "REPAIR",  status: "IN_PROGRESS", desc: "Отломилась ножка",            createdAgo: 5,  items: [] },
    { title: "Не работает проектор в кабинете 201",  type: "REPAIR",  status: "PENDING",     desc: "Не включается",               createdAgo: 2,  items: [] },
    { title: "Выдача канцтоваров — декабрь",         type: "ISSUE",   status: "DONE",        desc: "Плановая выдача канцтоваров учителям", createdAgo: 15,
      items: [
        { name: "Бумага А4", qty: 5, unit: "пачка", cat: "STATIONERY" },
        { name: "Ручки синие", qty: 2, unit: "уп",  cat: "STATIONERY" },
      ],
    },
    { title: "Выдача хозтоваров — уборка",           type: "ISSUE",   status: "PENDING",     desc: "Для еженедельной уборки помещений", createdAgo: 1,
      items: [
        { name: "Жидкое мыло", qty: 1, unit: "канистра", cat: "HOUSEHOLD" },
        { name: "Перчатки",    qty: 5, unit: "пара",     cat: "HOUSEHOLD" },
      ],
    },
    { title: "Покраска стен в спортзале",             type: "REPAIR",  status: "REJECTED",    desc: "Плановый косметический ремонт", createdAgo: 40, items: [] },
  ];

  for (const mr of maintenanceData) {
    const existing = await prisma.maintenanceRequest.findFirst({ where: { title: mr.title } });
    if (existing) continue;

    await prisma.maintenanceRequest.create({
      data: {
        title:       mr.title,
        description: mr.desc,
        requesterId: pick(teacherEmpIds),
        status:      mr.status,
        type:        mr.type,
        approvedById: mr.status === "DONE" || mr.status === "IN_PROGRESS" ? adminEmpId : undefined,
        approvedAt:   mr.status === "DONE" || mr.status === "IN_PROGRESS" ? daysAgo(mr.createdAgo - 1) : undefined,
        rejectionReason: mr.status === "REJECTED" ? "Нет средств в текущем квартале" : undefined,
        items: {
          create: mr.items.map((it) => ({
            name:     it.name,
            quantity: it.qty,
            unit:     it.unit,
            category: it.cat,
          })),
        },
        createdAt: daysAgo(mr.createdAgo),
      },
    });
  }
  console.log(`✅ ${maintenanceData.length} maintenance requests created.`);

  // =========================================================================
  // 12. INGREDIENTS, DISHES, MENU
  // =========================================================================
  const ingredients = [
    { name: "Молоко",      unit: "л",  calories: 64,  protein: 3.2, fat: 3.5, carbs: 4.7 },
    { name: "Мука",        unit: "кг", calories: 364, protein: 10,  fat: 1.1, carbs: 76  },
    { name: "Яйцо",        unit: "шт", calories: 155, protein: 12.7,fat: 11.5,carbs: 1.1 },
    { name: "Рис",         unit: "кг", calories: 360, protein: 6.7, fat: 0.7, carbs: 79  },
    { name: "Гречка",      unit: "кг", calories: 343, protein: 12.6,fat: 3.3, carbs: 62  },
    { name: "Картофель",   unit: "кг", calories: 77,  protein: 2.0, fat: 0.1, carbs: 17  },
    { name: "Масло слив.", unit: "кг", calories: 748, protein: 0.5, fat: 82.5,carbs: 0.8 },
    { name: "Сахар",       unit: "кг", calories: 387, protein: 0,   fat: 0,   carbs: 100 },
    { name: "Соль",        unit: "кг", calories: 0,   protein: 0,   fat: 0,   carbs: 0   },
    { name: "Макароны",    unit: "кг", calories: 350, protein: 11,  fat: 1.3, carbs: 71  },
  ];

  const ingMap = new Map<string, number>();
  for (const ing of ingredients) {
    const ex = await prisma.ingredient.findFirst({ where: { name: ing.name } });
    if (ex) { ingMap.set(ing.name, ex.id); continue; }
    const created = await prisma.ingredient.create({ data: ing });
    ingMap.set(ing.name, created.id);
  }

  const dishesData = [
    { name: "Каша рисовая молочная",       cat: "Завтрак",  ings: [["Рис",0.05],["Молоко",0.2],["Сахар",0.01],["Масло слив.",0.005]] },
    { name: "Каша гречневая",              cat: "Завтрак",  ings: [["Гречка",0.06],["Масло слив.",0.005]] },
    { name: "Суп картофельный",            cat: "Обед",     ings: [["Картофель",0.1],["Соль",0.002]] },
    { name: "Макароны отварные",           cat: "Гарнир",   ings: [["Макароны",0.08],["Масло слив.",0.005]] },
    { name: "Омлет",                       cat: "Завтрак",  ings: [["Яйцо",1],["Молоко",0.05],["Масло слив.",0.005]] },
    { name: "Блины",                       cat: "Завтрак",  ings: [["Мука",0.06],["Яйцо",0.5],["Молоко",0.15],["Масло слив.",0.01],["Сахар",0.01]] },
  ];

  const dishMap = new Map<string, number>();
  for (const d of dishesData) {
    const ex = await prisma.dish.findFirst({ where: { name: d.name } });
    if (ex) { dishMap.set(d.name, ex.id); continue; }
    const dish = await prisma.dish.create({ data: { name: d.name, category: d.cat } });
    for (const [ingName, qty] of d.ings) {
      const ingId = ingMap.get(ingName as string);
      if (!ingId) continue;
      await prisma.dishIngredient.create({
        data: { dishId: dish.id, ingredientId: ingId, quantity: qty as number },
      });
    }
    dishMap.set(d.name, dish.id);
  }

  // Weekly menu (Mon–Fri, this week)
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const breakfastDishes = ["Каша рисовая молочная", "Каша гречневая", "Омлет", "Блины", "Каша рисовая молочная"];
  const lunchDishes     = ["Суп картофельный", "Суп картофельный", "Суп картофельный", "Суп картофельный", "Суп картофельный"];
  const garnirDishes    = ["Макароны отварные", "Каша гречневая", "Каша гречневая", "Макароны отварные", "Каша рисовая молочная"];

  for (let dow = 0; dow < 5; dow++) {
    const menuDate = new Date(monday);
    menuDate.setDate(monday.getDate() + dow);

    for (const ageGroup of ["ELEMENTARY"]) {
      const existing = await prisma.menu.findFirst({
        where: { date: menuDate, ageGroup },
      });
      if (existing) continue;

      const menu = await prisma.menu.create({ data: { date: menuDate, ageGroup } });

      const bDish = dishMap.get(breakfastDishes[dow]);
      const lDish = dishMap.get(lunchDishes[dow]);
      const gDish = dishMap.get(garnirDishes[dow]);

      if (bDish) await prisma.menuDish.create({ data: { menuId: menu.id, dishId: bDish, mealType: "Завтрак" } });
      if (lDish) await prisma.menuDish.create({ data: { menuId: menu.id, dishId: lDish, mealType: "Обед"   } });
      if (gDish) await prisma.menuDish.create({ data: { menuId: menu.id, dishId: gDish, mealType: "Полдник" } });
    }
  }
  console.log("✅ Ingredients, dishes, weekly menu created.");

  // =========================================================================
  // 13. EVENTS & NOTIFICATIONS
  // =========================================================================
  const eventsData = [
    { title: "Новогодний утренник",                date: daysFromNow(14), org: "Администрация", performers: ["Волкова С.", "Лебедева Т."] },
    { title: "Родительское собрание — 4-А",        date: daysFromNow(7),  org: "Петрова О.И.",  performers: [] },
    { title: "День открытых дверей",                date: daysFromNow(21), org: "Смирнов А.П.",  performers: ["Весь педагогический состав"] },
    { title: "Соревнования по мини-футболу",       date: daysFromNow(5),  org: "Соколов А.Н.", performers: ["Команда 5-А", "Команда 6-А"] },
    { title: "Олимпиада по математике",            date: daysAgo(3),      org: "Иванова Н.С.",  performers: ["Учащиеся 7-11 классов"] },
    { title: "День учителя — торжественная линейка", date: daysAgo(60),   org: "Администрация", performers: ["Учащиеся 9-А", "Учащиеся 10-А"] },
  ];

  for (const ev of eventsData) {
    const existing = await prisma.event.findFirst({ where: { title: ev.title } });
    if (!existing) {
      await prisma.event.create({
        data: { title: ev.title, date: ev.date, organizer: ev.org, performers: ev.performers },
      });
    }
  }

  const notificationsData = [
    { title: "Родительское собрание", content: "Уважаемые родители! 22 декабря в 18:00 состоится родительское собрание в классе 4-А.", targetRole: "TEACHER" as any },
    { title: "График работы на каникулы", content: "С 25 декабря по 8 января школа работает в режиме каникул. Охрана и дежурные администраторы — по расписанию.", targetRole: null },
    { title: "Подача заявок на аттестацию", content: "До 15 января необходимо подать заявки на аттестацию. Обращаться к заместителю директора.", targetRole: "TEACHER" as any },
  ];

  for (const n of notificationsData) {
    const existing = await prisma.notification.findFirst({ where: { title: n.title } });
    if (!existing) {
      await prisma.notification.create({ data: n });
    }
  }
  console.log(`✅ ${eventsData.length} events + ${notificationsData.length} notifications created.`);

  // =========================================================================
  // 14. SECURITY LOGS
  // =========================================================================
  const securityEvents = [
    { type: "VISITOR_LOG",  desc: "Проверка системы видеонаблюдения — плановая",                    ago: 30 },
    { type: "INCIDENT", desc: "Сигнализация сработала ложно — КЗ в розетке кабинета 105",      ago: 20 },
    { type: "VISITOR_LOG",  desc: "Визит комиссии Департамента образования (3 человека, 10:00-14:00)", ago: 15 },
    { type: "VISITOR_LOG",  desc: "Посещение родителей открытого урока — 12 человек",               ago: 7  },
    { type: "INCIDENT", desc: "Учащийся получил травму на перемене (ушиб колена). Оказана первая помощь.", ago: 3 },
  ];

  for (const se of securityEvents) {
    await prisma.securityLog.create({
      data: { eventType: se.type, description: se.desc, date: daysAgo(se.ago) },
    });
  }
  console.log("✅ Security logs created.");

  // =========================================================================
  // 15. FEEDBACK
  // =========================================================================
  const feedbackData = [
    { name: "Сидорова А.П.", contact: "sidorova@mail.demo",  type: "Предложение", msg: "Прошу рассмотреть возможность введения кружка по программированию для учащихся 5-7 классов.", status: "RESOLVED", response: "Спасибо за предложение! С 1 февраля открываем новый кружок «Python для школьников»." },
    { name: "Козлов В.Н.",   contact: "+7 916 444-55-66",    type: "Жалоба",      msg: "В столовой часто холодное первое блюдо. Просьба наладить температурный контроль.", status: "IN_PROGRESS", response: null },
    { name: "Новикова Е.С.", contact: "novikova.es@mail.demo",type: "Обращение",  msg: "Когда будет готово расписание на второй семестр?", status: "RESOLVED", response: "Расписание на второй семестр опубликовано в личном кабинете." },
    { name: "Попов Д.И.",    contact: "+7 903 222-33-44",    type: "Предложение", msg: "Предлагаю оборудовать дополнительное место для велосипедов у входа.", status: "NEW", response: null },
  ];

  for (const fb of feedbackData) {
    const existing = await prisma.feedback.findFirst({ where: { parentName: fb.name, message: fb.msg } });
    if (!existing) {
      await prisma.feedback.create({
        data: {
          parentName:  fb.name,
          contactInfo: fb.contact,
          type:        fb.type,
          message:     fb.msg,
          status:      fb.status,
          response:    fb.response ?? undefined,
          resolvedAt:  fb.status === "RESOLVED" ? daysAgo(1) : undefined,
        },
      });
    }
  }
  console.log("✅ Feedback entries created.");

  // =========================================================================
  // 16. EQUIPMENT
  // =========================================================================
  const equipmentData = [
    { name: "Огнетушитель ОП-5 (1-й этаж, холл)",    loc: "Холл 1-го этажа",   last: daysAgo(180), next: daysFromNow(185) },
    { name: "Огнетушитель ОП-5 (2-й этаж, коридор)", loc: "Коридор 2-го этажа",last: daysAgo(180), next: daysFromNow(185) },
    { name: "Пожарная сигнализация — центральный блок",loc:"Серверная",          last: daysAgo(90),  next: daysFromNow(90)  },
    { name: "Проектор EPSON EB-X41 (каб. 101)",       loc: "Кабинет 101",       last: daysAgo(365), next: daysFromNow(0)   },
    { name: "Ламинатор Fellowes Saturn A4",            loc: "Учительская",       last: daysAgo(730), next: daysFromNow(-1)  },
    { name: "Интерактивная доска SMART Board (201)",   loc: "Кабинет 201",       last: daysAgo(200), next: daysFromNow(165) },
  ];

  for (const eq of equipmentData) {
    const existing = await prisma.equipment.findFirst({ where: { name: eq.name } });
    if (!existing) {
      await prisma.equipment.create({
        data: { name: eq.name, location: eq.loc, lastCheckup: eq.last, nextCheckup: eq.next },
      });
    }
  }
  console.log("✅ Equipment created.");

  // =========================================================================
  // 17. STAFFING TABLE
  // =========================================================================
  const staffingData = [
    { position: "Директор",            requiredRate: 1.0 },
    { position: "Заместитель директора", requiredRate: 1.0 },
    { position: "Учитель начальных классов", requiredRate: 6.0 },
    { position: "Учитель математики",   requiredRate: 2.0 },
    { position: "Учитель английского",  requiredRate: 2.0 },
    { position: "Учитель информатики",  requiredRate: 1.0 },
    { position: "Учитель физкультуры",  requiredRate: 1.0 },
    { position: "Учитель музыки",       requiredRate: 0.5 },
    { position: "Бухгалтер",           requiredRate: 1.0 },
    { position: "Завхоз",              requiredRate: 1.0 },
  ];

  for (const st of staffingData) {
    const existing = await prisma.staffingTable.findFirst({ where: { position: st.position } });
    if (!existing) {
      await prisma.staffingTable.create({ data: st });
    }
  }
  console.log("✅ Staffing table created.");

  // =========================================================================
  // 18. ANNOUNCEMENTS
  // =========================================================================
  const adminUser = await prisma.user.findFirst({ where: { role: "DIRECTOR" } });
  if (adminUser) {
    const announcements = [
      { title: "Итоги первого семестра",         content: "Уважаемые коллеги! Подводим итоги первого учебного семестра. Педагогический совет состоится 22 декабря в 15:00.", pinned: true,  classId: null },
      { title: "Новогоднее мероприятие — план",  content: "Публикуем план новогодних мероприятий. Репетиции с 18 декабря. Подробности у организатора — Волковой С.П.", pinned: false, classId: null },
      { title: "Домашнее задание на каникулы — 4-А", content: "Математика: стр.78, задачи 1-5. Русский язык: упр.203.", pinned: false, classId: mainClassId },
    ];

    for (const ann of announcements) {
      const existing = await prisma.lmsClassAnnouncement.findFirst({ where: { title: ann.title } });
      if (!existing) {
        await prisma.lmsClassAnnouncement.create({
          data: {
            title:    ann.title,
            content:  ann.content,
            authorId: adminUser.id,
            isPinned: ann.pinned,
            classId:  ann.classId,
          },
        });
      }
    }
    console.log("✅ Announcements created.");
  }

  console.log("\n🎉 Demo data seeding finished successfully.");
  console.log("   Login: admin@test.local / MiraiTest_2026!");
}

// ---------------------------------------------------------------------------
// Utility — simple transliteration for email addresses
// ---------------------------------------------------------------------------
const TRANSLIT: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"j",
  к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
  х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
};
function translitChar(c: string): string {
  return TRANSLIT[c.toLowerCase()] ?? c.toLowerCase();
}

function monthName(idx: number): string {
  const months = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const now = new Date();
  const mo  = (now.getMonth() - idx + 12) % 12;
  return months[mo];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
