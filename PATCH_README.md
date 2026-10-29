# RUPTUREMAP — Synteq Appwrite Runtime Connection Patch

The existing live site displays `Preview mode` because its browser bundle was built without usable `NEXT_PUBLIC_APPWRITE_*` values. This patch reads the three **public** values via a dynamic route on the running server. It does not expose an API key.

## Install patch (WSL)

1. Download `rupturemap-runtime-connection-fix.zip` to your Windows Desktop.
2. Run the commands below in your terminal in order:

```bash
cd "/mnt/c/Users/MY PC/Desktop/rupturemap"
unzip -oq "/mnt/c/Users/MY PC/Desktop/rupturemap-runtime-connection-fix.zip" -d . && rm -f "/mnt/c/Users/MY PC/Desktop/rupturemap-runtime-connection-fix.zip"
git add -A
git commit -m "RUPTUREMAP"
git push origin HEAD
```

No local `npm install` is necessary for these steps. Synteq builds the repository automatically if GitHub auto-deploy is enabled. Otherwise deploy the latest `main` commit in Synteq's Deployments tab.

## Verify WITHOUT revealing secrets

Open `https://YOUR-ACTUAL-SYNTEQ-DOMAIN/api/appwrite-config`.

- `{ "configured": true, ... }` indicates the server has the public values.
- `{ "configured": false, "missing": [...] }` tells you which Synteq environment names are missing at runtime. Make sure scope is **Both** (Build and Runtime). `Secret` kind is fine.
- If this endpoint returns 404, the new build is not live.

The endpoint intentionally displays public endpoint/project/database IDs; it never returns the Appwrite admin key. Do not add `APPWRITE_API_KEY` to Synteq.

Then refresh the main app. It should change from Connecting to Appwrite connected. If it reports Cloud unavailable, check anonymous authentication, registered Web hostname, and Appwrite table permissions. Try **Save snapshot** and verify a real new row in Appwrite `scenarios`.

This patch modifies `src/lib/appwrite.ts` and `src/components/command-center.tsx`, adds `src/app/api/appwrite-config/route.ts`, and leaves all Appwrite database tables unchanged.
