/// <reference types="cypress" />

type UsersFixture = {
  valid: { username: string; password: string }
  director: { username: string; password: string }
}

describe('Navigation & Menu', () => {
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

  describe('Sidebar Navigation', () => {
    it('displays all main navigation items', () => {
      cy.visit('/dashboard')
      cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')

      // Проверяем наличие основных пунктов меню
      const menuItems = [
        'Дашборд',
        'Дети',
        'Сотрудники',
        'Группы',
      ]

      menuItems.forEach((item) => {
        cy.contains('a, button, [role="menuitem"]', item).should('exist')
      })
    })

    it('navigates to children page from sidebar', () => {
      cy.visit('/dashboard')
      cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')

      cy.contains('a, button', 'Дети').click()
      cy.url().should('include', '/children')
    })

    it('navigates to employees page from sidebar', () => {
      cy.visit('/dashboard')
      cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')

      cy.contains('a, button', 'Сотрудники').click()
      cy.url().should('include', '/employees')
    })

    it('navigates to groups page from sidebar', () => {
      cy.visit('/dashboard')
      cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')

      cy.contains('a, button', 'Группы').click()
      cy.url().should('include', '/groups')
    })

    it('highlights active navigation item', () => {
      cy.visit('/children')
      cy.contains('Управление контингентом детей', { timeout: 20000 }).should('be.visible')

      // Проверяем что пункт меню "Дети" активен
      cy.contains('a, button', 'Дети')
        .should('have.class', 'active')
        .or('have.class', 'bg-')
        .or('have.attr', 'aria-current', 'page')
    })
  })

  describe('Breadcrumb Navigation', () => {
    it('shows breadcrumb on nested pages', () => {
      cy.visit('/children')
      cy.contains('Управление контингентом детей', { timeout: 20000 }).should('be.visible')

      // Проверяем наличие хлебных крошек или заголовка страницы
      cy.contains(/Дети|Контингент/i).should('exist')
    })
  })

  describe('Responsive Navigation', () => {
    it('works on mobile viewport', () => {
      cy.viewport('iphone-x')
      cy.visit('/dashboard')
      cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')

      // Проверяем что меню доступно (возможно через бургер-меню)
      cy.get('button[aria-label*="menu"], [data-testid="mobile-menu"], .hamburger')
        .should('exist')
    })

    it('opens mobile menu on click', () => {
      cy.viewport('iphone-x')
      cy.visit('/dashboard')
      cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')

      cy.get('button[aria-label*="menu"], [data-testid="mobile-menu"], .hamburger')
        .first()
        .click()

      // Проверяем что меню открылось
      cy.get('nav, aside, [role="navigation"]').should('be.visible')
    })
  })
})

describe('User Profile & Settings', () => {
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

  it('displays user info in header', () => {
    cy.visit('/dashboard')
    cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')

    // Проверяем отображение информации о пользователе
    cy.get('header, [data-testid="user-menu"], .user-info')
      .should('exist')
  })

  it('logout button is accessible', () => {
    cy.visit('/dashboard')
    cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')

    // Проверяем наличие кнопки выхода
    cy.contains('button, a', /Выход|Logout/i).should('exist')
  })
})

describe('Quick Actions', () => {
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

  it('allows quick navigation from dashboard', () => {
    cy.visit('/dashboard')
    cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')

    // Проверяем наличие быстрых действий или виджетов
    cy.get('.card, .widget, [data-testid*="quick"]').should('have.length.at.least', 1)
  })
})

describe('Keyboard Navigation', () => {
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

  it('supports Tab navigation', () => {
    cy.visit('/dashboard')
    cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')

    // Начинаем навигацию с Tab
    cy.get('body').tab()
    
    // Проверяем что фокус перемещается
    cy.focused().should('exist')
  })

  it('supports Escape to close modals', () => {
    cy.visit('/children')
    cy.contains('Управление контингентом детей', { timeout: 20000 }).should('be.visible')

    // Открываем модальное окно
    cy.contains('Добавить ребенка', { timeout: 15000 }).click()
    
    // Проверяем что модалка открылась
    cy.get('[role="dialog"], .modal, [data-testid="modal"]').should('be.visible')

    // Закрываем по Escape
    cy.get('body').type('{esc}')
    
    // Проверяем что модалка закрылась
    cy.get('[role="dialog"], .modal, [data-testid="modal"]').should('not.exist')
  })
})

export {}
