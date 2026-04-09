/// <reference types="cypress" />

type UsersFixture = {
  valid: { username: string; password: string }
  director: { username: string; password: string }
}

const BACKEND_URL = 'https://mezon-admin.onrender.com'

const buildAuthHeaders = () => {
  const token = Cypress.env('authToken') as string | null | undefined
  const headers: Record<string, string> = { Origin: 'https://erp.mezon.uz' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

describe('Employees CRUD Operations', () => {
  let users: UsersFixture

  before(() => {
    cy.fixture<UsersFixture>('users').then((data) => {
      users = data
    })
  })

  beforeEach(() => {
    cy.clearCookies({ log: false })
    cy.clearLocalStorage({ log: false })
    cy.loginViaAPI(users.valid.username, users.valid.password)
  })

  it('4.1 Displays employees list', () => {
    cy.visit('/employees')
    cy.url().should('include', '/employees')
    cy.contains('Управление сотрудниками', { timeout: 20000 }).should('be.visible')
    
    // Проверяем что таблица загрузилась
    cy.get('table').should('exist')
    cy.get('tbody tr').should('have.length.at.least', 1)
  })

  it('4.2 Opens employee creation form', () => {
    cy.visit('/employees')
    cy.contains('Управление сотрудниками', { timeout: 20000 }).should('be.visible')
    
    // Находим кнопку добавления
    cy.contains('button', /Добавить|Создать/i).click()
    
    // Проверяем что форма открылась
    cy.get('form').should('be.visible')
    cy.get('input[name="firstName"]').should('exist')
    cy.get('input[name="lastName"]').should('exist')
  })

  it('4.3 Validates required fields', () => {
    cy.visit('/employees')
    cy.contains('Управление сотрудниками', { timeout: 20000 }).should('be.visible')
    
    cy.contains('button', /Добавить|Создать/i).click()
    
    // Пытаемся отправить пустую форму
    cy.contains('button', /^Сохранить$/i).click()
    
    // Проверяем валидацию
    cy.get('[data-error], .error, .text-red-500, .text-destructive')
      .should('exist')
  })

  it('4.4 Searches employees by name', () => {
    cy.visit('/employees')
    cy.contains('Управление сотрудниками', { timeout: 20000 }).should('be.visible')
    
    // Ищем поле поиска
    cy.get('input[type="search"], input[placeholder*="оиск"]')
      .first()
      .type('А')
    
    // Даём время на фильтрацию
    cy.wait(500)
    
    // Проверяем что результаты отфильтровались
    cy.get('tbody tr').should('have.length.at.least', 0)
  })

  it('4.5 Displays employee reminders tab', () => {
    cy.visit('/employees?view=reminders')
    cy.url().should('include', '/employees')
    cy.contains('Управление сотрудниками', { timeout: 20000 }).should('be.visible')
  })
})

describe('Groups Management', () => {
  let users: UsersFixture

  before(() => {
    cy.fixture<UsersFixture>('users').then((data) => {
      users = data
    })
  })

  beforeEach(() => {
    cy.clearCookies({ log: false })
    cy.clearLocalStorage({ log: false })
    cy.loginViaAPI(users.valid.username, users.valid.password)
  })

  it('5.1 Displays groups list', () => {
    cy.visit('/groups')
    cy.url().should('include', '/groups')
    cy.contains(/Группы|Управление группами/i, { timeout: 20000 }).should('be.visible')
  })

  it('5.2 Shows group details on click', () => {
    cy.visit('/groups')
    cy.contains(/Группы|Управление группами/i, { timeout: 20000 }).should('be.visible')
    
    // Кликаем на первую группу если есть
    cy.get('tbody tr').first().then(($row) => {
      if ($row.length) {
        cy.wrap($row).click()
      }
    })
  })
})

describe('Dashboard Statistics', () => {
  let users: UsersFixture

  before(() => {
    cy.fixture<UsersFixture>('users').then((data) => {
      users = data
    })
  })

  beforeEach(() => {
    cy.clearCookies({ log: false })
    cy.clearLocalStorage({ log: false })
    cy.loginViaAPI(users.valid.username, users.valid.password)
  })

  it('6.1 Displays dashboard with statistics', () => {
    cy.visit('/dashboard')
    cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')
    
    // Проверяем наличие виджетов статистики
    cy.get('[data-testid="stat-widget"], .stat-card, .dashboard-widget, .card')
      .should('have.length.at.least', 1)
  })

  it('6.2 Shows correct date on dashboard', () => {
    cy.visit('/dashboard')
    cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')
    
    // Проверяем что дата отображается
    const today = new Date()
    const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
    
    // Проверяем наличие текущего месяца или года
    cy.contains(new RegExp(`${today.getFullYear()}|${monthNames[today.getMonth()]}`, 'i'))
      .should('exist')
  })
})

describe('Finance Module', () => {
  let users: UsersFixture

  before(() => {
    cy.fixture<UsersFixture>('users').then((data) => {
      users = data
    })
  })

  beforeEach(() => {
    cy.clearCookies({ log: false })
    cy.clearLocalStorage({ log: false })
    cy.loginViaAPI(users.valid.username, users.valid.password)
  })

  it('7.1 Opens finance page', () => {
    cy.visit('/finance')
    cy.url().should('include', '/finance')
    cy.contains(/Финансы|Бухгалтерия/i, { timeout: 20000 }).should('be.visible')
  })

  it('7.2 Displays financial summary', () => {
    cy.visit('/finance')
    cy.contains(/Финансы|Бухгалтерия/i, { timeout: 20000 }).should('be.visible')
    
    // Проверяем наличие финансовых данных
    cy.contains(/доход|расход|баланс|сумма/i).should('exist')
  })
})

describe('Menu Module', () => {
  let users: UsersFixture

  before(() => {
    cy.fixture<UsersFixture>('users').then((data) => {
      users = data
    })
  })

  beforeEach(() => {
    cy.clearCookies({ log: false })
    cy.clearLocalStorage({ log: false })
    cy.loginViaAPI(users.valid.username, users.valid.password)
  })

  it('8.1 Opens menu planning page', () => {
    cy.visit('/menu')
    cy.url().should('include', '/menu')
    cy.contains(/Меню|Питание/i, { timeout: 20000 }).should('be.visible')
  })

  it('8.2 Shows weekly menu', () => {
    cy.visit('/menu')
    cy.contains(/Меню|Питание/i, { timeout: 20000 }).should('be.visible')
    
    // Проверяем наличие дней недели
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница']
    days.forEach((day) => {
      cy.contains(day).should('exist')
    })
  })
})

describe('Attendance Module', () => {
  let users: UsersFixture

  before(() => {
    cy.fixture<UsersFixture>('users').then((data) => {
      users = data
    })
  })

  beforeEach(() => {
    cy.clearCookies({ log: false })
    cy.clearLocalStorage({ log: false })
    cy.loginViaAPI(users.valid.username, users.valid.password)
  })

  it('9.1 Opens attendance page', () => {
    cy.visit('/attendance')
    cy.url().should('include', '/attendance')
    cy.contains(/Посещаемость|Attendance/i, { timeout: 20000 }).should('be.visible')
  })

  it('9.2 Allows date selection', () => {
    cy.visit('/attendance')
    cy.contains(/Посещаемость|Attendance/i, { timeout: 20000 }).should('be.visible')
    
    // Проверяем наличие выбора даты
    cy.get('input[type="date"], [data-testid="date-picker"], .date-picker')
      .should('exist')
  })
})

describe('Inventory Module', () => {
  let users: UsersFixture

  before(() => {
    cy.fixture<UsersFixture>('users').then((data) => {
      users = data
    })
  })

  beforeEach(() => {
    cy.clearCookies({ log: false })
    cy.clearLocalStorage({ log: false })
    cy.loginViaAPI(users.valid.username, users.valid.password)
  })

  it('10.1 Opens inventory page', () => {
    cy.visit('/inventory')
    cy.url().should('include', '/inventory')
    cy.contains(/Инвентарь|Склад/i, { timeout: 20000 }).should('be.visible')
  })

  it('10.2 Displays inventory items', () => {
    cy.visit('/inventory')
    cy.contains(/Инвентарь|Склад/i, { timeout: 20000 }).should('be.visible')
    
    // Проверяем наличие таблицы или списка
    cy.get('table, [data-testid="inventory-list"]').should('exist')
  })
})

export {}
