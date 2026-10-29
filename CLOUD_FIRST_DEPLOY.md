# CLOUD-FIRST DEPLOYMENT — One codebase, no local npm installation

**RUPTUREMAP V3 — FIRST READ.** You already created an Appwrite Cloud project and use the Frankfurt endpoint (`https://fra.cloud.appwrite.io/v1`). Do not create a second project. The Appwrite Databases Hackathon requires Appwrite DB use; Synteq Hack requires a working `*.synteq.app` URL. A Synteq hosted RUPTUREMAP can be submitted to BOTH. Vercel is optional.

## 0 — Stop the stuck npm installation

If your WSL shell is still displaying `npm warn ERESOLVE`, press `Ctrl+C`. The setup below does not require `npm install` on your laptop. V3 also removes the old ESLint dependency set that was causing noisy npm peer warnings.

## 1 — Unzip and push the repository

1. In your browser open https://github.com/new, create a **new public EMPTY** repository called `rupturemap` under `paulos-ui`. Do **not** check *Add README*, `.gitignore`, or license.
2. Put `rupturemap-v3.zip` on your Windows Desktop.
3. Open **WSL** as in your screenshot (prompt path begins `/mnt/c/...`), and run the complete commands in `GIT_BASH_COMMANDS.txt`.
4. Confirm the files appear at `https://github.com/paulos-ui/rupturemap`. Check that `.github/workflows/provision-appwrite.yml` appears too.

The ZIP extracts at the repository root. It does not include `.git`, `.env.local`, `node_modules` or a secret key. It overwrites V2 files safely without destroying `.git`.

## 2 — Make an Appwrite API key (one time only)

1. Open https://cloud.appwrite.io and enter your **existing RUPTUREMAP project**.
2. Find **Settings → API Keys**, click **Create API key** and name it `rupturemap-schema-setup`.
3. Grant the provisioning scopes needed for creation and verification: `databases.read`, `databases.write`, `tables.read`, `tables.write`, `columns.read`, `columns.write`, `indexes.read`, `indexes.write`. If the UI groups some under Databases, select the corresponding read/write choices.
4. Copy the key and keep it private. Never post the key or put it in source code.

## 3 — Create the real TablesDB backend WITHOUT local npm

1. Open your GitHub repo → **Settings → Secrets and variables → Actions** → **New repository secret**.
2. Add `APPWRITE_PROJECT_ID` with the Appwrite project ID (NOT the project name).
3. Add `APPWRITE_API_KEY` with the temporary key created above.
4. Open **Actions** → select **Provision Appwrite TablesDB** → **Run workflow** → **Run workflow**.
5. Watch the workflow run. It will create the `rupturemap` serverless database, four tables, their typed columns/indexes, and verify private permissions.
6. The job must finish **green**. In Appwrite → Databases, check the four tables exist. If it fails, open the logs (hide secrets) and look at the first `✗` error.

A `Not authorized` failure usually means the key lacks a scope. A `Not Found` failure often means the wrong Project ID. Appwrite table schema can take time to become available: rerun the workflow if the error specifically says a column or index is still building.

After a successful setup, revoke the temporary API key in Appwrite and remove the GitHub Actions secret unless you expect to provision again.

## 4 — Deploy the LIVE application on Synteq (required for Synteq Hack)

1. Go to https://cloud.synteq.com, sign in, and select your organization/project.
2. Select **Apps → New App**; use a unique name like `rupturemap-lab` (only if available).
3. Choose **Connect GitHub**, authorize `paulos-ui/rupturemap`, select branch `main`.
4. For build source use repository root (`./`). There is deliberately **no Dockerfile**; Synteq Railpack should detect Next.js/Node and perform the remote dependency installation.
5. Add the three environment variables below. **IMPORTANT: set scope to `Both` so `NEXT_PUBLIC_` variables are present at BUILD time**, not just runtime.

```dotenv
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=YOUR_REAL_APPWRITE_PROJECT_ID
NEXT_PUBLIC_APPWRITE_DATABASE_ID=rupturemap
```

6. Keep the default app start command initially. The repository's `start` script uses Next.js Node server; if Synteq requests a command, use `npm run start`. `PORT` is supplied by Synteq. Set health-check path `/api/health` if available.
7. Deploy and read its build logs. Only a **Live** release and working HTTPS page count. If a free plan is unavailable, review any card/cost request before accepting.
8. Copy the actual URL: `https://YOUR-SLUG.synteq.app`. **This exact platform hostname is required by the Synteq hackathon.**

## 5 — Whitelist both frontend domains in Appwrite

In your Appwrite Cloud project → Platforms → **Add platform → Web**, add the Synteq hostname `YOUR-SLUG.synteq.app` (the hostname, not `https://`).

For localhost preview, add `localhost`. If you also deploy Vercel, add `YOUR-APP.vercel.app` as a separate Web platform.

Ensure **Anonymous auth** is allowed. In the live app, load a demo network, press **Save snapshot**, open History and refresh. Then inspect Appwrite → Databases → `rupturemap` → `scenarios` and `systems` for rows. A preview-only app is not enough: verify real storage.

## 6 — OPTIONAL mirror on Vercel

This is not required for either contest if Synteq is live, but you can do it:

1. Open https://vercel.com/new → Import `paulos-ui/rupturemap`.
2. Use **Next.js** and **Root Directory `./`**.
3. Set the same **three public environment variables** for Production (no API key).
4. Deploy; Vercel handles `npm install` in its cloud.
5. Add `YOUR-APP.vercel.app` in Appwrite Web platforms, test save/replay separately.

## 7 — Enter BOTH hackathons with one genuine video

**Appwrite** at https://hackathon.appwrite.io : public GitHub repo, 2–3 minute demo video, optional live URL (use the working Synteq URL or Vercel mirror). Deadline: **October 31, 2026, 11:59 PM PT**.

**Synteq** at https://hack.synteq.app : quote Synteq's actual announcement post on X, include your LIVE `https://YOUR-SLUG.synteq.app` URL in the quote or your direct reply, then paste that quote-post URL on Synteq's leaderboard. **A standard post or reply does NOT count**. Its ranking uses weighted engagement, followed by a public final vote.

Record one demonstration video showing the interactive network, the failure cascade, the intervention, the Appwrite saved history, and (briefly) the Database tables in the Appwrite dashboard. Use the same video on the Appwrite application and in the Synteq quote post if desired. The two entry forms are still separate.

## The important truth

The source ZIP is ready, but **nothing becomes deployed automatically** by downloading it. Appwrite must be provisioned, Synteq must report a Live deployment, and saving data must be tested on the live URL. Never claim verified backend persistence before that test succeeds.
