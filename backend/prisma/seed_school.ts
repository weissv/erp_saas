// backend/prisma/seed_school.ts
// Generic school seed — uses LmsSchoolStudent model directly (no Child).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Generic teacher fixtures
// ---------------------------------------------------------------------------
const teachersData = [
  { firstName: "Alice", lastName: "Johnson", role: "TEACHER" },
  { firstName: "Bob", lastName: "Smith", role: "TEACHER" },
  { firstName: "Carol", lastName: "Williams", role: "DEPUTY" },
  { firstName: "David", lastName: "Brown", role: "TEACHER" },
  { firstName: "Eva", lastName: "Davis", role: "TEACHER" },
  { firstName: "Frank", lastName: "Miller", role: "TEACHER" },
  { firstName: "Grace", lastName: "Wilson", role: "TEACHER" },
  { firstName: "Henry", lastName: "Moore", role: "TEACHER" },
  { firstName: "Irene", lastName: "Taylor", role: "TEACHER" },
  { firstName: "Jack", lastName: "Anderson", role: "TEACHER" },
];

// ---------------------------------------------------------------------------
// Generic student fixtures
// ---------------------------------------------------------------------------
const studentsData = [
  { firstName: "Liam", lastName: "Clark", age: 10 },
  { firstName: "Emma", lastName: "Lewis", age: 10 },
  { firstName: "Noah", lastName: "Walker", age: 11 },
  { firstName: "Olivia", lastName: "Hall", age: 10 },
  { firstName: "Ava", lastName: "Young", age: 10 },
  { firstName: "Ethan", lastName: "Allen", age: 10 },
  { firstName: "Sophia", lastName: "King", age: 10 },
  { firstName: "Mason", lastName: "Wright", age: 10 },
  { firstName: "Isabella", lastName: "Scott", age: 10 },
];

// ---------------------------------------------------------------------------
// Generic schedule
// ---------------------------------------------------------------------------
const scheduleItems = [
  { day: 1, time: "08:30", subject: "Mathematics", teacher: "Johnson", room: "101" },
  { day: 1, time: "09:20", subject: "Native Language", teacher: "Johnson", room: "101" },
  { day: 1, time: "10:10", subject: "Reading", teacher: "Johnson", room: "101" },
  { day: 1, time: "11:00", subject: "Science", teacher: "Johnson", room: "101" },
  { day: 1, time: "12:00", subject: "Art", teacher: "Davis", room: "201" },

  { day: 2, time: "08:30", subject: "Mathematics", teacher: "Johnson", room: "101" },
  { day: 2, time: "09:20", subject: "Native Language", teacher: "Johnson", room: "101" },
  { day: 2, time: "10:10", subject: "English", teacher: "Smith", room: "102" },
  { day: 2, time: "11:00", subject: "Physical Education", teacher: "Moore", room: "Gym" },
  { day: 2, time: "12:00", subject: "Music", teacher: "Davis", room: "201" },

  { day: 3, time: "08:30", subject: "Mathematics", teacher: "Johnson", room: "101" },
  { day: 3, time: "09:20", subject: "Science", teacher: "Johnson", room: "101" },
  { day: 3, time: "10:10", subject: "Native Language", teacher: "Johnson", room: "101" },
  { day: 3, time: "11:00", subject: "English", teacher: "Smith", room: "102" },
  { day: 3, time: "12:00", subject: "Computer Science", teacher: "Miller", room: "Lab" },

  { day: 4, time: "08:30", subject: "Mathematics", teacher: "Johnson", room: "101" },
  { day: 4, time: "09:20", subject: "Native Language", teacher: "Johnson", room: "101" },
  { day: 4, time: "10:10", subject: "Reading", teacher: "Johnson", room: "101" },
  { day: 4, time: "11:00", subject: "English", teacher: "Smith", room: "102" },
  { day: 4, time: "12:00", subject: "Science", teacher: "Johnson", room: "101" },

  { day: 5, time: "08:30", subject: "Mathematics", teacher: "Johnson", room: "101" },
  { day: 5, time: "09:20", subject: "Native Language", teacher: "Johnson", room: "101" },
  { day: 5, time: "10:10", subject: "English", teacher: "Smith", room: "102" },
  { day: 5, time: "11:00", subject: "Computer Science", teacher: "Miller", room: "Lab" },
  { day: 5, time: "12:00", subject: "Physical Education", teacher: "Moore", room: "Gym" },
];

