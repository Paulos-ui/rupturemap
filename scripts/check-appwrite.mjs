/** Verifies the REAL cloud schema, permissions, and indexes with an API key. */
import {schema} from './appwrite-schema.mjs';
import {api,tablePath,databaseId,assertConfiguration} from './appwrite-rest.mjs';
assertConfiguration();
let failures=0;
try{
 const database=await api('GET',`/tablesdb/${encodeURIComponent(databaseId)}`);
 console.log(`✓ Database exists: ${database.name} (${databaseId})`);
 for(const def of schema){
   const table=await api('GET',tablePath(def.tableId));
   const columns=await api('GET',`${tablePath(def.tableId)}/columns`);
   const indexes=await api('GET',`${tablePath(def.tableId)}/indexes`);
   const active=new Map((columns.columns||[]).map(x=>[x.key,x]));
   const indexed=new Set((indexes.indexes||[]).map(x=>x.key));
   const missingCols=def.columns.filter(x=>!active.has(x.key)||active.get(x.key).status==='failed').map(x=>x.key);
   const missingIndexes=def.indexes.filter(x=>!indexed.has(x.key)).map(x=>x.key);
   const permissions=table.$permissions || [];
   const restricted=table.rowSecurity===true && permissions.includes('create("users")') && !permissions.some(x=>/^read\(|^update\(|^delete\(/.test(x));
   const ok=restricted&&!missingCols.length&&!missingIndexes.length;
   if(!ok) failures++;
   console.log(`${ok?'✓':'✗'} ${def.tableId}: ${active.size} columns, ${indexed.size} indexes, private rows ${restricted}`);
   if(missingCols.length)console.log(`    Missing columns: ${missingCols.join(', ')}`);
   if(missingIndexes.length)console.log(`    Missing indexes: ${missingIndexes.join(', ')}`);
   if(!restricted)console.log(`    Table must enable rowSecurity and ONLY create(\"users\") table permission; current: ${permissions.join(',')}`);
 }
 if(failures){console.error(`\n✗ ${failures} table(s) need attention. Check the creation log and rerun provisioning.`);process.exitCode=1;}
 else console.log('\n✓ Database schema confirmed. Browser save/load is the final integration test.');
}catch(error){console.error(`\n✗ Verification failed: ${error.message}`);process.exitCode=1;}
