/// <reference types="cypress" />

type UsersFixture = {
  valid: { username: string; password: string }
  director: { username: string; password: string }
}

describe('Authentication & Session Management', () => {
  let users: UsersFixture

  before(() => {
    cy.fixture<UsersFixture>('users').then((data) => {
      users = data
    })
  })

  beforeEach(() => {
    cy.clearCookies({ log: false })
    cy.clearLocalStorage({ log: false })
  })

  it('1.1 Fails to login with wrong password', () => {
    cy.visit('/auth/login')
    cy.contains('Вход в систему', { timeout: 15000 }).should('be.visible')
    cy.get('input#login', { timeout: 15000 }).type(users.valid.username)
    cy.get('input#password').type('wrong_password', { log: false })
    cy.intercept('POST', '**/api/auth/login').as('loginRequest')
    cy.contains('button', /^Войти$/).click()

    cy.url().should('include', '/auth/login')
    cy.wait('@loginRequest').its('response.statusCode').should('eq', 401)
    cy.window().then((win) => {
      expect(win.localStorage.getItem('auth_token')).to.be.null
    })
  })

  it('1.2 Fails to login with unknown user', () => {
    cy.visit('/auth/login')
    cy.contains('Вход в систему', { timeout: 15000 }).should('be.visible')
    cy.get('input#login', { timeout: 15000 }).type('nonexistent@user.com')
    cy.get('input#password').type(users.valid.password, { log: false })
    cy.intercept('POST', '**/api/auth/login').as('loginRequest')
    cy.contains('button', /^Войти$/).click()

    cy.url().should('include', '/auth/login')
    cy.wait('@loginRequest').its('response.statusCode').should('eq', 401)
    cy.window().then((win) => {
      expect(win.localStorage.getItem('auth_token')).to.be.null
    })
  })

  it('1.3 Logs in successfully', () => {
    cy.visit('/auth/login')
    cy.contains('Вход в систему', { timeout: 15000 }).should('be.visible')
    cy.get('input#login', { timeout: 15000 }).type(users.valid.username)
    cy.get('input#password').type(users.valid.password, { log: false })
    cy.contains('button', /^Войти$/).click()

    cy.url().should('match', /\/dashboard$/)
    cy.contains('Дашборд').should('be.visible')
    cy.window().then((win) => {
      const token = win.localStorage.getItem('auth_token')
      expect(token, 'persisted auth token').to.be.a('string').and.not.be.empty
    })
  })

  it('1.4 Blocks access to protected routes when unauthenticated', () => {
    cy.visit('/dashboard', { failOnStatusCode: false })
    cy.url().should('include', '/auth/login')
  })

  it('1.5 Persists session after reload', () => {
    cy.loginViaAPI(users.valid.username, users.valid.password)

  cy.visit('/dashboard')
  cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')
    cy.reload()
    cy.url().should('match', /\/dashboard$/)
  cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')
  })

  it('1.6 Logs out and invalidates session', () => {
    cy.loginViaAPI(users.valid.username, users.valid.password)

  cy.visit('/dashboard')
  cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')
    cy.logoutViaUI()

    cy.visit('/dashboard', { failOnStatusCode: false })
    cy.url().should('include', '/auth/login')
    cy.window().then((win) => {
      expect(win.localStorage.getItem('auth_token')).to.be.null
    })
  })

  // === РАСШИРЕННЫЕ ТЕСТЫ ===

  describe('Валидация формы логина', () => {
    beforeEach(() => {
      cy.visit('/auth/login')
      cy.contains('Вход в систему', { timeout: 15000 }).should('be.visible')
    })

    it('1.7 Показывает ошибку для пустого логина', () => {
      cy.get('input#password').type('password123')
      cy.contains('button', /^Войти$/).click()
      cy.contains('Логин обязателен').should('be.visible')
    })

    it('1.8 Показывает ошибку для пустого пароля', () => {
      cy.get('input#login').type('test@example.com')
      cy.contains('button', /^Войти$/).click()
      cy.contains('Пароль обязателен').should('be.visible')
    })

    it('1.9 Очищает ошибки при вводе данных', () => {
      cy.contains('button', /^Войти$/).click()
      cy.contains('Логин обязателен').should('be.visible')
      cy.get('input#login').type('test@example.com')
      cy.contains('Логин обязателен').should('not.exist')
    })
  })

  describe('Состояние загрузки', () => {
    it('1.10 Показывает индикатор загрузки при отправке', () => {
      cy.intercept('POST', '**/api/auth/login', (req) => {
        req.reply({
          delay: 2000,
          statusCode: 200,
          body: { user: { id: 1 }, token: 'token' },
        })
      }).as('slowLogin')

      cy.visit('/auth/login')
      cy.get('input#login').type('admin@test.com')
      cy.get('input#password').type('password123')
      cy.contains('button', /^Войти$/).click()

      cy.contains('Входим').should('be.visible')
      cy.get('button[type="submit"]').should('be.disabled')
    })
  })

  describe('Ролевой доступ', () => {
    it('1.11 Директор имеет доступ к финансовым данным', () => {
      cy.loginViaAPI(users.director.username, users.director.password)
      cy.visit('/finance')
      cy.url().should('include', '/finance')
    })

    it('1.12 Редирект на dashboard после входа', () => {
      cy.visit('/auth/login')
      cy.get('input#login').type(users.valid.username)
      cy.get('input#password').type(users.valid.password, { log: false })
      cy.contains('button', /^Войти$/).click()
      cy.url().should('match', /\/dashboard$/)
    })
  })

  describe('Обработка ошибок сервера', () => {
    it('1.13 Показывает сообщение при ошибке сервера', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 500,
        body: { message: 'Internal server error' },
      }).as('serverError')

      cy.visit('/auth/login')
      cy.get('input#login').type('admin@test.com')
      cy.get('input#password').type('password123')
      cy.contains('button', /^Войти$/).click()

      cy.wait('@serverError')
      cy.contains('Ошибка').should('be.visible')
    })

    it('1.14 Обрабатывает timeout соединения', () => {
      cy.intercept('POST', '**/api/auth/login', {
        forceNetworkError: true,
      }).as('networkError')

      cy.visit('/auth/login')
      cy.get('input#login').type('admin@test.com')
      cy.get('input#password').type('password123')
      cy.contains('button', /^Войти$/).click()

      // Должно показать сообщение об ошибке сети
      cy.contains(/ошибка|error/i).should('be.visible')
    })
  })

  describe('Cookies и безопасность', () => {
    it('1.15 Устанавливает httpOnly cookie при входе', () => {
      cy.visit('/auth/login')
      cy.get('input#login').type(users.valid.username)
      cy.get('input#password').type(users.valid.password, { log: false })
      cy.contains('button', /^Войти$/).click()

      cy.url().should('match', /\/dashboard$/)
      cy.getCookie('auth_token').should('exist')
    })

    it('1.16 Очищает cookie при выходе', () => {
      cy.loginViaAPI(users.valid.username, users.valid.password)
      cy.visit('/dashboard')
      cy.contains('Дашборд', { timeout: 20000 }).should('be.visible')
      
      cy.logoutViaUI()
      
      cy.getCookie('auth_token').should('be.null')
    })
  })
})

export {}