async function main() {
  console.log("🚀 Seeding generic school data …");

  // 1. Admin ----------------------------------------------------------------
  const adminPassword = await bcrypt.hash("change_me_123", 10);

  let adminEmployee = await prisma.employee.findFirst({ where: { id: 999 } });
  if (!adminEmployee) {
    adminEmployee = await prisma.employee.create({
      data: {
        id: 999,
        firstName: "Admin",
        lastName: "User",
        position: "Director",
        rate: 1.0,
        hireDate: new Date(),
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "admin" },
    update: { passwordHash: adminPassword, role: "DIRECTOR" },
    create: {
      email: "admin",
      passwordHash: adminPassword,
      role: "DIRECTOR",
      employeeId: adminEmployee.id,
    },
  });
  console.log("✅ Admin user created.");

  // 2. Teachers -------------------------------------------------------------
  const teacherMap = new Map<string, number>();

  for (const t of teachersData) {
    const email = `${t.firstName.toLowerCase()}.${t.lastName.toLowerCase()}@example.com`;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.employeeId) {
        teacherMap.set(t.lastName.toLowerCase(), existingUser.employeeId);
      }
      continue;
    }

    const employee = await prisma.employee.create({
      data: {
        firstName: t.firstName,
        lastName: t.lastName,
        position: t.role === "DEPUTY" ? "Deputy Director" : "Teacher",
        rate: 1.0,
        hireDate: new Date(),
        user: {
          create: {
            email,
            passwordHash: await bcrypt.hash("password", 10),
            role: t.role as any,
          },
        },
      },
    });

    teacherMap.set(t.lastName.toLowerCase(), employee.id);
  }
  console.log(`✅ Created ${teachersData.length} teachers.`);

  // 3. Class ----------------------------------------------------------------
  const demoClass = await prisma.group.upsert({
    where: { name: "4-A" },
    update: {},
    create: {
      name: "4-A",
      grade: 4,
      academicYear: "2025-2026",
      capacity: 30,
    },
  });
  console.log("✅ Class '4-A' created.");

  // 4. Students (LmsSchoolStudent only — no Child model) --------------------
  for (const s of studentsData) {
    const birthYear = new Date().getFullYear() - s.age;

    const existingStudent = await prisma.lmsSchoolStudent.findFirst({
      where: { firstName: s.firstName, lastName: s.lastName, classId: demoClass.id },
    });

    if (existingStudent) continue;

    await prisma.lmsSchoolStudent.create({
      data: {
        firstName: s.firstName,
        lastName: s.lastName,
        birthDate: new Date(`${birthYear}-06-15`),
        classId: demoClass.id,
        isActive: true,
      },
    });
  }
  console.log(`✅ Enrolled ${studentsData.length} students.`);

  // 5. Subjects helper ------------------------------------------------------
  async function getOrCreateSubject(name: string) {
    const existing = await prisma.lmsSubject.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.lmsSubject.create({ data: { name } });
  }

  // 6. Schedule -------------------------------------------------------------
  await prisma.lmsScheduleItem.deleteMany({ where: { classId: demoClass.id } });

  for (const item of scheduleItems) {
    const subject = await getOrCreateSubject(item.subject);

    let teacherId: number | null = null;
    for (const [lname, id] of teacherMap.entries()) {
      if (lname === item.teacher.toLowerCase()) {
        teacherId = id;
        break;
      }
    }

    const [h, m] = item.time.split(":").map(Number);
    const endH = m + 45 >= 60 ? h + 1 : h;
    const endM = (m + 45) % 60;
    const endTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

    await prisma.lmsScheduleItem.create({
      data: {
        classId: demoClass.id,
        subjectId: subject.id,
        teacherId,
        dayOfWeek: item.day,
        startTime: item.time,
        endTime,
        room: item.room,
      },
    });
  }
  console.log("✅ Schedule generated.");

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
