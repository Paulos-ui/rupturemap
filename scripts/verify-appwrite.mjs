/** Inspect actual deployed Appwrite TablesDB schema using temporary LOCAL API key. */
import { Client, TablesDB } from 'node-appwrite';
const endpoint=process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId=process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId=process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'rupturemap';
const key=process.env.APPWRITE_API_KEY;
const expected={
  scenarios:['owner_id','title','place','description','scenario_type','created_at'],
  systems:['owner_id','scenario_id','node_key','name','subtitle','category','description','x','y','resilience','criticality'],
  dependencies:['owner_id','scenario_id','source_key','target_key','exposure'],
  runs:['owner_id','scenario_id','scenario_title','root_key','severity','affected','critical','resilience_index','created_at','result_json']
};
if (!endpoint||!projectId||!key||projectId.includes('your_')||key.includes('your_')) {
  console.error('Missing real Appwrite values. Run: npm run configure'); process.exit(1);
}
const db = new TablesDB(new Client().setEndpoint(endpoint).setProject(projectId).setKey(key));
try {
  const database=await db.get({databaseId});
  console.log(`\n✓ LIVE DATABASE: ${database.name} [${database.$id}]`);
  console.log(`  API: ${endpoint}`);
  let errors=0;
  for(const [tableId,keys] of Object.entries(expected)) {
    try {
      const table=await db.getTable({databaseId,tableId});
      const cols=new Set((table.columns||[]).map(item=>item.key));
      const missing=keys.filter(k=>!cols.has(k));
      const rowSecure=table.rowSecurity===true;
      const permissions=table.$permissions||[];
      const createEnabled=permissions.some(x=>x.includes('create') && x.includes('users'));
      const publiclyReadable=permissions.some(x=>x.includes('read'));
      const ok=missing.length===0&&rowSecure&&createEnabled&&!publiclyReadable;
      console.log(`${ok?'✓':'✗'} ${tableId}: ${cols.size} columns; row security ${rowSecure}; session CREATE ${createEnabled}; broad READ ${publiclyReadable}`);
      if(missing.length) console.log(`  Missing columns: ${missing.join(', ')}`);
      if(!ok)errors++;
    } catch(e) { console.error(`✗ ${tableId}: ${e.message}`); errors++; }
  }
  if(errors){console.error(`\n${errors} schema/permission issue(s) detected. Do not claim a working cloud integration yet.`);process.exitCode=1;}
  else console.log('\n✓ REAL APPWRITE SCHEMA VERIFIED. Next: npm run dev, then save a snapshot in the browser.');
} catch (e) {console.error(`\nCould not verify Appwrite: ${e.message} (${e.code||'network'})`);process.exitCode=1;}
