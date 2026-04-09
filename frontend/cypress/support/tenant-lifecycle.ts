// frontend/cypress/support/tenant-lifecycle.ts
//
// Blueprint: Dynamic tenant provisioning & teardown for E2E tests.
//
// Instead of running every test against a shared, long-lived environment,
// each `describe` block (or suite) dynamically:
//   1. Provisions a fresh test tenant via the SaaS control-plane API.
//   2. Receives the tenant subdomain + admin credentials.
//   3. Runs all assertions against that isolated tenant.
//   4. Tears down (deletes) the tenant DB afterward.
//
// This guarantees test isolation — no leftover data, no cross-test pollution.

/// <reference types="cypress" />

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TestTenant {
  tenantId: string;
  subdomain: string;
  adminEmail: string;
  adminPassword: string;
  baseUrl: string;
  token: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const CONTROL_PLANE_URL =
  Cypress.env("CONTROL_PLANE_URL") || "http://localhost:4000";

const TEST_ADMIN_PASSWORD =
  Cypress.env("TEST_ADMIN_PASSWORD") || "E2E_Secret!1";

// ─── Commands ────────────────────────────────────────────────────────────────

/**
 * Provision a brand-new tenant and return connection details.
 *
 * Call in `before()` at the top of your test suite.
 */
Cypress.Commands.add("provisionTestTenant", () => {
  const tenantName = `e2e-${Date.now()}-${Cypress._.random(1000, 9999)}`;

  cy.request({
    method: "POST",
    url: `${CONTROL_PLANE_URL}/api/saas/tenants/provision`,
    body: {
      name: tenantName,
      plan: "starter",
      adminEmail: `admin@${tenantName}.test`,
      adminPassword: TEST_ADMIN_PASSWORD,
    },
    headers: { "Content-Type": "application/json" },
    failOnStatusCode: true,
  }).then((res) => {
    expect(res.status).to.eq(201);

    const tenant: TestTenant = {
      tenantId: res.body.tenantId,
      subdomain: res.body.subdomain,
      adminEmail: res.body.adminEmail,
      adminPassword: TEST_ADMIN_PASSWORD,
      baseUrl: res.body.baseUrl,
      token: res.body.token,
    };

    // Store for use in tests
    Cypress.env("testTenant", tenant);

    return cy.wrap(tenant);
  });
});

/**
 * Tear down the tenant: wipe the database, remove DNS/routing entries.
 *
 * Call in `after()` at the bottom of your test suite.
 */
Cypress.Commands.add("teardownTestTenant", () => {
  const tenant: TestTenant | undefined = Cypress.env("testTenant");
  if (!tenant) {
    cy.log("No test tenant to tear down");
    return;
  }

  cy.request({
    method: "DELETE",
    url: `${CONTROL_PLANE_URL}/api/saas/tenants/${tenant.tenantId}`,
    headers: {
      Authorization: `Bearer ${tenant.token}`,
      "Content-Type": "application/json",
    },
    failOnStatusCode: false, // best-effort cleanup
  }).then((res) => {
    if (res.status === 200 || res.status === 204) {
      cy.log(`Tenant ${tenant.tenantId} torn down successfully`);
    } else {
      cy.log(
        `Warning: tenant teardown returned status ${res.status}`,
      );
    }
    Cypress.env("testTenant", undefined);
  });
});

/**
 * Authenticate as the tenant admin and set up session storage.
 */
Cypress.Commands.add("loginAsTestTenantAdmin", () => {
  const tenant: TestTenant = Cypress.env("testTenant");
  if (!tenant) throw new Error("No test tenant provisioned");

  cy.request({
    method: "POST",
    url: `${tenant.baseUrl}/api/auth/login`,
    body: {
      login: tenant.adminEmail,
      password: tenant.adminPassword,
    },
    headers: {
      "Content-Type": "application/json",
      Origin: tenant.baseUrl,
    },
  }).then((res) => {
    expect(res.status).to.eq(200);
    const token = res.body.token;
    Cypress.env("authToken", token);

    cy.visit(tenant.baseUrl, {
      onBeforeLoad(win) {
        win.localStorage.setItem("auth_token", token);
        if (res.body.user) {
          win.localStorage.setItem(
            "auth_user",
            JSON.stringify(res.body.user),
          );
        }
      },
    });
  });
});

// ─── Type declarations ───────────────────────────────────────────────────────

declare global {
  namespace Cypress {
    interface Chainable {
      provisionTestTenant(): Chainable<TestTenant>;
      teardownTestTenant(): Chainable<void>;
      loginAsTestTenantAdmin(): Chainable<void>;
    }
  }
}

export {};
