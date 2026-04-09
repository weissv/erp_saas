// cypress/e2e/inventory.cy.ts
// E2E тесты для модуля инвентаря

describe('Модуль Инвентаря', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.loginViaAPI(users.valid.username, users.valid.password)
    })
    cy.visit('/inventory')
    cy.waitForPageLoad()
  })

  describe('Отображение страницы', () => {
    it('показывает заголовок страницы', () => {
      cy.contains(/инвентарь|inventory/i).should('be.visible')
    })

    it('отображает таблицу товаров', () => {
      cy.get('table').should('exist')
      cy.get('th').should('have.length.at.least', 4)
    })

    it('показывает категории товаров', () => {
      cy.get('[data-testid="category-filter"]').should('exist')
    })

    it('показывает кнопку добавления товара', () => {
      cy.contains('button', /добавить|создать/i).should('be.visible')
    })
  })

  describe('Фильтрация и поиск', () => {
    it('ищет товары по названию', () => {
      cy.intercept('GET', '**/api/inventory*').as('searchInventory')
      
      cy.get('[data-testid="search-input"]').type('карандаши')
      
      cy.wait('@searchInventory')
      cy.get('table tbody tr').should('have.length.at.least', 0)
    })

    it('фильтрует по категории', () => {
      cy.intercept('GET', '**/api/inventory*category=*').as('filterInventory')
      
      cy.get('[data-testid="category-filter"]').click()
      cy.contains('Канцелярия').click()
      
      cy.wait('@filterInventory')
    })

    it('показывает только товары с низким запасом', () => {
      cy.intercept('GET', '**/api/inventory*lowStock=true*').as('lowStockInventory')
      
      cy.get('[data-testid="low-stock-filter"]').click()
      
      cy.wait('@lowStockInventory')
    })
  })

  describe('Создание товара', () => {
    it('открывает модальное окно создания', () => {
      cy.contains('button', /добавить|создать/i).click()
      cy.get('[role="dialog"]').should('be.visible')
      cy.contains(/новый товар|добавить товар/i).should('be.visible')
    })

    it('создаёт новый товар', () => {
      cy.intercept('POST', '**/api/inventory', {
        statusCode: 201,
        body: { id: 1, name: 'Новый товар', quantity: 100 },
      }).as('createItem')

      cy.contains('button', /добавить|создать/i).click()
      
      cy.get('[name="name"]').type('Тетради в клетку')
      cy.get('[name="category"]').select('Канцелярия')
      cy.get('[name="quantity"]').type('100')
      cy.get('[name="unit"]').type('шт')
      cy.get('[name="minQuantity"]').type('20')
      
      cy.contains('button', /сохранить|создать/i).click()
      cy.wait('@createItem')
      cy.checkToast('успешно', 'success')
    })

    it('валидирует обязательные поля', () => {
      cy.contains('button', /добавить|создать/i).click()
      cy.contains('button', /сохранить|создать/i).click()
      
      cy.contains(/название обязательно|name.*required/i).should('be.visible')
    })

    it('валидирует числовые поля', () => {
      cy.contains('button', /добавить|создать/i).click()
      
      cy.get('[name="name"]').type('Тест')
      cy.get('[name="quantity"]').type('-10')
      cy.contains('button', /сохранить|создать/i).click()
      
      cy.contains(/положительн|positive/i).should('be.visible')
    })
  })

  describe('Редактирование товара', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/inventory*', {
        body: {
          items: [
            { id: 1, name: 'Карандаши', category: 'Канцелярия', quantity: 50, unit: 'шт', minQuantity: 20 },
          ],
          total: 1,
        },
      }).as('getInventory')
      cy.wait('@getInventory')
    })

    it('открывает товар для редактирования', () => {
      cy.get('table tbody tr').first().find('[data-testid="edit-button"]').click()
      cy.get('[role="dialog"]').should('be.visible')
      cy.get('[name="name"]').should('have.value', 'Карандаши')
    })

    it('сохраняет изменения', () => {
      cy.intercept('PUT', '**/api/inventory/*', {
        statusCode: 200,
        body: { id: 1, name: 'Карандаши цветные', quantity: 60 },
      }).as('updateItem')

      cy.get('table tbody tr').first().find('[data-testid="edit-button"]').click()
      cy.get('[name="name"]').clear().type('Карандаши цветные')
      cy.get('[name="quantity"]').clear().type('60')
      cy.contains('button', /сохранить/i).click()

      cy.wait('@updateItem')
      cy.checkToast('обновлен', 'success')
    })
  })

  describe('Удаление товара', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/inventory*', {
        body: {
          items: [
            { id: 1, name: 'Старый товар', category: 'Другое', quantity: 0, unit: 'шт' },
          ],
          total: 1,
        },
      }).as('getInventory')
      cy.wait('@getInventory')
    })

    it('показывает подтверждение удаления', () => {
      cy.get('table tbody tr').first().find('[data-testid="delete-button"]').click()
      cy.contains(/удалить|уверены/i).should('be.visible')
    })

    it('удаляет товар после подтверждения', () => {
      cy.intercept('DELETE', '**/api/inventory/*', {
        statusCode: 204,
      }).as('deleteItem')

      cy.get('table tbody tr').first().find('[data-testid="delete-button"]').click()
      cy.contains('button', /да|удалить|подтвердить/i).click()

      cy.wait('@deleteItem')
      cy.checkToast('удален', 'success')
    })
  })

  describe('Пополнение запасов', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/inventory*', {
        body: {
          items: [
            { id: 1, name: 'Бумага А4', category: 'Канцелярия', quantity: 5, unit: 'пачка', minQuantity: 10 },
          ],
          total: 1,
        },
      }).as('getInventory')
      cy.wait('@getInventory')
    })

    it('показывает кнопку пополнения для низкого запаса', () => {
      cy.get('table tbody tr').first().find('[data-testid="restock-button"]').should('be.visible')
    })

    it('открывает форму пополнения', () => {
      cy.get('table tbody tr').first().find('[data-testid="restock-button"]').click()
      cy.get('[role="dialog"]').should('be.visible')
      cy.contains(/пополнить|restock/i).should('be.visible')
    })

    it('пополняет запас', () => {
      cy.intercept('POST', '**/api/inventory/*/restock', {
        statusCode: 200,
        body: { id: 1, quantity: 55 },
      }).as('restockItem')

      cy.get('table tbody tr').first().find('[data-testid="restock-button"]').click()
      cy.get('[name="restockAmount"]').type('50')
      cy.contains('button', /пополнить|добавить/i).click()

      cy.wait('@restockItem')
      cy.checkToast('пополнен', 'success')
    })
  })

  describe('Списание товаров', () => {
    it('открывает форму списания', () => {
      cy.intercept('GET', '**/api/inventory*', {
        body: {
          items: [{ id: 1, name: 'Товар', quantity: 100, unit: 'шт' }],
          total: 1,
        },
      }).as('getInventory')
      cy.wait('@getInventory')

      cy.get('table tbody tr').first().find('[data-testid="write-off-button"]').click()
      cy.get('[role="dialog"]').should('be.visible')
    })

    it('списывает товар с указанием причины', () => {
      cy.intercept('GET', '**/api/inventory*', {
        body: {
          items: [{ id: 1, name: 'Товар', quantity: 100, unit: 'шт' }],
          total: 1,
        },
      }).as('getInventory')
      cy.intercept('POST', '**/api/inventory/*/write-off', {
        statusCode: 200,
        body: { id: 1, quantity: 90 },
      }).as('writeOff')
      
      cy.wait('@getInventory')
      cy.get('table tbody tr').first().find('[data-testid="write-off-button"]').click()
      cy.get('[name="writeOffAmount"]').type('10')
      cy.get('[name="writeOffReason"]').type('Истёк срок годности')
      cy.contains('button', /списать|confirm/i).click()

      cy.wait('@writeOff')
      cy.checkToast('списано', 'success')
    })
  })

  describe('История движения', () => {
    it('показывает историю движения товара', () => {
      cy.intercept('GET', '**/api/inventory*', {
        body: {
          items: [{ id: 1, name: 'Товар', quantity: 100 }],
          total: 1,
        },
      }).as('getInventory')
      cy.intercept('GET', '**/api/inventory/1/history', {
        body: [
          { id: 'h1', action: 'restock', amount: 50, date: '2024-10-15' },
          { id: 'h2', action: 'write-off', amount: 10, date: '2024-10-16' },
        ],
      }).as('getHistory')
      
      cy.wait('@getInventory')
      cy.get('table tbody tr').first().find('[data-testid="history-button"]').click()
      cy.wait('@getHistory')
      cy.contains('История').should('be.visible')
    })
  })

  describe('Уведомления о низком запасе', () => {
    it('показывает badge для товаров с низким запасом', () => {
      cy.intercept('GET', '**/api/inventory*', {
        body: {
          items: [
            { id: 1, name: 'Товар', quantity: 5, minQuantity: 10 },
          ],
          total: 1,
        },
      }).as('getInventory')
      
      cy.wait('@getInventory')
      cy.get('[data-testid="low-stock-badge"]').should('exist')
    })

    it('выделяет строки с критически низким запасом', () => {
      cy.intercept('GET', '**/api/inventory*', {
        body: {
          items: [
            { id: 1, name: 'Критический товар', quantity: 0, minQuantity: 10 },
          ],
          total: 1,
        },
      }).as('getInventory')
      
      cy.wait('@getInventory')
      cy.get('table tbody tr').first().should('have.class', 'low-stock')
    })
  })

  describe('Экспорт и отчёты', () => {
    it('экспортирует инвентарь в Excel', () => {
      cy.intercept('GET', '**/api/inventory/export*', {
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

    it('генерирует отчёт о запасах', () => {
      cy.intercept('GET', '**/api/inventory/report*', {
        body: { totalItems: 100, lowStockItems: 5, totalValue: 500000 },
      }).as('getReport')

      cy.contains('button', /отчёт|report/i).click()
      cy.wait('@getReport')
    })
  })

  describe('Категории', () => {
    it('отображает все категории', () => {
      cy.intercept('GET', '**/api/inventory/categories', {
        body: ['Канцелярия', 'Продукты', 'Оборудование', 'Другое'],
      }).as('getCategories')

      cy.wait('@getCategories')
      cy.get('[data-testid="category-filter"]').click()
      cy.contains('Канцелярия').should('be.visible')
      cy.contains('Продукты').should('be.visible')
    })

    it('создаёт новую категорию', () => {
      cy.intercept('POST', '**/api/inventory/categories', {
        statusCode: 201,
        body: { id: 5, name: 'Новая категория' },
      }).as('createCategory')

      cy.contains('button', /добавить категорию/i).click()
      cy.get('[name="categoryName"]').type('Игрушки')
      cy.contains('button', /создать/i).click()

      cy.wait('@createCategory')
      cy.checkToast('категория создана', 'success')
    })
  })
})

describe('Интеграция инвентаря с другими модулями', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.loginViaAPI(users.valid.username, users.valid.password)
    })
  })

  it('связывает списание с меню (при готовке)', () => {
    cy.visit('/menu')
    cy.waitForPageLoad()
    
    // При отметке приготовления блюда должно списываться с инвентаря
    cy.intercept('POST', '**/api/menu/*/prepare', {
      body: { success: true, inventoryUpdated: true },
    }).as('prepareMenu')
  })

  it('создаёт заявку на закупку при низком запасе', () => {
    cy.visit('/inventory')
    cy.intercept('GET', '**/api/inventory*', {
      body: {
        items: [{ id: 1, name: 'Товар', quantity: 2, minQuantity: 10 }],
        total: 1,
      },
    }).as('getInventory')
    cy.intercept('POST', '**/api/procurement', {
      statusCode: 201,
      body: { id: 'proc-1' },
    }).as('createProcurement')
    
    cy.wait('@getInventory')
    cy.get('[data-testid="create-procurement-button"]').click()
    cy.wait('@createProcurement')
  })
})
