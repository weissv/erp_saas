import { defineConfig } from 'cypress'

const baseUrl = process.env.CYPRESS_BASE_URL || 'https://erp.mezon.uz'

export default defineConfig({
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    chromeWebSecurity: false,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    defaultCommandTimeout: 15000,
    requestTimeout: 20000,
  },
})
