// cypress/e2e/lms.cy.ts
// E2E тесты для LMS (Learning Management System)

describe('LMS - Школьная система', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.loginViaAPI(users.valid.username, users.valid.password)
    })
  })

  describe('Классы', () => {
    beforeEach(() => {
      cy.visit('/lms/classes')
      cy.waitForPageLoad()
    })

    it('отображает список классов', () => {
      cy.intercept('GET', '**/api/lms/school/classes*', {
        body: [
          { id: 1, name: '5А', grade: 5, academicYear: '2024-2025', isActive: true },
          { id: 2, name: '5Б', grade: 5, academicYear: '2024-2025', isActive: true },
        ],
      }).as('getClasses')
      
      cy.wait('@getClasses')
      cy.contains('5А').should('be.visible')
      cy.contains('5Б').should('be.visible')
    })

    it('создаёт новый класс', () => {
      cy.intercept('POST', '**/api/lms/school/classes', {
        statusCode: 201,
        body: { id: 3, name: '6А', grade: 6 },
      }).as('createClass')

      cy.contains('button', /добавить|создать/i).click()
      cy.get('[name="name"]').type('6А')
      cy.get('[name="grade"]').type('6')
      cy.get('[name="academicYear"]').type('2024-2025')
      cy.contains('button', /сохранить/i).click()

      cy.wait('@createClass')
      cy.checkToast('класс создан', 'success')
    })

    it('фильтрует по параллели', () => {
      cy.intercept('GET', '**/api/lms/school/classes*grade=5*').as('filterByGrade')
      
      cy.get('[data-testid="grade-filter"]').select('5')
      cy.wait('@filterByGrade')
    })

    it('переходит к ученикам класса', () => {
      cy.intercept('GET', '**/api/lms/school/classes*', {
        body: [{ id: 1, name: '5А', grade: 5 }],
      }).as('getClasses')
      
      cy.wait('@getClasses')
      cy.contains('5А').click()
      cy.url().should('include', '/lms/classes/1')
    })
  })

  describe('Ученики', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/lms/school/classes/1/students', {
        body: [
          { id: 'st-1', firstName: 'Иван', lastName: 'Иванов', classId: 1 },
          { id: 'st-2', firstName: 'Мария', lastName: 'Петрова', classId: 1 },
        ],
      }).as('getStudents')
      
      cy.visit('/lms/classes/1/students')
      cy.waitForPageLoad()
      cy.wait('@getStudents')
    })

    it('отображает список учеников класса', () => {
      cy.contains('Иван Иванов').should('be.visible')
      cy.contains('Мария Петрова').should('be.visible')
    })

    it('добавляет нового ученика', () => {
      cy.intercept('POST', '**/api/lms/school/students', {
        statusCode: 201,
        body: { id: 'st-3', firstName: 'Пётр', lastName: 'Сидоров' },
      }).as('createStudent')

      cy.contains('button', /добавить ученика/i).click()
      cy.get('[name="firstName"]').type('Пётр')
      cy.get('[name="lastName"]').type('Сидоров')
      cy.contains('button', /сохранить/i).click()

      cy.wait('@createStudent')
      cy.checkToast('ученик добавлен', 'success')
    })

    it('редактирует данные ученика', () => {
      cy.intercept('PUT', '**/api/lms/school/students/*', {
        statusCode: 200,
        body: { id: 'st-1', firstName: 'Иван', lastName: 'Иванович' },
      }).as('updateStudent')

      cy.contains('Иван Иванов').parent().find('[data-testid="edit-button"]').click()
      cy.get('[name="lastName"]').clear().type('Иванович')
      cy.contains('button', /сохранить/i).click()

      cy.wait('@updateStudent')
    })
  })

  describe('Расписание', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/lms/school/schedule*', {
        body: [
          { id: 'sch-1', classId: 1, subjectId: 'subj-1', dayOfWeek: 1, startTime: '08:00', endTime: '08:45', room: '101' },
          { id: 'sch-2', classId: 1, subjectId: 'subj-2', dayOfWeek: 1, startTime: '09:00', endTime: '09:45', room: '102' },
        ],
      }).as('getSchedule')
      
      cy.visit('/lms/schedule')
      cy.waitForPageLoad()
      cy.wait('@getSchedule')
    })

    it('отображает расписание в виде таблицы', () => {
      cy.get('table').should('exist')
      cy.contains('Понедельник').should('be.visible')
    })

    it('добавляет урок в расписание', () => {
      cy.intercept('POST', '**/api/lms/school/schedule', {
        statusCode: 201,
        body: { id: 'sch-3' },
      }).as('createScheduleItem')

      cy.contains('button', /добавить урок/i).click()
      cy.get('[name="dayOfWeek"]').select('2') // Вторник
      cy.get('[name="startTime"]').type('10:00')
      cy.get('[name="endTime"]').type('10:45')
      cy.contains('button', /сохранить/i).click()

      cy.wait('@createScheduleItem')
    })

    it('фильтрует расписание по классу', () => {
      cy.intercept('GET', '**/api/lms/school/schedule*classId=1*').as('filterSchedule')
      
      cy.get('[data-testid="class-filter"]').select('5А')
      cy.wait('@filterSchedule')
    })

    it('фильтрует расписание по учителю', () => {
      cy.intercept('GET', '**/api/lms/school/schedule*teacherId=1*').as('filterSchedule')
      
      cy.get('[data-testid="teacher-filter"]').select('Иванов И.И.')
      cy.wait('@filterSchedule')
    })
  })

  describe('Журнал оценок', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/lms/school/gradebook/*/*', {
        body: {
          students: [
            { id: 'st-1', firstName: 'Иван', lastName: 'Иванов' },
          ],
          grades: [
            { id: 'g-1', studentId: 'st-1', value: 5, date: '2024-10-15', type: 'homework' },
          ],
          dates: ['2024-10-15', '2024-10-16'],
        },
      }).as('getGradebook')
      
      cy.visit('/lms/gradebook/1/subj-1')
      cy.waitForPageLoad()
      cy.wait('@getGradebook')
    })

    it('отображает журнал оценок', () => {
      cy.get('table').should('exist')
      cy.contains('Иван Иванов').should('be.visible')
    })

    it('ставит оценку ученику', () => {
      cy.intercept('POST', '**/api/lms/school/grades', {
        statusCode: 201,
        body: { id: 'g-2', value: 4 },
      }).as('createGrade')

      cy.get('[data-testid="grade-cell"]').first().click()
      cy.get('[data-testid="grade-input"]').type('4')
      cy.get('[data-testid="grade-input"]').blur()

      cy.wait('@createGrade')
    })

    it('редактирует существующую оценку', () => {
      cy.intercept('PUT', '**/api/lms/school/grades/*', {
        statusCode: 200,
        body: { id: 'g-1', value: 4 },
      }).as('updateGrade')

      cy.contains('5').click()
      cy.get('[data-testid="grade-input"]').clear().type('4')
      cy.get('[data-testid="grade-input"]').blur()

      cy.wait('@updateGrade')
    })

    it('показывает типы оценок', () => {
      cy.get('[data-testid="grade-type-legend"]').should('exist')
      cy.contains(/homework|дз/i).should('exist')
    })
  })

  describe('Домашние задания', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/lms/school/homework*', {
        body: [
          { id: 'hw-1', title: 'Задание 1', classId: 1, subjectId: 'subj-1', dueDate: '2024-10-20', maxPoints: 10 },
        ],
      }).as('getHomework')
      
      cy.visit('/lms/homework')
      cy.waitForPageLoad()
      cy.wait('@getHomework')
    })

    it('отображает список домашних заданий', () => {
      cy.contains('Задание 1').should('be.visible')
    })

    it('создаёт домашнее задание', () => {
      cy.intercept('POST', '**/api/lms/school/homework', {
        statusCode: 201,
        body: { id: 'hw-2', title: 'Новое задание' },
      }).as('createHomework')

      cy.contains('button', /добавить задание/i).click()
      cy.get('[name="title"]').type('Упражнение 5.2')
      cy.get('[name="description"]').type('Решить задачи 1-10')
      cy.get('[name="dueDate"]').type('2024-10-25')
      cy.contains('button', /сохранить/i).click()

      cy.wait('@createHomework')
    })

    it('просматривает сдачи задания', () => {
      cy.intercept('GET', '**/api/lms/school/homework/hw-1/submissions', {
        body: [
          { id: 'sub-1', studentId: 'st-1', submittedAt: '2024-10-19', points: null },
        ],
      }).as('getSubmissions')

      cy.contains('Задание 1').click()
      cy.wait('@getSubmissions')
      cy.contains('Сдачи').should('be.visible')
    })

    it('оценивает сдачу', () => {
      cy.intercept('GET', '**/api/lms/school/homework/hw-1/submissions', {
        body: [
          { id: 'sub-1', studentId: 'st-1', submittedAt: '2024-10-19', points: null },
        ],
      }).as('getSubmissions')
      cy.intercept('PUT', '**/api/lms/school/homework/submissions/*/grade', {
        statusCode: 200,
        body: { id: 'sub-1', points: 8 },
      }).as('gradeSubmission')

      cy.contains('Задание 1').click()
      cy.wait('@getSubmissions')
      cy.get('[data-testid="grade-submission-button"]').first().click()
      cy.get('[name="points"]').type('8')
      cy.get('[name="feedback"]').type('Хорошая работа!')
      cy.contains('button', /оценить/i).click()

      cy.wait('@gradeSubmission')
    })
  })

  describe('Посещаемость', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/lms/school/attendance*', {
        body: [
          { id: 'att-1', studentId: 'st-1', date: '2024-10-15', status: 'present' },
        ],
      }).as('getAttendance')
      
      cy.visit('/lms/attendance')
      cy.waitForPageLoad()
      cy.wait('@getAttendance')
    })

    it('отображает таблицу посещаемости', () => {
      cy.get('table').should('exist')
    })

    it('отмечает посещаемость', () => {
      cy.intercept('POST', '**/api/lms/school/attendance/bulk', {
        statusCode: 200,
        body: [],
      }).as('recordAttendance')

      cy.get('[data-testid="attendance-checkbox"]').first().click()
      cy.contains('button', /сохранить/i).click()

      cy.wait('@recordAttendance')
    })

    it('фильтрует по дате', () => {
      cy.intercept('GET', '**/api/lms/school/attendance*date=2024-10-16*').as('filterAttendance')
      
      cy.get('[data-testid="date-picker"]').type('2024-10-16')
      cy.wait('@filterAttendance')
    })
  })

  describe('Предметы', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/lms/school/subjects', {
        body: [
          { id: 'subj-1', name: 'Математика', hoursPerWeek: 5 },
          { id: 'subj-2', name: 'Русский язык', hoursPerWeek: 4 },
        ],
      }).as('getSubjects')
      
      cy.visit('/lms/subjects')
      cy.waitForPageLoad()
      cy.wait('@getSubjects')
    })

    it('отображает список предметов', () => {
      cy.contains('Математика').should('be.visible')
      cy.contains('Русский язык').should('be.visible')
    })

    it('создаёт новый предмет', () => {
      cy.intercept('POST', '**/api/lms/school/subjects', {
        statusCode: 201,
        body: { id: 'subj-3', name: 'Физика' },
      }).as('createSubject')

      cy.contains('button', /добавить предмет/i).click()
      cy.get('[name="name"]').type('Физика')
      cy.get('[name="hoursPerWeek"]').type('3')
      cy.contains('button', /сохранить/i).click()

      cy.wait('@createSubject')
    })
  })

  describe('Объявления', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/lms/school/announcements*', {
        body: [
          { id: 'ann-1', title: 'Родительское собрание', content: 'В пятницу в 18:00', isPinned: true },
        ],
      }).as('getAnnouncements')
      
      cy.visit('/lms/announcements')
      cy.waitForPageLoad()
      cy.wait('@getAnnouncements')
    })

    it('отображает объявления', () => {
      cy.contains('Родительское собрание').should('be.visible')
    })

    it('создаёт новое объявление', () => {
      cy.intercept('POST', '**/api/lms/school/announcements', {
        statusCode: 201,
        body: { id: 'ann-2', title: 'Новое объявление' },
      }).as('createAnnouncement')

      cy.contains('button', /добавить объявление/i).click()
      cy.get('[name="title"]').type('Важное объявление')
      cy.get('[name="content"]').type('Текст объявления')
      cy.contains('button', /опубликовать/i).click()

      cy.wait('@createAnnouncement')
    })

    it('закрепляет объявление', () => {
      cy.intercept('PUT', '**/api/lms/school/announcements/*', {
        statusCode: 200,
        body: { id: 'ann-1', isPinned: true },
      }).as('pinAnnouncement')

      cy.get('[data-testid="pin-button"]').first().click()
      cy.wait('@pinAnnouncement')
    })
  })

  describe('Статистика', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/lms/school/school-stats', {
        body: {
          totalStudents: 500,
          totalClasses: 20,
          totalTeachers: 30,
          averageAttendance: 95.5,
        },
      }).as('getStats')
      
      cy.visit('/lms/dashboard')
      cy.waitForPageLoad()
      cy.wait('@getStats')
    })

    it('отображает общую статистику', () => {
      cy.contains('500').should('be.visible') // Ученики
      cy.contains('20').should('be.visible')  // Классы
      cy.contains('95.5').should('be.visible') // Посещаемость
    })
  })
})
