/// <reference types="cypress" />

const BACKEND_URL = 'https://mezon-admin.onrender.com'
const TOKEN_STORAGE_KEY = 'auth_token'
const USER_STORAGE_KEY = 'auth_user'

Cypress.Commands.add('loginViaUI', (username: string, password: string) => {
  cy.session([username, password, 'ui'], () => {
    cy.visit('/auth/login')
    cy.get('input#login').clear().type(username)
    cy.get('input#password').clear().type(password, { log: false })
    cy.contains('button', /^Войти$/).click()
    cy.url().should('match', /\/dashboard$/)
    cy.contains('Дашборд', { timeout: 15000 }).should('be.visible')
    cy.window({ log: false }).then((win) => {
      const token = win.localStorage.getItem(TOKEN_STORAGE_KEY)
      if (token) {
        Cypress.env('authToken', token)
      }
      const storedUser = win.localStorage.getItem(USER_STORAGE_KEY)
      if (storedUser) {
        try {
          Cypress.env('authUser', JSON.parse(storedUser))
        } catch (error) {
          Cypress.env('authUser', null)
        }
      }
    })
  })
})

Cypress.Commands.add('loginViaAPI', (username: string, password: string) => {
  cy.session([username, password, 'api'], () => {
    cy.request({
      url: `${BACKEND_URL}/api/auth/login`,
      method: 'POST',
      body: { login: username, password },
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://erp.mezon.uz',
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('user')
      const token = response.body?.token
      const user = response.body?.user
      if (token) {
        Cypress.env('authToken', token)
      }
      cy.visit('/', {
        onBeforeLoad(win) {
          if (token) {
            win.localStorage.setItem(TOKEN_STORAGE_KEY, token)
          }
          if (user) {
            win.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
          } else {
            win.localStorage.removeItem(USER_STORAGE_KEY)
          }
        },
      })
      cy.window({ log: false }).then((win) => {
        const stored = win.localStorage.getItem(TOKEN_STORAGE_KEY)
        if (token) {
          expect(stored, 'token saved to localStorage').to.eq(token)
        }
        if (user) {
          const storedUser = win.localStorage.getItem(USER_STORAGE_KEY)
          expect(storedUser, 'user saved to localStorage').to.be.a('string')
        }
        if (user) {
          const storedUser = win.localStorage.getItem(USER_STORAGE_KEY)
          expect(storedUser, 'user saved to localStorage').to.be.a('string')
        }
      })
    })
  })
})

Cypress.Commands.add('logoutViaUI', () => {
  cy.contains('button, a', /Выход|Logout/i).click({ force: true })
  cy.url().should('include', '/auth/login')
  cy.window({ log: false }).then((win) => {
    expect(win.localStorage.getItem(TOKEN_STORAGE_KEY)).to.be.null
    expect(win.localStorage.getItem(USER_STORAGE_KEY)).to.be.null
  })
  Cypress.env('authToken', null)
  Cypress.env('authUser', null)
})

/**
 * Ожидает загрузку страницы
 */
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('[data-loading="true"], .loading, .spinner', { timeout: 1000 })
    .should('not.exist')
  cy.get('body').should('not.have.class', 'loading')
})

/**
 * Проверяет наличие toast-уведомления
 */
Cypress.Commands.add('checkToast', (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  cy.get('[data-sonner-toast], .toast, [role="alert"]', { timeout: 10000 })
    .should('be.visible')
    .and('contain.text', message)
})

/**
 * Заполняет форму из объекта
 */
Cypress.Commands.add('fillForm', (formData: Record<string, string | number | boolean>) => {
  Object.entries(formData).forEach(([name, value]) => {
    const input = cy.get(`input[name="${name}"], select[name="${name}"], textarea[name="${name}"]`)
    
    if (typeof value === 'boolean') {
      if (value) {
        input.check({ force: true })
      } else {
        input.uncheck({ force: true })
      }
    } else {
      input.clear().type(String(value))
    }
  })
})

/**
 * Ожидает завершение API запроса
 */
Cypress.Commands.add('waitForApi', (alias: string, timeout = 30000) => {
  cy.wait(`@${alias}`, { timeout }).its('response.statusCode').should('be.oneOf', [200, 201, 204])
})

/**
 * Делает скриншот с описанием
 */
Cypress.Commands.add('screenshot', (name: string) => {
  cy.screenshot(name, { capture: 'viewport' })
})

/**
 * Проверяет доступность таблицы данных
 */
Cypress.Commands.add('checkDataTable', () => {
  cy.get('table').should('exist')
  cy.get('thead').should('exist')
  cy.get('tbody').should('exist')
})

/**
 * Пагинация таблицы - следующая страница
 */
Cypress.Commands.add('goToNextPage', () => {
  cy.contains('button', /Вперёд|Next|→/i).click()
})

/**
 * Пагинация таблицы - предыдущая страница
 */
Cypress.Commands.add('goToPrevPage', () => {
  cy.contains('button', /Назад|Previous|←/i).click()
})

/**
 * Ожидает загрузку данных в таблице
 */
Cypress.Commands.add('waitForTableData', () => {
  cy.get('tbody tr', { timeout: 20000 }).should('have.length.at.least', 1)
})

/**
 * Проверяет что модальное окно открыто
 */
Cypress.Commands.add('checkModalOpen', () => {
  cy.get('[role="dialog"], .modal, [data-testid="modal"]').should('be.visible')
})

/**
 * Закрывает модальное окно
 */
Cypress.Commands.add('closeModal', () => {
  cy.get('body').type('{esc}')
  cy.get('[role="dialog"], .modal, [data-testid="modal"]').should('not.exist')
})

declare global {
  namespace Cypress {
    interface Chainable {
      loginViaUI(username: string, password: string): Chainable<void>
      loginViaAPI(username: string, password: string): Chainable<void>
      logoutViaUI(): Chainable<void>
      waitForPageLoad(): Chainable<void>
      checkToast(message: string, type?: 'success' | 'error' | 'info'): Chainable<void>
      fillForm(formData: Record<string, string | number | boolean>): Chainable<void>
      waitForApi(alias: string, timeout?: number): Chainable<void>
      checkDataTable(): Chainable<void>
      goToNextPage(): Chainable<void>
      goToPrevPage(): Chainable<void>
      waitForTableData(): Chainable<void>
      checkModalOpen(): Chainable<void>
      closeModal(): Chainable<void>
    }
  }
}

export {}
