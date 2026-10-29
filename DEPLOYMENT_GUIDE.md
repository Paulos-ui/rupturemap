# Deployment guide (V3)

Please start with **[CLOUD_FIRST_DEPLOY.md](CLOUD_FIRST_DEPLOY.md)**. It supersedes the old V2 step-by-step npm install instructions.

- Database: Appwrite Cloud Frankfurt endpoint `https://fra.cloud.appwrite.io/v1`, database ID `rupturemap`, four tables.
- Easiest provisioning: GitHub Actions → Provision Appwrite TablesDB, using temporary GitHub Secrets and zero npm install.
- Main app deployment: Synteq Apps with GitHub import, Node 22, three `NEXT_PUBLIC_` environment variables scoped to Both, `/api/health` probe.
- Optional mirror: Vercel GitHub import with the same three public environment variables.
- Synteq Hack entry requires real `*.synteq.app` URL, a public X quote of their announcement, and pasted quote URL on their leaderboard.
- Appwrite Hack entry requires public repository and brief recorded demo, with code genuinely using Appwrite database.
