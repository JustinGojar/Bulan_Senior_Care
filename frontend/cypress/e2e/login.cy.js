describe("Login", () => {
  it("admin can sign in", () => {
    // Supply a real test account when testing authentication against the backend.
    cy.env(["adminEmail", "adminPassword"]).then(({ adminEmail, adminPassword }) => {
      expect(adminEmail, "adminEmail must be configured").to.be.a("string").and.not.be.empty;
      expect(
        typeof adminPassword === "string" && adminPassword.length > 0,
        "adminPassword must be configured",
      ).to.eq(true);
      cy.visit("/login");
      cy.get("#login-email", { timeout: 15000 }).type(adminEmail);
      cy.get("#login-password").type(adminPassword, { log: false });
      cy.intercept("POST", "**/api/login").as("login");
      cy.contains('button[type="submit"]', "Sign in").click();
      cy.wait("@login").its("response.statusCode").should("eq", 200);
      cy.location("pathname").should("eq", "/admin/dashboard");
    });
  });
});
