/** Interactive private Appwrite configuration. Does not contact Appwrite or store an API key in git. */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { writeFileSync, existsSync } from 'node:fs';
const file = '.env.local';
const rl = createInterface({input, output});
const ask = async (label, fallback='') => {
  const value = (await rl.question(`${label}${fallback?` [${fallback}]`:''}: `)).trim();
  return value || fallback;
};
try {
  console.log('\nRUPTUREMAP · Appwrite connection assistant\n');
  console.log('Use the Appwrite project you ALREADY CREATED. Do not paste the API key into chat.');
  if (existsSync(file)) {
    const confirm = await ask('A .env.local already exists. Overwrite it? (type YES)');
    if(confirm !== 'YES') { console.log('Nothing changed.'); process.exit(0); }
  }
  const endpoint = await ask('Appwrite API endpoint', 'https://fra.cloud.appwrite.io/v1');
  const projectId = await ask('Appwrite Project ID (copy it from Appwrite Console)');
  const databaseId = await ask('Database ID (new unless already provisioned)', 'rupturemap');
  console.log('\nCreate an API key in Appwrite Console with: databases.read/write, tables.read/write, columns.read/write, indexes.read/write.');
  console.log('This key is ONLY for local schema creation. It will never be needed by your browser or Vercel.');
  const apiKey = await ask('Paste your temporary Appwrite server API key');
  if (!/^https:\/\/[^\s/]+\/v1\/?$/.test(endpoint)) throw new Error('Endpoint must be an HTTPS Appwrite API URL ending in /v1.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(projectId) || projectId.includes('your_')) throw new Error('Project ID is missing or invalid.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(databaseId)) throw new Error('Database ID must have 1-36 safe characters.');
  if(apiKey.length < 16 || apiKey.includes('your_')) throw new Error('No valid-looking API key supplied.');
  writeFileSync(file, `# PRIVATE LOCAL ENVIRONMENT: never commit or share this file.\nNEXT_PUBLIC_APPWRITE_ENDPOINT=${endpoint.replace(/\/$/,'')}\nNEXT_PUBLIC_APPWRITE_PROJECT_ID=${projectId}\nNEXT_PUBLIC_APPWRITE_DATABASE_ID=${databaseId}\nAPPWRITE_API_KEY=${apiKey}\n`, {mode:0o600});
  console.log('\nSaved .env.local (excluded from Git).');
  console.log('Next: npm run db:setup && npm run db:verify && npm run dev');
  console.log('Only the three NEXT_PUBLIC_* variables belong in Vercel.\n');
} catch (error) {console.error(`\nSetup not saved: ${error.message}`);process.exitCode=1;}
finally {rl.close();}
