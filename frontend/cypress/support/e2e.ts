/// <reference types="cypress" />
import './commands'

Cypress.on('uncaught:exception', (err) => {
  // Ignore potential third-party errors that do not impact assertions
  console.error('Uncaught exception in test run:', err)
  return false
})
