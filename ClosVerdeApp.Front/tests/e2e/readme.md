# Tests Playwright E2E

1. Installer :
    ```powershell
    pnpm install
    pnpm e2e:install
    ```
2. Créer `tests/e2e/.env.private` à partir de `.env.private.example` :
    ```dotenv
    PLAYWRIGHT_BASE_URL=https://localhost:3000
    PLAYWRIGHT_API_BASE_URL=https://localhost:4000
    PLAYWRIGHT_KEYCLOAK_LOGIN=...
    PLAYWRIGHT_KEYCLOAK_PASSWORD=...
    ```
3. Démarrer l'application depuis la racine :
    ```powershell
    aspire run
    ```
4. Capturer l'authentification réelle :
    ```powershell
    pnpm e2e:auth
    ```
5. Lancer les tests :
    ```powershell
    pnpm e2e
    ```
