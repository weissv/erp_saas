// frontend/cypress/e2e/tenant-lifecycle.cy.ts
//
// Blueprint: Example E2E spec using dynamic tenant provisioning.
//
// This file demonstrates the recommended pattern for multi-tenant E2E tests:
//   before()  → provision a fresh tenant
//   tests     → exercise functionality on the isolated tenant
//   after()   → tear down the tenant DB
//
// To adopt this pattern across existing specs:
//   1. Import `../support/tenant-lifecycle` in `cypress/support/e2e.ts`.
//   2. Replace hardcoded backend URLs / credentials with dynamic values from
//      `Cypress.env("testTenant")`.
//   3. Wrap each `describe` block with the before/after lifecycle hooks below.

/// <reference types="cypress" />

import type { TestTenant } from "../support/tenant-lifecycle";

describe("Tenant Lifecycle – E2E Blueprint", () => {
  let tenant: TestTenant;

  // ── Setup: provision an isolated tenant ────────────────────────────────
  before(() => {
    cy.provisionTestTenant().then((t) => {
      tenant = t;
    });
  });

  // ── Teardown: delete the tenant and its database ───────────────────────
  after(() => {
    cy.teardownTestTenant();
  });

  // ── Tests ──────────────────────────────────────────────────────────────

  it("should be able to log in to the provisioned tenant", () => {
    cy.loginAsTestTenantAdmin();
    cy.url().should("include", "/dashboard");
  });

  it("should have an isolated database (no pre-existing children)", () => {
    cy.loginAsTestTenantAdmin();
    cy.request({
      url: `${tenant.baseUrl}/api/children`,
      headers: { Authorization: `Bearer ${Cypress.env("authToken")}` },
    }).then((res) => {
      expect(res.status).to.eq(200);
      // A fresh tenant should have zero children
      const items = res.body.items ?? res.body;
      expect(items).to.have.length(0);
    });
  });

  it("should create and retrieve a resource within the tenant", () => {
    cy.loginAsTestTenantAdmin();

    // Create
    cy.request({
      method: "POST",
      url: `${tenant.baseUrl}/api/groups`,
      headers: {
        Authorization: `Bearer ${Cypress.env("authToken")}`,
        "Content-Type": "application/json",
      },
      body: { name: "Test Group 1A", capacity: 25 },
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
    });

    // Retrieve
    cy.request({
      url: `${tenant.baseUrl}/api/groups`,
      headers: { Authorization: `Bearer ${Cypress.env("authToken")}` },
    }).then((res) => {
      expect(res.status).to.eq(200);
      const groups = res.body.items ?? res.body;
      expect(groups.some((g: { name: string }) => g.name === "Test Group 1A")).to
        .be.true;
    });
  });
});
