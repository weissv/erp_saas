
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Knowledge Base...');

  // Ensure we have at least one user to be the author
  let author = await prisma.user.findFirst();
  
  if (!author) {
    console.log('No users found. Creating default admin user...');
    
    // Create Employee first
    const employee = await prisma.employee.create({
      data: {
        firstName: 'System',
        lastName: 'Admin',
        position: 'Administrator',
        rate: 1.0,
        hireDate: new Date(),
      }
    });

    const hashedPassword = await bcrypt.hash('admin123', 10);

    author = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: hashedPassword,
        role: Role.ADMIN,
        employeeId: employee.id,
      }
    });
    console.log('Created default admin user: admin@example.com');
  }

  const articles = [
    {
      title: 'Welcome to the ERP Platform',
      slug: 'welcome-to-erp-platform',
      tags: ['general', 'onboarding'],
      roles: [], // All roles
      summary: 'Overview of system capabilities and navigation across the main modules.',
      content: `
# Welcome to the ERP Platform

This is a comprehensive school management system that unites academic, administrative, and operational processes.

## Main Sections

### 🎓 Academic
* **Children**: Student database, personal files, health records.
* **Classes**: Group management and homeroom assignments.
* **Schedule**: Class timetable, bells, and room assignments.
* **LMS**: Grade book, homework, and assessments.
* **Exams**: Online test platform.

### 👥 Staff
* **Employees**: Personal files, contracts, pay rates.
* **Staffing Table**: Vacancy and workload planning.

### 💰 Finance & Inventory
* **Finance**: Revenue/expense tracking and budgeting.
* **Inventory**: Stock management, audits, write-offs.
* **Procurement**: Full supply-chain from request to delivery.
* **Menu & Recipes**: Meal planning and recipe costing.

### 🛠 Facilities
* **Maintenance**: Repair and service ticket system.
* **Security**: Visitor and incident logs.
      `,
    },
    {
      title: 'Working with the Children Module',
      slug: 'children-module-guide',
      tags: ['students', 'guide'],
      roles: ['ADMIN', 'DEPUTY', 'TEACHER'],
      summary: 'Guide for adding and editing student records.',
      content: `
# Student Management

The Children module provides complete student record-keeping.

## Adding a New Student
1. Navigate to **Children**.
2. Click **"Add Child"**.
3. Fill in the required fields:
   * Full name
   * Date of birth
   * Class (Group)
4. Optionally specify medical data (allergies) and status.

## Student Statuses
* **ACTIVE**: Currently enrolled.
* **LEFT**: Withdrawn (archived).

## Class Transfers
To transfer a student, open their profile and change the "Group" field. Transfer history is kept in the logs.
      `,
    },
    {
      title: 'Procurement Workflow',
      slug: 'procurement-workflow',
      tags: ['finance', 'inventory', 'procurement'],
      roles: ['ADMIN', 'ZAVHOZ', 'DIRECTOR', 'ACCOUNTANT'],
      summary: 'How to create a procurement request and track its status.',
      content: `
# Procurement Process

The system supports the full supply-chain: from planning to warehouse receipt.

## Procurement Stages

1. **Create Request (DRAFT)**
   * The facilities manager or admin creates a draft.
   * Supplier, item list, and prices are specified.

2. **Approval (PENDING -> APPROVED)**
   * The director receives a notification.
   * The director can approve or reject with a comment.

3. **Ordered (ORDERED)**
   * After approval the status changes to "Ordered".
   * The order is sent to the supplier.

4. **Delivery & Receipt (DELIVERED -> RECEIVED)**
   * Upon arrival the responsible employee marks actual quantities.
   * The system automatically creates **IN** (receipt) transactions in inventory.

## Procurement Types
* **PLANNED**: Scheduled procurement (monthly food supplies, quarterly stationery).
* **OPERATIONAL**: Urgent procurement (repairs, equipment replacement).
      `,
    },
    {
      title: 'LMS: Grades & Homework',
      slug: 'lms-grading-homework',
      tags: ['lms', 'teachers'],
      roles: ['TEACHER', 'DEPUTY', 'ADMIN'],
      summary: 'Teacher guide for the electronic grade book.',
      content: `
# Electronic Grade Book (LMS)

## Entering Grades
1. Navigate to **School LMS** -> **Grade Book**.
2. Select a class and subject.
3. Click the cell at the intersection of a student and a date.
4. Choose a grade (1-5) or an attendance mark.

## Homework
1. In the **Homework** section click "Create".
2. Specify the topic, description, and deadline.
3. Optionally attach files.
4. Students will see the assignment in their personal dashboards.

## Work Types
* **Regular**: Everyday classwork.
* **Test**: Assessment / quiz.
* **Quarterly**: Quarter grade.
* **Exam**: Final exam.
      `,
    },
    {
      title: 'Maintenance Requests',
      slug: 'maintenance-requests',
      tags: ['maintenance', 'support'],
      roles: [], // All roles can create requests
      summary: 'How to report a broken item or request equipment.',
      content: `
# Maintenance Requests

If something is broken or supplies are needed, create a request.

## Creating a Request
1. Go to **Maintenance** -> **New Request**.
2. Select a type:
   * **REPAIR**: Fix something (broken chair, burnt-out lamp).
   * **ISSUE**: Supply request (markers, paper).
3. Describe the problem and attach a photo (optional).

## Statuses
* **PENDING**: Awaiting review by facilities.
* **IN_PROGRESS**: Being worked on.
* **DONE**: Completed.
* **REJECTED**: Declined (see comment).
      `,
    },
    {
      title: 'Running Exams',
      slug: 'running-exams',
      tags: ['exams', 'lms'],
      roles: ['TEACHER', 'DEPUTY'],
      summary: 'Creating and publishing online tests.',
      content: `
# Online Exam Platform

The module allows creating auto-graded online tests.

## Creating a Test
1. **Exams** -> **Create**.
2. Specify title, subject, and time limit.
3. Add questions:
   * **Multiple choice**: Single or multi-select.
   * **Text**: Open-ended (reviewed by AI or teacher).
   * **Problem**: Written solution.

## Publishing
* Set status to **PUBLISHED**.
* The system generates a public link or access code.
* Set start and end dates for availability.

## Results
After the test closes, results are available in the **Answers** tab. The system auto-scores multiple choice. Open-ended questions require review (or AI pre-check).
      `,
    },
    {
      title: 'Nutrition Management',
      slug: 'nutrition-management',
      tags: ['nutrition', 'kitchen'],
      roles: ['ADMIN', 'ZAVHOZ', 'ACCOUNTANT'],
      summary: 'Menu planning and recipe costing.',
      content: `
# Nutrition Management

## Ingredients & Recipes
* **Ingredients**: Basic products (flour, sugar, milk) with KCAL/protein/fat/carb data.
* **Dishes (Recipes)**: Composed of ingredients. The system calculates cost and calories automatically.

## Menu Planning
1. Navigate to **Menu**.
2. Select a date and age group (Nursery, Preschool, School).
3. Add dishes for breakfast, lunch, snack, and dinner.
4. The menu can be printed or published for parents.
      `,
    }
  ];

  for (const article of articles) {
    const slug = article.slug;
    
    // Check if exists
    const existing = await prisma.knowledgeBaseArticle.findUnique({
      where: { slug }
    });

    if (existing) {
      console.log(`Article "${article.title}" already exists. Updating...`);
      await prisma.knowledgeBaseArticle.update({
        where: { slug },
        data: {
          title: article.title,
          content: article.content,
          summary: article.summary,
          tags: article.tags,
          roles: article.roles as any,
          authorId: author.id,
        }
      });
    } else {
      console.log(`Creating article "${article.title}"...`);
      await prisma.knowledgeBaseArticle.create({
        data: {
          title: article.title,
          slug: article.slug,
          content: article.content,
          summary: article.summary,
          tags: article.tags,
          roles: article.roles as any,
          authorId: author.id,
        }
      });
    }
  }

  console.log('Knowledge Base seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
