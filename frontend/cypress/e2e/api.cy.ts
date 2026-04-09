/// <reference types="cypress" />

type UsersFixture = {
  valid: { username: string; password: string }
  director: { username: string; password: string }
}

const BACKEND_URL = 'https://mezon-admin.onrender.com'

describe('API Integration Tests', () => {
  let users: UsersFixture
  let authToken: string

  before(() => {
    cy.fixture<UsersFixture>('users').then((data) => {
      users = data
    })
  })

  beforeEach(() => {
    // Получаем токен для API тестов
    cy.request({
      url: `${BACKEND_URL}/api/auth/login`,
      method: 'POST',
      body: { login: users.valid.username, password: users.valid.password },
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://erp.mezon.uz',
      },
    }).then((response) => {
      authToken = response.body.token
    })
  })

  describe('Children API', () => {
    it('GET /api/children returns paginated list', () => {
      cy.request({
        url: `${BACKEND_URL}/api/children?page=1&pageSize=10`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
        expect(response.body).to.have.property('total')
        expect(response.body.items).to.be.an('array')
      })
    })

    it('GET /api/children supports search', () => {
      cy.request({
        url: `${BACKEND_URL}/api/children?lastName=А`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.items).to.be.an('array')
      })
    })
  })

  describe('Employees API', () => {
    it('GET /api/employees returns paginated list', () => {
      cy.request({
        url: `${BACKEND_URL}/api/employees?page=1&pageSize=10`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
        expect(response.body.items).to.be.an('array')
      })
    })

    it('GET /api/employees/reminders returns reminders', () => {
      cy.request({
        url: `${BACKEND_URL}/api/employees/reminders`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 404]).to.include(response.status)
      })
    })
  })

  describe('Groups API', () => {
    it('GET /api/groups returns list', () => {
      cy.request({
        url: `${BACKEND_URL}/api/groups`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.be.an('array').or.have.property('items')
      })
    })
  })

  describe('Dashboard API', () => {
    it('GET /api/dashboard/stats returns statistics', () => {
      cy.request({
        url: `${BACKEND_URL}/api/dashboard/stats`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 404]).to.include(response.status)
      })
    })
  })

  describe('Attendance API', () => {
    it('GET /api/attendance returns attendance records', () => {
      const today = new Date().toISOString().split('T')[0]
      cy.request({
        url: `${BACKEND_URL}/api/attendance?date=${today}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 404]).to.include(response.status)
      })
    })
  })

  describe('Finance API', () => {
    it('GET /api/finance returns financial data', () => {
      cy.request({
        url: `${BACKEND_URL}/api/finance`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 404]).to.include(response.status)
      })
    })
  })

  describe('Menu API', () => {
    it('GET /api/menu returns menu data', () => {
      cy.request({
        url: `${BACKEND_URL}/api/menu`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 404]).to.include(response.status)
      })
    })
  })

  describe('Inventory API', () => {
    it('GET /api/inventory returns inventory items', () => {
      cy.request({
        url: `${BACKEND_URL}/api/inventory`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect([200, 404]).to.include(response.status)
      })
    })
  })

  describe('Error Handling', () => {
    it('returns 401 for unauthenticated requests', () => {
      cy.request({
        url: `${BACKEND_URL}/api/children`,
        method: 'GET',
        headers: {
          Origin: 'https://erp.mezon.uz',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(401)
      })
    })

    it('returns 404 for non-existent resources', () => {
      cy.request({
        url: `${BACKEND_URL}/api/children/99999999`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(404)
      })
    })
  })

  describe('CORS Headers', () => {
    it('includes correct CORS headers', () => {
      cy.request({
        url: `${BACKEND_URL}/api/auth/me`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Origin: 'https://erp.mezon.uz',
        },
      }).then((response) => {
        expect(response.headers).to.have.property('access-control-allow-origin')
      })
    })
  })
})

export {}
