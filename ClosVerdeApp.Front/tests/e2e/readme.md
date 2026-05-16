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
    PLAYWRIGHT_KEYCLOAK_AUTHORITY=https://localhost:8088/realms/clos-verde
    PLAYWRIGHT_KEYCLOAK_CLIENT_ID=cv_dev-front
    ```
3. Démarrer l'application depuis la racine :
    ```powershell
    aspire run
    ```
4. Capturer l'authentification réelle :
    ```powershell
    pnpm e2e:auth
    ```
    Cette commande lit `ClosVerdeApp.AppHost/Realms/clos-verde-realm.json` et génère un cache par utilisateur dans `cache/.auth/users`.
5. Lancer les tests :
    ```powershell
    pnpm e2e
    ```
