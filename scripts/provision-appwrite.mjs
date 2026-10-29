/** Idempotent one-time schema provisioning; safe from GitHub Actions (no npm install). */
import {schema} from './appwrite-schema.mjs';
import {api,exists,sleep,endpoint,project,databaseId,tablePath,assertConfiguration} from './appwrite-rest.mjs';
assertConfiguration();
console.log(`Appwrite endpoint: ${endpoint}\nProject: ${project}\nDatabase: ${databaseId}`);
const dbPath=`/tablesdb/${encodeURIComponent(databaseId)}`;
try {
  if(!await exists(dbPath)) {
    await api('POST','/tablesdb',{databaseId,name:'RUPTUREMAP Resilience Data',specification:'serverless'});
    console.log('✓ Created Appwrite serverless TablesDB');
  }else console.log('✓ Existing Appwrite database found');
  for(const table of schema){
    const path=tablePath(table.tableId);
    if(!await exists(path)){
      // Create table AND its columns/indexes as a single schema request when supported.
      try {
        await api('POST',`${dbPath}/tables`,{
          tableId:table.tableId,name:table.name,
          rowSecurity:true,permissions:['create("users")'],
          columns:table.columns,indexes:table.indexes
        });
      } catch (error) {
        // Some SDK/server combinations reject nested schemas on createTable.
        // Fall back to a plain table, then create all columns and indexes below.
        if(error.status !== 400) throw error;
        console.log(`  Bulk schema rejected; retrying plain table: ${error.message}`);
        await api('POST',`${dbPath}/tables`,{
          tableId:table.tableId,name:table.name,
          rowSecurity:true,permissions:['create("users")']
        });
      }
      console.log(`+ Created ${table.tableId}`);
    }else console.log(`= Table ${table.tableId} already exists`);
    // Appwrite can asynchronously build schema. Re-read the actual columns instead
    // of assuming createTable() applied its schema. Repair pre-existing empty tables.
    for(const col of table.columns){
      const cpath=`${path}/columns/${encodeURIComponent(col.key)}`;
      if(await exists(cpath)) continue;
      const methodPath=`${path}/columns/${col.type}`;
      try {await api('POST',methodPath,{key:col.key,required:true,...(col.size?{size:col.size}:{})});}
      catch(error){
        // Columns may have been inserted concurrently by a bulk create request.
        if(error.status!==409) throw error;
      }
      console.log(`  + Column ${table.tableId}.${col.key}`);
    }
    // Wait for column initialization before creating indexes. Up to 1 minute.
    for(let trial=0;trial<30;trial++){
      const columns=await Promise.all(table.columns.map(c=>exists(`${path}/columns/${encodeURIComponent(c.key)}`)));
      if(columns.every(c=>c && (c.status===undefined || c.status==='available')))break;
      if(trial===29)throw Error(`Columns in ${table.tableId} did not become available before timeout. Check Appwrite Console and rerun.`);
      await sleep(2000);
    }
    for(const index of table.indexes){
      const ipath=`${path}/indexes/${index.key}`;
      if(await exists(ipath))continue;
      try {await api('POST',`${path}/indexes`,index);} catch(error){if(error.status!==409)throw error;}
      console.log(`  + Index ${table.tableId}.${index.key}`);
    }
  }
  console.log('\n✓ Schema provisioning complete. Run db:verify:ci to confirm.');
}catch(error){console.error(`\n✗ Provisioning stopped: ${error.message}`);process.exitCode=1;}
