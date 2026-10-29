import { Account, Client, ID, Permission, Query, Role, TablesDB } from 'appwrite';
import type { Scenario, SimulationRun, SystemNode, SystemLink } from './types';

// NEXT_PUBLIC_* values are normally baked into Next.js client bundles at build time.
// Synteq can supply them at runtime instead; the browser receives only these
// PUBLIC values from /api/appwrite-config (never an admin API key).
let databaseId = 'rupturemap';
let account: Account | null = null;
let tables: TablesDB | null = null;

export function configureAppwrite(config: {endpoint: string; projectId: string; databaseId: string}): void {
  const endpoint = config.endpoint?.trim();
  const projectId = config.projectId?.trim();
  if (!endpoint || !/^https:\/\//.test(endpoint) || !projectId || projectId.includes('your_')) {
    throw new Error('Appwrite server configuration is incomplete or invalid.');
  }
  const client = new Client().setEndpoint(endpoint).setProject(projectId);
  databaseId = config.databaseId?.trim() || 'rupturemap';
  account = new Account(client);
  tables = new TablesDB(client);
}
const perms = (userId: string) => [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))];

export async function openGuestSession(): Promise<string | null> {
  if (!account) return null;
  try {return (await account.get()).$id;} catch {await account.createAnonymousSession(); return (await account.get()).$id;}
}

export async function saveScenario(userId: string, scenario: Scenario): Promise<string> {
  if (!tables) throw new Error('Appwrite is not configured.');
  const id = ID.unique();
  const permissions = perms(userId);
  // Each save creates an immutable snapshot. No stale writes or partial overwrite of previous scenarios.
  // Write the parent row LAST: only fully built snapshots become visible in saved scenario lists.
  try {
    for (const node of scenario.nodes) {
      await tables.createRow({databaseId,tableId:'systems',rowId:ID.unique(),permissions,data:{
        owner_id:userId,scenario_id:id,node_key:node.id,name:node.name,subtitle:node.subtitle,
        category:node.category,description:node.description,x:Math.round(node.position.x),y:Math.round(node.position.y),
        resilience:node.resilience,criticality:node.criticality
      }});
    }
    for (const link of scenario.links) {
      await tables.createRow({databaseId,tableId:'dependencies',rowId:ID.unique(),permissions,data:{
        owner_id:userId,scenario_id:id,source_key:link.source,target_key:link.target,exposure:link.exposure
      }});
    }
    await tables.createRow({databaseId,tableId:'scenarios',rowId:id,permissions,data:{
      owner_id:userId,title:scenario.title,place:scenario.place,description:scenario.description,
      scenario_type:scenario.type,created_at:new Date().toISOString()
    }});
  } catch (error) {
    // Fail visibly; users can retry creating another complete snapshot.
    throw new Error(`Snapshot ${id} did not finish. Previous visible snapshots are safe; some orphaned child rows may remain. ${error instanceof Error ? error.message : String(error)}`);
  }
  return id;
}

export type ScenarioRow = { $id: string; title: string; place: string; created_at: string };
export async function listScenarioSnapshots(userId: string): Promise<ScenarioRow[]> {
  if (!tables) return [];
  const response = await tables.listRows({databaseId,tableId:'scenarios',queries:[Query.equal('owner_id',userId),Query.limit(100)]});
  return (response.rows as unknown as ScenarioRow[]).sort((a,b)=>b.created_at.localeCompare(a.created_at));
}

async function listAllScenarioRows(tableId:string, scenarioId:string) {
  if(!tables)return [];
  const collected: Array<Record<string,unknown> & {$id:string}> = [];
  let cursor: string|undefined;
  do {
    const queries=[Query.equal('scenario_id',scenarioId),Query.limit(100)];
    if(cursor)queries.push(Query.cursorAfter(cursor));
    const response=await tables.listRows({databaseId,tableId,queries});
    const page=response.rows as unknown as Array<Record<string,unknown> & {$id:string}>;
    collected.push(...page);
    cursor=page.length===100?page[page.length-1].$id:undefined;
  }while(cursor);
  return collected;
}

export async function loadScenarioSnapshot(id:string): Promise<Scenario> {
  if (!tables) throw new Error('Appwrite is not configured.');
  const [meta,rows,linksRows] = await Promise.all([
    tables.getRow({databaseId,tableId:'scenarios',rowId:id}),
    listAllScenarioRows('systems',id),
    listAllScenarioRows('dependencies',id)
  ]);
  const nodes = rows.map((row) => ({id:String(row.node_key),name:String(row.name),subtitle:String(row.subtitle),
    category:row.category as SystemNode['category'],description:String(row.description),
    position:{x:Number(row.x),y:Number(row.y)},resilience:Number(row.resilience),criticality:Number(row.criticality)}));
  const links = linksRows.map((row) => ({id:String(row.$id),source:String(row.source_key),target:String(row.target_key),exposure:Number(row.exposure)}));
  return {id, title:String(meta.title),place:String(meta.place),description:String(meta.description),type:meta.scenario_type as Scenario['type'],nodes,links};
}

export async function saveSimulationRun(userId:string, run:SimulationRun): Promise<string> {
  if (!tables) throw new Error('Appwrite is not configured.');
  const row = await tables.createRow({databaseId,tableId:'runs',rowId:ID.unique(),permissions:perms(userId),data:{
    owner_id:userId,scenario_id:run.scenarioId.slice(0,36),scenario_title:run.scenarioTitle.slice(0,120),
    root_key:run.rootId,severity:run.severity,affected:run.affected,critical:run.critical,
    resilience_index:run.resilienceIndex,created_at:run.createdAt,result_json:JSON.stringify(run)
  }});
  return row.$id;
}

export async function listSimulationRuns(userId:string): Promise<SimulationRun[]> {
  if (!tables) return [];
  const response = await tables.listRows({databaseId,tableId:'runs',queries:[Query.equal('owner_id',userId),Query.limit(100)]});
  return response.rows.map(row => {
    try { return JSON.parse(String(row.result_json)) as SimulationRun; } catch {return null;}
  }).filter((row):row is SimulationRun => row !== null).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
