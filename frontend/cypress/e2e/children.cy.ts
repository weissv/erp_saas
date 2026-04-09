/// <reference types="cypress" />

type UsersFixture = {
  valid: { username: string; password: string }
  director: { username: string; password: string }
}

const API_ORIGIN = 'https://erp.mezon.uz'

const buildAuthHeaders = () => {
  const token = Cypress.env('authToken') as string | null | undefined
  const headers: Record<string, string> = { Origin: API_ORIGIN }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

describe('Children CRUD regression', () => {
  const BACKEND_URL = 'https://mezon-admin.onrender.com'
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

  it('3.1 Creates, reads and deletes a child record', () => {
    const stamp = Date.now()
    const firstName = `Тест-${stamp}`
    const lastName = `Ребенок-${stamp}`

    cy.visit('/children')
  cy.url().should('include', '/children')
  cy.contains('Управление контингентом детей', { timeout: 20000 }).should('be.visible')
  cy.contains('Добавить ребенка', { timeout: 15000 }).click()

    cy.get('input[name="firstName"]').clear().type(firstName)
    cy.get('input[name="lastName"]').clear().type(lastName)
    cy.get('input[name="birthDate"]').type('2015-01-01')
    cy.get('input[name="groupId"]').clear().type('1')
    cy.intercept('POST', '**/api/children').as('createChild')
    cy.contains('button', /^Сохранить$/).click()

    cy.wait('@createChild').then(({ response }) => {
      expect(response?.statusCode, 'create child response status').to.eq(201)
    })

    cy.get('input[placeholder="Поиск по фамилии..."]').clear().type(lastName)
    cy.contains('td', lastName, { timeout: 20000 }).should('exist')

  cy.request<{ items: Array<{ id: number; lastName: string }> }>({
      url: `${BACKEND_URL}/api/children?lastName=${encodeURIComponent(lastName)}`,
      method: 'GET',
      headers: buildAuthHeaders(),
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200)
      const child = resp.body.items.find((item) => item.lastName === lastName)
      expect(child, 'created child exists in API response').to.exist
      if (!child) {
        return
      }
      cy.request({
        url: `${BACKEND_URL}/api/children/${child.id}`,
        method: 'DELETE',
        headers: buildAuthHeaders(),
        failOnStatusCode: false,
      }).then((deleteResp) => {
        expect([204, 404], 'delete child status').to.include(deleteResp.status)
      })
    })

  cy.reload()
  cy.get('input[placeholder="Поиск по фамилии..."]').clear().type(lastName)
  cy.contains('td', lastName).should('not.exist')
  })
})

export {}
