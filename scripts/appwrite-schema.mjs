/** Stable schema: every field used by RUPTUREMAP's browser SDK is declared. */
const v = (key,size) => ({key,type:'varchar',size,required:true});
const i = key => ({key,type:'integer',required:true});
const m = key => ({key,type:'mediumtext',required:true});
const idx = key => ({key:`idx_${key}`,type:'key',attributes:[key]});
export const schema = [
  {tableId:'scenarios',name:'Scenario snapshots',columns:[v('owner_id',36),v('title',120),v('place',180),v('description',1000),v('scenario_type',20),v('created_at',40)],indexes:[idx('owner_id')]},
  {tableId:'systems',name:'Scenario systems',columns:[v('owner_id',36),v('scenario_id',36),v('node_key',60),v('name',120),v('subtitle',100),v('category',30),v('description',1000),i('x'),i('y'),i('resilience'),i('criticality')],indexes:[idx('scenario_id'),idx('owner_id')]},
  {tableId:'dependencies',name:'Directed dependencies',columns:[v('owner_id',36),v('scenario_id',36),v('source_key',60),v('target_key',60),i('exposure')],indexes:[idx('scenario_id'),idx('owner_id')]},
  {tableId:'runs',name:'Simulation runs',columns:[v('owner_id',36),v('scenario_id',36),v('scenario_title',120),v('root_key',60),i('severity'),i('affected'),i('critical'),i('resilience_index'),v('created_at',40),m('result_json')],indexes:[idx('owner_id'),idx('scenario_id')]}
];
