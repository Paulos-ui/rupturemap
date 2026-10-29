/** One-time provisioning. Run locally, NEVER from the browser or Vercel build. */
import { Client, TablesDB, Permission, Role } from 'node-appwrite';
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'rupturemap';
const key = process.env.APPWRITE_API_KEY;
if (!endpoint || !project || !key) {
  console.error('Missing required .env.local keys: NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY');
  process.exit(1);
}
const client = new Client().setEndpoint(endpoint).setProject(project).setKey(key);
const db = new TablesDB(client);
const varchar = (key, size=255) => ({ key, type: 'varchar', size, required: true });
const integer = key => ({ key, type: 'integer', required: true });
const float = key => ({ key, type: 'float', required: true });
const text = key => ({ key, type: 'mediumtext', required: true });
const index = key => ({key:`idx_${key}`,type:'key',attributes:[key]});
const tables = [
  {tableId:'scenarios', name:'Scenario snapshots', columns:[varchar('owner_id',36),varchar('title',120),varchar('place',180),varchar('description',1000),varchar('scenario_type',20),varchar('created_at',40)], indexes:[index('owner_id')]},
  {tableId:'systems', name:'Scenario systems', columns:[varchar('owner_id',36),varchar('scenario_id',36),varchar('node_key',60),varchar('name',120),varchar('subtitle',100),varchar('category',30),varchar('description',1000),integer('x'),integer('y'),integer('resilience'),integer('criticality')], indexes:[index('scenario_id'), index('owner_id')]},
  {tableId:'dependencies', name:'Directed dependencies', columns:[varchar('owner_id',36),varchar('scenario_id',36),varchar('source_key',60),varchar('target_key',60),integer('exposure')], indexes:[index('scenario_id'), index('owner_id')]},
  {tableId:'runs', name:'Simulation runs', columns:[varchar('owner_id',36),varchar('scenario_id',36),varchar('scenario_title',120),varchar('root_key',60),integer('severity'),integer('affected'),integer('critical'),integer('resilience_index'),varchar('created_at',40),text('result_json')], indexes:[index('owner_id'),index('scenario_id')]}
];
async function run() {
  try {
    await db.get({databaseId}); console.log(`Database ${databaseId} already exists`);
  } catch (error) {
    if (error.code !== 404) throw error;
    await db.create({databaseId,name:'RUPTUREMAP — resilience data',specification:'serverless'});
    console.log(`Created serverless database: ${databaseId}`);
  }
  for (const table of tables) {
    try {
      await db.getTable({databaseId,tableId:table.tableId});
      console.log(`Existing table: ${table.tableId}`);
    } catch (error) {
      if (error.code !== 404) throw error;
      await db.createTable({
        databaseId,
        ...table,
        rowSecurity:true,
        permissions:[Permission.create(Role.users())]
      });
      console.log(`Created table: ${table.tableId}`);
    }
  }
  console.log('\nDone. Add localhost and your Vercel hostname as Web platforms in Appwrite Console.');
  console.log('Table CREATE is permitted to sessions; READ/UPDATE/DELETE are per-row owner only.');
}
run().catch(err => {console.error('\nProvisioning failed:',err.message,err.code || '');process.exitCode=1;});
