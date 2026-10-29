# RUPTUREMAP — See what breaks next

**Appwrite Databases Hackathon × Synteq Hack** · Built October 29, 2026 · Solo entry · MIT

RUPTUREMAP is an interactive resilience laboratory. Map interconnected systems, inject disruptions, watch explainable cascades, test interventions, compare outcomes, and keep scenario snapshots and simulation histories in **Appwrite TablesDB**.

**All simulation data is fictional. Scores are illustrative, not real-world emergency predictions.**

## Demo features

- Interactive directional system map and cascading failure simulation
- Two fictional starter regions; add, remove and rearrange systems and dependency links
- Intervention controls with before/after impact comparison
- Replayable simulation history, scenario forking and JSON export
- Appwrite anonymous login, private row permissions, stored system/dependency records, saved run history
- Responsive dark-mineral interface; no external AI API required

## The easiest route — NO local npm install

**Read [CLOUD_FIRST_DEPLOY.md](CLOUD_FIRST_DEPLOY.md)** before anything else. It describes how to:
1. Extract this ZIP over an existing project folder and push to a *new public GitHub repo*.
2. Add two secrets to GitHub Actions and click **Run workflow** to create/verify Appwrite TablesDB (requires no npm install).
3. Connect the same GitHub repo to Synteq Apps and run it at `rupturemap-<unique>.synteq.app`.
4. Add your Synteq hostname to Appwrite Web platforms and test real saving.
5. Optionally import that same repository into Vercel.
6. Use one recording for both distinct competition submission processes.

**Appwrite is the database.** Synteq/Vercel only host the Next.js web app; both deployments point at the same cloud database. One Synteq deployment alone can satisfy both events; Vercel is optional.

## Technology

Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, @xyflow/react, Lucide React, Appwrite Web SDK 29, Node.js 22, GitHub Actions, Synteq Apps, optionally Vercel. No pre-hackathon product code.

## Schema

Serverless TablesDB database ID `rupturemap` contains four tables:

| Table | Purpose |
| --- | --- |
| `scenarios` | Immutable saved scenario records |
| `systems` | Named system nodes, positions, resilience and criticality |
| `dependencies` | Directed links and failure exposure strengths |
| `runs` | Stored simulation results for replay |

Table permission is **create for signed-in/anonymous users only**; read/update/delete are private at row level. Appwrite sessions are domain/browser dependent: the Vercel and Synteq hosts will generally have separate anonymous identities even when using the same project.

## Appwrite configuration

For the application on either host, set only these **public** environment variables:

```dotenv
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=PASTE_REAL_PROJECT_ID
NEXT_PUBLIC_APPWRITE_DATABASE_ID=rupturemap
```

These are compiled into the browser bundle. On **Synteq**, their scope must be **Both (build and runtime)**. On Vercel set them for Production and redeploy to apply changes.

**Never expose `APPWRITE_API_KEY` as `NEXT_PUBLIC_`, or put it in Synteq/Vercel.** It is needed only for *one-time schema provisioning* in the GitHub workflow and can be revoked afterward.

## Optional local development

If you eventually wish to run locally using Node.js 22:

```bash
npm install
cp .env.example .env.local
# Edit the public project ID in .env.local; add a temporary API key only for provisioning.
npm run test:engine
npm run db:setup
npm run db:verify
npm run dev
```

Database provisioning is now a **built-in Node fetch** script and needs **no npm dependencies** when run directly:

```bash
node --env-file=.env.local scripts/provision-appwrite.mjs
node --env-file=.env.local scripts/check-appwrite.mjs
```

`npm run build` can be tested on the remote hosting platform. CLI output has to be checked; a successful push alone is not proof of a working app.

## Where to find everything

- [CLOUD_FIRST_DEPLOY.md](CLOUD_FIRST_DEPLOY.md) — fastest one-codebase setup
- [GIT_BASH_COMMANDS.txt](GIT_BASH_COMMANDS.txt) — minimal overwrite, commit and push
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — install, build, CORS, schema and permissions
- [SUBMISSION.md](SUBMISSION.md) — Appwrite + Synteq checklists and one-video script

## Security & operating notes

- All persistence uses Appwrite, never writable hosting container storage.
- Each browser receives an anonymous Appwrite identity; save/export what matters.
- Do not share an API key, `.env.local`, GitHub secrets, or private logs containing credentials.
- Input is demonstrative, and failure scores do not represent empirical probabilities.
- Repository and deployed demo must remain publicly accessible for hackathon judging.
