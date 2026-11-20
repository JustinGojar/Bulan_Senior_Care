# Cypress frontend tests

Cypress defaults to `https://bulan-senior-care.vercel.app`. Deploy the application
hydration fix before testing the hosted site. No local server is needed.

Run the public-page hydration and mocked login-form tests without a backend account:

```sh
npm run test:e2e -- --spec "cypress/e2e/hydration.cy.js,cypress/e2e/login-validation.cy.js"
```

For the real admin sign-in test, create
`frontend/cypress.env.json` (ignored by Git) with an active, verified admin test
account that does not require a password change:

```json
{
  "adminEmail": "your-test-admin@example.com",
  "adminPassword": "your-test-account-password"
}
```

Run `npm run test:e2e` for all tests, or `npm run test:e2e:open` for the interactive runner.
The admin test calls the real API; the login validation test stubs a rejected response.

To test locally instead, start the frontend with `npm run dev` and the Laravel API,
then override the URL:

```sh
npm run test:e2e -- --config baseUrl=http://localhost:3000
```

The root HTML includes Cypress's `data-cy-bootstrap` script marker to prevent
bootstrap injection from changing the document structure before React hydration.
Uncaught exceptions remain enabled so application errors still fail tests.
