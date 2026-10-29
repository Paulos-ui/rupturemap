# Troubleshooting RUPTUREMAP V3

## npm is showing `ERESOLVE overriding peer dependency` for hours

This is a warning, not a deploy success or definitive install failure. Press Ctrl+C. The old V2 had a peer dependency conflict involving TypeScript and eslint-config-next. V3 removes the unnecessary ESLint installation and pins TypeScript 5.9.3. Push your code without doing any local npm installation, and let Synteq/Vercel build in their cloud.

## GitHub Actions provisioning workflow is red

Open the first failed step. `401`/`403`: API key missing permissions or incorrect Project ID. `404`: wrong endpoint or project/table path. `409`: an object may already exist; rerun the idempotent job. Schema indexing can be asynchronous; rerun if the index is still building. Never post API keys while sharing log screenshots.

## Vercel or Synteq build fails

Open the **build logs**, not the home page. Look for the first actionable `Error:` and copy the surrounding lines. No Dockerfile is included; Synteq uses Railpack. Use Node 22 and repository root. Vercel uses Next.js preset. V3 is syntactically checked but has not had a real npm production build in this environment.

## Synteq says Health failed

Make sure app start script runs `next start`, health path is `/api/health` (returns HTTP 200), and the platform's PORT is honored. Inspect live Logs. A working Vercel deployment does not qualify for Synteq: the required URL must end in `.synteq.app`.

## Site opens but cloud reads fail

Set `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, and `NEXT_PUBLIC_APPWRITE_DATABASE_ID=rupturemap` in the hosting provider **before build**, then rebuild/redeploy. On Synteq scope them to **Both**. Add each hostname to Appwrite project Platforms as Web platforms. Confirm anonymous sessions enabled.

## Appwrite `Unauthorized`, `Missing permissions`, `404`, or CORS

Run the GitHub Actions schema workflow and confirm green. Ensure all four tables have `create("users")` table permission with row security enabled and no broad table read. Rows are readable only by their creating anonymous user. If the website URL is new, add its hostname to Appwrite Platforms → Web and redeploy. Do not use a server API key in the browser.

## It only says Preview mode

The frontend can render offline demos without Appwrite, but cloud saves need a correct project ID, actual TablesDB schema, allowed anonymous sessions, and a registered Web hostname. A preview-only deployment is not enough for a compelling Appwrite judging submission.

## Tables exist but app errors when saving

Check Columns: the application writes `scenarios`, `systems`, `dependencies`, and `runs`. Appwrite's `createTable` has sometimes not applied nested columns correctly; V3's setup script checks/repairs missing columns and indexes. After schema workflow succeeds, browser saving is the final proof.
