/// <reference types="cypress" />

type UsersFixture = {
  valid: { username: string; password: string }
  director: { username: string; password: string }
}

describe('SPA Routing resilience', () => {
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

  it('2.1 Reloads deep route without server 404', () => {
    cy.visit('/children')
    cy.url().should('include', '/children')
    cy.contains('Управление контингентом детей', { timeout: 20000 }).should('be.visible')
    cy.contains('Добавить ребенка', { timeout: 15000 }).should('be.visible')
    cy.reload()
    cy.url().should('contain', '/children')
    cy.contains('Добавить ребенка', { timeout: 15000 }).should('be.visible')
  })

  it('2.2 Reloads route with query params (dynamic-like)', () => {
    const targetUrl = '/employees?view=reminders'
    cy.visit(targetUrl)
    cy.url().should('contain', '/employees')
    cy.contains('Управление сотрудниками', { timeout: 20000 }).should('be.visible')
    cy.reload()
    cy.url().should('contain', '/employees')
    cy.contains('Управление сотрудниками', { timeout: 20000 }).should('be.visible')
  })

  it('2.3 Shows client-side 404 for unknown paths', () => {
    cy.visit('/dashboard')
    cy.window().then((win) => {
      win.history.pushState({}, '', '/a/route/that/does/not/exist')
      win.dispatchEvent(new PopStateEvent('popstate'))
    })
    cy.contains('Страница не найдена', { timeout: 10000 }).should('be.visible')
    cy.contains('Вернуться на главную').click()
    cy.url().should('match', /\/dashboard$/)
  })
})

export {}
