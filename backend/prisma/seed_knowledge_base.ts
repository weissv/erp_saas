
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
        email: 'admin@mezon.uz',
        passwordHash: hashedPassword,
        role: Role.ADMIN,
        employeeId: employee.id,
      }
    });
    console.log('Created default admin user: admin@mezon.uz');
  }

  const articles = [
    {
      title: 'Добро пожаловать в Mezon ERP',
      slug: 'welcome-to-mezon-erp',
      tags: ['general', 'onboarding'],
      roles: [], // All roles
      summary: 'Обзор возможностей системы и навигация по основным модулям.',
      content: `
# Добро пожаловать в Mezon ERP

Mezon ERP — это комплексная система управления школой, объединяющая учебные, административные и хозяйственные процессы.

## Основные разделы

### 🎓 Учебный процесс
* **Дети**: База данных учеников, личные дела, здоровье.
* **Классы**: Управление группами и классным руководством.
* **Расписание**: Сетка занятий, звонков и кабинетов.
* **LMS**: Электронный журнал, домашние задания и оценки.
* **Контрольные**: Платформа для проведения тестирований.

### 👥 Кадры
* **Сотрудники**: Личные дела, договоры, ставки.
* **Штатное расписание**: Планирование вакансий и нагрузок.

### 💰 Финансы и Склад
* **Финансы**: Учет доходов и расходов, бюджетирование.
* **Склад**: Учет товаров, инвентаризация, списания.
* **Закупки**: Полный цикл снабжения от заявки до приемки.
* **Меню и Рецепты**: Технологические карты и планирование питания.

### 🛠 Хозяйство
* **Заявки**: Система тикетов для ремонта и обслуживания.
* **Безопасность**: Журналы посещений и инцидентов.
      `,
    },
    {
      title: 'Работа с модулем "Дети"',
      slug: 'children-module-guide',
      tags: ['students', 'guide'],
      roles: ['ADMIN', 'DEPUTY', 'TEACHER'],
      summary: 'Инструкция по добавлению и редактированию карточек учеников.',
      content: `
# Управление контингентом учащихся

Модуль "Дети" позволяет вести полный учет учеников школы.

## Добавление нового ученика
1. Перейдите в раздел **Дети**.
2. Нажмите кнопку **"Добавить ребенка"**.
3. Заполните обязательные поля:
   * ФИО
   * Дата рождения
   * Класс (Группа)
4. Дополнительно можно указать медицинские данные (аллергии) и статус.

## Статусы учеников
* **ACTIVE**: Учится в данный момент.
* **LEFT**: Выбыл из школы (архив).

## Перевод между классами
Для перевода ученика откройте его профиль и измените поле "Группа". История перемещений сохранится в логах.
      `,
    },
    {
      title: 'Закупки и Снабжение',
      slug: 'procurement-workflow',
      tags: ['finance', 'inventory', 'procurement'],
      roles: ['ADMIN', 'ZAVHOZ', 'DIRECTOR', 'ACCOUNTANT'],
      summary: 'Как оформить заявку на закупку и отследить её статус.',
      content: `
# Процесс закупок (Procurement)

Система поддерживает полный цикл снабжения: от планирования до оприходования на склад.

## Этапы закупки

1. **Создание заявки (DRAFT)**
   * Завхоз или администратор создает черновик закупки.
   * Указывается поставщик, список товаров и цены.

2. **Согласование (PENDING -> APPROVED)**
   * Директор получает уведомление о новой заявке.
   * Директор может одобрить или отклонить заявку с комментарием.

3. **Заказ (ORDERED)**
   * После одобрения статус меняется на "Заказано".
   * Отправляется заказ поставщику.

4. **Доставка и Приемка (DELIVERED -> RECEIVED)**
   * При поступлении товара на склад ответственный сотрудник отмечает фактическое количество.
   * Система автоматически создает транзакции **IN** (Приход) на складе.

## Типы закупок
* **PLANNED**: Плановая закупка (продукты на месяц, канцтовары на четверть).
* **OPERATIONAL**: Срочная закупка (ремонт, замена оборудования).
      `,
    },
    {
      title: 'Работа с LMS: Оценки и ДЗ',
      slug: 'lms-grading-homework',
      tags: ['lms', 'teachers'],
      roles: ['TEACHER', 'DEPUTY', 'ADMIN'],
      summary: 'Инструкция для учителей по ведению электронного журнала.',
      content: `
# Электронный журнал (LMS)

## Выставление оценок
1. Перейдите в раздел **Школьная LMS** -> **Журнал**.
2. Выберите класс и предмет.
3. Нажмите на ячейку на пересечении ученика и даты.
4. Выберите оценку (1-5) или отметку о посещаемости.

## Домашние задания
1. В разделе **Домашние задания** нажмите "Создать".
2. Укажите тему, описание и дедлайн.
3. Можно прикрепить файлы.
4. Ученики увидят задание в своих личных кабинетах.

## Типы работ
* **Regular**: Обычная работа на уроке.
* **Test**: Контрольная работа.
* **Quarterly**: Четвертная оценка.
* **Exam**: Экзамен.
      `,
    },
    {
      title: 'Техническая поддержка и Заявки',
      slug: 'maintenance-requests',
      tags: ['maintenance', 'support'],
      roles: [], // All roles can create requests
      summary: 'Как сообщить о поломке или запросить необходимое оборудование.',
      content: `
# Заявки на обслуживание

Если в классе что-то сломалось или нужны хозяйственные товары, создайте заявку.

## Создание заявки
1. Раздел **Заявки** -> **Новая заявка**.
2. Выберите тип:
   * **REPAIR**: Ремонт (сломался стул, перегорела лампа).
   * **ISSUE**: Выдача (нужны маркеры, бумага).
3. Опишите проблему и приложите фото (опционально).

## Статусы
* **PENDING**: Ожидает рассмотрения завхозом.
* **IN_PROGRESS**: В работе.
* **DONE**: Выполнено.
* **REJECTED**: Отклонено (см. комментарий).
      `,
    },
    {
      title: 'Проведение Экзаменов',
      slug: 'running-exams',
      tags: ['exams', 'lms'],
      roles: ['TEACHER', 'DEPUTY'],
      summary: 'Создание и публикация контрольных работ на платформе.',
      content: `
# Платформа Контрольных Работ

Модуль позволяет создавать онлайн-тесты с автоматической проверкой.

## Создание теста
1. **Контрольные** -> **Создать**.
2. Укажите название, предмет и время выполнения.
3. Добавьте вопросы:
   * **Выбор ответа**: Одиночный или множественный.
   * **Текст**: Открытый вопрос (проверяется AI или учителем).
   * **Задача**: Текстовое решение.

## Публикация
* Установите статус **PUBLISHED**.
* Система сгенерирует публичную ссылку или код доступа для учеников.
* Установите дату и время доступа (Start/End Date).

## Результаты
После завершения теста результаты доступны во вкладке **Ответы**. Система автоматически подсчитывает баллы за тестовые вопросы. Открытые вопросы требуют проверки (или пред-проверки через AI).
      `,
    },
    {
      title: 'Учет питания (Меню и Рецепты)',
      slug: 'nutrition-management',
      tags: ['nutrition', 'kitchen'],
      roles: ['ADMIN', 'ZAVHOZ', 'ACCOUNTANT'],
      summary: 'Составление меню и калькуляция блюд.',
      content: `
# Организация питания

## Ингредиенты и Рецепты
* **Ингредиенты**: Базовые продукты (мука, сахар, молоко). Содержат данные о КБЖУ.
* **Блюда (Рецепты)**: Состоят из ингредиентов. Система считает себестоимость и калорийность блюда автоматически.

## Составление Меню
1. Раздел **Меню**.
2. Выберите дату и возрастную группу (Ясли, Дошкольники, Школа).
3. Добавьте блюда на завтрак, обед, полдник и ужин.
4. Меню можно распечатать или опубликовать для родителей.
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

    // Note: We are not generating embeddings here as that requires the AiService to be running/mocked.
    // In a real scenario, the service hook or a background job would generate them.
    // For this seed, the articles will be text-searchable but not vector-searchable until updated via API or a utility script.
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
