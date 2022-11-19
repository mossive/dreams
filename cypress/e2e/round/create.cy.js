import login from "../login";

describe("Create a round", () => {
    beforeEach(login)

    const roundSlug = `cypress-test-round-${Date.now()}`;

    it("checks required fields", () => {
        cy.visit("new-round")
        cy.get("[data-testid=round-title]")
        .type("{enter}")

        cy.get("[data-testid=helpertext-round-title]")
        .contains("Required")
    });

    it("creates a round", () => {
        cy.visit("new-round")
        cy.get("[data-testid=round-title]")
        .type(roundSlug)
        .type("{enter}");

        cy.url().should("be.equal", `${Cypress.config("baseUrl")}c/${roundSlug}`);
    });

});