describe("Public page hydration", () => {
  for (const path of ["/", "/login"]) {
    it(`hydrates ${path} and allows theme changes`, () => {
      cy.visit(path);
      cy.get('button[aria-label="Switch to dark mode"]', { timeout: 15000 }).click();
      cy.get("html").should("have.class", "dark");
      cy.get('button[aria-label="Switch to light mode"]').click();
      cy.get("html").should("not.have.class", "dark");
    });
  }
});
