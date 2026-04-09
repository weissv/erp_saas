// cypress/e2e/finance.cy.ts
// E2E тесты для модуля финансов

describe('Модуль Финансов', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.loginViaAPI(users.valid.username, users.valid.password)
    })
    cy.visit('/finance')
    cy.waitForPageLoad()
  })

  describe('Отображение страницы', () => {
    it('показывает заголовок страницы', () => {
      cy.contains('Финансы').should('be.visible')
    })

    it('отображает фильтры', () => {
      cy.get('[data-testid="date-filter"]').should('exist')
    })

    it('отображает таблицу транзакций', () => {
      cy.get('table').should('exist')
      cy.get('th').should('have.length.at.least', 3)
    })

    it('показывает кнопку добавления записи', () => {
      cy.contains('button', /добавить|создать/i).should('be.visible')
    })
  })

  describe('Фильтрация данных', () => {
    it('фильтрует по типу (доход/расход)', () => {
      cy.intercept('GET', '**/api/finance*').as('getFinance')
      
      cy.get('[data-testid="type-filter"]').click()
      cy.contains('Доход').click()
      
      cy.wait('@getFinance')
      cy.get('table tbody tr').should('have.length.at.least', 0)
    })

    it('фильтрует по категории', () => {
      cy.intercept('GET', '**/api/finance*').as('getFinance')
      
      cy.get('[data-testid="category-filter"]').click()
      cy.contains('Оплата').click()
      
      cy.wait('@getFinance')
    })

    it('фильтрует по диапазону дат', () => {
      cy.intercept('GET', '**/api/finance*').as('getFinance')
      
      cy.get('[data-testid="date-range-picker"]').click()
      // Выбираем даты
      cy.get('[data-testid="start-date"]').type('2024-10-01')
      cy.get('[data-testid="end-date"]').type('2024-10-31')
      cy.contains('Применить').click()
      
      cy.wait('@getFinance')
    })
  })

  describe('Создание финансовой записи', () => {
    it('открывает модальное окно создания', () => {
      cy.contains('button', /добавить|создать/i).click()
      cy.get('[role="dialog"]').should('be.visible')
    })

    it('создаёт запись дохода', () => {
      cy.intercept('POST', '**/api/finance', {
        statusCode: 201,
        body: { id: 'new-1', type: 'INCOME', amount: 50000 },
      }).as('createFinance')

      cy.contains('button', /добавить|создать/i).click()
      
      cy.fillForm({
        type: 'INCOME',
        category: 'tuition',
        amount: '50000',
        description: 'Тестовый доход',
      })
      
      cy.contains('button', /сохранить|создать/i).click()
      cy.wait('@createFinance')
      cy.checkToast('успешно', 'success')
    })

    it('создаёт запись расхода', () => {
      cy.intercept('POST', '**/api/finance', {
        statusCode: 201,
        body: { id: 'new-2', type: 'EXPENSE', amount: 15000 },
      }).as('createFinance')

      cy.contains('button', /добавить|создать/i).click()
      
      cy.fillForm({
        type: 'EXPENSE',
        category: 'supplies',
        amount: '15000',
        description: 'Закупка материалов',
      })
      
      cy.contains('button', /сохранить|создать/i).click()
      cy.wait('@createFinance')
    })

    it('валидирует обязательные поля', () => {
      cy.contains('button', /добавить|создать/i).click()
      cy.contains('button', /сохранить|создать/i).click()
      
      cy.contains(/обязательн|required/i).should('be.visible')
    })

    it('валидирует формат суммы', () => {
      cy.contains('button', /добавить|создать/i).click()
      
      cy.get('[name="amount"]').type('abc')
      cy.contains('button', /сохранить|создать/i).click()
      
      cy.contains(/число|invalid/i).should('be.visible')
    })
  })

  describe('Редактирование записи', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/finance*', {
        body: {
          items: [
            { id: '1', type: 'INCOME', category: 'tuition', amount: 50000, description: 'Оплата' },
          ],
          total: 1,
        },
      }).as('getFinance')
      cy.wait('@getFinance')
    })

    it('открывает запись для редактирования', () => {
      cy.get('table tbody tr').first().find('[data-testid="edit-button"]').click()
      cy.get('[role="dialog"]').should('be.visible')
      cy.get('[name="amount"]').should('have.value', '50000')
    })

    it('сохраняет изменения', () => {
      cy.intercept('PUT', '**/api/finance/*', {
        statusCode: 200,
        body: { id: '1', amount: 55000 },
      }).as('updateFinance')

      cy.get('table tbody tr').first().find('[data-testid="edit-button"]').click()
      cy.get('[name="amount"]').clear().type('55000')
      cy.contains('button', /сохранить/i).click()

      cy.wait('@updateFinance')
      cy.checkToast('обновлен', 'success')
    })
  })

  describe('Удаление записи', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/finance*', {
        body: {
          items: [
            { id: '1', type: 'EXPENSE', category: 'other', amount: 1000, description: 'Тест' },
          ],
          total: 1,
        },
      }).as('getFinance')
      cy.wait('@getFinance')
    })

    it('показывает подтверждение удаления', () => {
      cy.get('table tbody tr').first().find('[data-testid="delete-button"]').click()
      cy.contains(/удалить|уверены/i).should('be.visible')
    })

    it('удаляет запись после подтверждения', () => {
      cy.intercept('DELETE', '**/api/finance/*', {
        statusCode: 204,
      }).as('deleteFinance')

      cy.get('table tbody tr').first().find('[data-testid="delete-button"]').click()
      cy.contains('button', /да|удалить|подтвердить/i).click()

      cy.wait('@deleteFinance')
      cy.checkToast('удален', 'success')
    })

    it('отменяет удаление', () => {
      cy.get('table tbody tr').first().find('[data-testid="delete-button"]').click()
      cy.contains('button', /отмена|нет/i).click()
      cy.get('[role="dialog"]').should('not.exist')
    })
  })

  describe('Пагинация', () => {
    beforeEach(() => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        id: `${i + 1}`,
        type: i % 2 === 0 ? 'INCOME' : 'EXPENSE',
        amount: 1000 * (i + 1),
      }))
      
      cy.intercept('GET', '**/api/finance*', {
        body: { items: items.slice(0, 20), total: 50 },
      }).as('getFinance')
      cy.wait('@getFinance')
    })

    it('показывает пагинацию', () => {
      cy.get('[data-testid="pagination"]').should('exist')
    })

    it('переключает страницы', () => {
      cy.intercept('GET', '**/api/finance*page=2*', {
        body: { items: [], total: 50 },
      }).as('getPage2')

      cy.goToNextPage()
      cy.wait('@getPage2')
    })
  })

  describe('Итоговые суммы', () => {
    it('показывает общий доход', () => {
      cy.contains(/общий доход|total income/i).should('exist')
    })

    it('показывает общий расход', () => {
      cy.contains(/общий расход|total expense/i).should('exist')
    })

    it('показывает баланс', () => {
      cy.contains(/баланс|balance/i).should('exist')
    })
  })

  describe('Экспорт данных', () => {
    it('экспортирует в Excel', () => {
      cy.intercept('GET', '**/api/finance/export*', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        body: new Blob(),
      }).as('exportExcel')

      cy.contains('button', /экспорт|export/i).click()
      cy.contains('Excel').click()

      cy.wait('@exportExcel')
    })
  })
})

describe('Финансовая аналитика', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.loginViaAPI(users.director.username, users.director.password)
    })
    cy.visit('/finance')
  })

  it('показывает графики для директора', () => {
    cy.get('[data-testid="finance-chart"]').should('exist')
  })

  it('показывает динамику по месяцам', () => {
    cy.contains(/динамика|trend/i).should('exist')
  })
})
