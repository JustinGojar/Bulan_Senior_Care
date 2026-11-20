describe("Login form", () => {
  it("submits credentials and displays a rejected login", () => {
    cy.intercept("POST", "**/api/login", {
      statusCode: 422,
      body: { message: "These credentials do not match our records." },
    }).as("rejectedLogin");

    cy.visit("/login");
    cy.get("#login-email", { timeout: 15000 }).type("invalid@example.test");
    cy.get("#login-password").type("invalid-password", { log: false });
    cy.contains('button[type="submit"]', "Sign in").click();
    cy.wait("@rejectedLogin").its("request.body").should("deep.equal", {
      email: "invalid@example.test",
      password: "invalid-password",
    });
    cy.contains("These credentials do not match our records.").should("be.visible");
    cy.location("pathname").should("eq", "/login");
    cy.contains('button[type="submit"]', "Sign in").should("be.enabled");
  });
});
