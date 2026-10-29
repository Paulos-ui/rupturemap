'use client';
import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, ArrowDownRight, ArrowRight, BarChart3, Box, Check, ChevronRight, CircleHelp, Cloud, Download, GitBranch, Globe2, HardDrive, History, Info, Layers3, Link2, Map, Pause, Play, Plus, RotateCcw, Save, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, TriangleAlert, Zap } from 'lucide-react';
import NetworkMap, { categoryLabel } from './network-map';
import { DEMO_SCENARIOS, cloneScenario } from '@/lib/demo';
import { simulate } from '@/lib/engine';
import { configureAppwrite, openGuestSession, listScenarioSnapshots, listSimulationRuns, loadScenarioSnapshot, saveScenario as persistScenario, saveSimulationRun, type ScenarioRow } from '@/lib/appwrite';
import type { Scenario, SimulationRun, SystemCategory, SystemLink, SystemNode } from '@/lib/types';
import { uid } from '@/lib/types';

type View = 'overview' | 'studio' | 'history' | 'architecture';
type CloudStatus = 'checking' | 'connected' | 'preview' | 'error';
const nav = [{id:'overview' as const,label:'Command center',icon:Map},{id:'studio' as const,label:'Scenario studio',icon:GitBranch},{id:'history' as const,label:'Simulation history',icon:History},{id:'architecture' as const,label:'Architecture',icon:Layers3}];
const categories: SystemCategory[] = ['power','water','health','mobility','comms','civic','digital','supply'];
const startScenario = cloneScenario(DEMO_SCENARIOS[0]);
const dateTime = (date:string) => { const d = new Date(date); return isNaN(d.valueOf())?'Unknown date':d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
function StatCard({label,value,suffix,icon:Icon,foot,tag}:{label:string;value:string|number;suffix?:string;icon:typeof Activity;foot:string;tag?:string}) {return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon className="stat-icon" size={16}/></div><div className="stat-figure">{value}{suffix&&<span className="unit">{suffix}</span>}</div><div className="flex-between"><span className="stat-foot">{foot}</span>{tag&&<span className={`stat-tag ${tag==='MODELLED'?'orange':''}`}>{tag}</span>}</div></div>;}
function ActionButton({children,onClick,icon:Icon,kind='secondary',disabled=false}:{children:React.ReactNode;onClick:()=>void;icon:typeof Activity;kind?:'primary'|'secondary'|'ghost';disabled?:boolean}) {return <button className={`${kind}-btn`} onClick={onClick} disabled={disabled}><Icon size={15}/>{children}</button>;}

export default function CommandCenter(){
  const [view,setView]=useState<View>('overview');
  const [scenario,setScenario]=useState<Scenario>(startScenario);
  const [selectedId,setSelectedId]=useState('grid');
  const [rootId,setRootId]=useState('grid');
  const [severity,setSeverity]=useState(100);
  const [interventionEnabled,setInterventionEnabled]=useState(false);
  const [interventionTarget,setInterventionTarget]=useState('water');
  const [interventionBoost,setInterventionBoost]=useState(55);
  const [result,setResult]=useState<SimulationRun|null>(null);
  const [baseline,setBaseline]=useState<SimulationRun|null>(null);
  const [wave,setWave]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [history,setHistory]=useState<SimulationRun[]>([]);
  const [snapshots,setSnapshots]=useState<Scenario[]>([]);
  const [cloudSnapshots,setCloudSnapshots]=useState<ScenarioRow[]>([]);
  const [userId,setUserId]=useState<string|null>(null);
  const [cloudStatus,setCloudStatus]=useState<CloudStatus>('checking');
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState<{message:string;error?:boolean}|null>(null);
  const [newName,setNewName]=useState('');
  const [newCategory,setNewCategory]=useState<SystemCategory>('digital');
  const [linkFrom,setLinkFrom]=useState('');
  const [linkTo,setLinkTo]=useState('');
  const [linkExposure,setLinkExposure]=useState(80);
  const [search,setSearch]=useState('');

  const notify=useCallback((message:string,error=false)=>setToast({message,error}),[]);
  useEffect(()=>{
    try {
      const local = localStorage.getItem('rupturemap:history');
      const stored = localStorage.getItem('rupturemap:snapshots');
      if(local)setHistory(JSON.parse(local) as SimulationRun[]);
      if(stored)setSnapshots(JSON.parse(stored) as Scenario[]);
    }catch{/* corrupted cache should not prevent a visitor from using the demo */}
    let active=true;
    void (async () => {
      try {
        // Fetch PUBLIC connection information from the running Synteq server.
        // This still works when NEXT_PUBLIC_* values were unavailable during build.
        const response = await fetch('/api/appwrite-config', {cache:'no-store'});
        if(!response.ok) throw new Error(`Configuration endpoint returned HTTP ${response.status}`);
        const config = await response.json() as {
          configured:boolean;endpoint?:string;projectId?:string;databaseId?:string;missing?:string[];
        };
        if(!active)return;
        if(!config.configured) {
          setCloudStatus('preview');
          notify(`Synteq runtime configuration missing: ${(config.missing||[]).join(', ') || 'Appwrite variables'}. Set scope to Both and redeploy.`,true);
          return;
        }
        configureAppwrite({endpoint:config.endpoint||'',projectId:config.projectId||'',databaseId:config.databaseId||'rupturemap'});
        const user = await openGuestSession();
        if(!active)return;
        if(!user)throw new Error('Appwrite did not create a user session.');
        // A session alone does not prove the database is accessible.
        const [remoteScenarios,remoteRuns]=await Promise.allSettled([listScenarioSnapshots(user),listSimulationRuns(user)]);
        if(!active)return;
        if(remoteScenarios.status==='rejected'||remoteRuns.status==='rejected') {
          setCloudStatus('error');
          const rejected=remoteScenarios.status==='rejected'?remoteScenarios.reason:remoteRuns.status==='rejected'?remoteRuns.reason:null;
          notify(`Appwrite database verification failed: ${messageOf(rejected)}`,true);
          return;
        }
        setUserId(user);
        setCloudStatus('connected');
        setCloudSnapshots(remoteScenarios.value);
        setHistory(previous=>mergeRuns(remoteRuns.value,previous));
      } catch(error) {
        if(active){setCloudStatus('error');notify(`Appwrite connection failed: ${messageOf(error)}`,true);}
      }
    })();
    return ()=>{active=false;};
  },[notify]);
  useEffect(()=>{try{localStorage.setItem('rupturemap:history',JSON.stringify(history.slice(0,50)));}catch{/* storage disabled */}},[history]);
  useEffect(()=>{try{localStorage.setItem('rupturemap:snapshots',JSON.stringify(snapshots.slice(0,20)));}catch{/* storage disabled */}},[snapshots]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),5200);return ()=>clearTimeout(timer);},[toast]);
  const maxWave=Math.max(0,...(result?.events.map(event=>event.wave)??[0]));
  useEffect(()=>{if(!playing||!result)return;const timer=setInterval(()=>{setWave(previous=>{
    if(previous>=maxWave){setPlaying(false);return previous;}return previous+1;
  });},950);return()=>clearInterval(timer);},[playing,result,maxWave]);
  const selected=scenario.nodes.find(n=>n.id===selectedId)||scenario.nodes[0];
  const root=scenario.nodes.find(n=>n.id===rootId)||scenario.nodes[0];
  const impact=result?.impacts.find(x=>x.nodeId===selected?.id);
  const affectedCount=result?.affected??0;
  const resilience=result?.resilienceIndex??Math.round(scenario.nodes.reduce((sum,node)=>sum+node.resilience,0)/Math.max(scenario.nodes.length,1));

  const clearRun=useCallback(()=>{setResult(null);setBaseline(null);setWave(0);setPlaying(false);},[]);
  const chooseScenario=useCallback((next:Scenario)=>{
    const copy=cloneScenario(next);setScenario(copy);setSelectedId(copy.nodes[0]?.id||'');setRootId(copy.nodes[0]?.id||'');setInterventionTarget(copy.nodes[1]?.id||copy.nodes[0]?.id||'');setView('overview');clearRun();
  },[clearRun]);
  const changeScenario=useCallback((fn:(current:Scenario)=>Scenario)=>{setScenario(current=>fn(current));clearRun();},[clearRun]);
  const updateNode=useCallback((id:string,patch:Partial<SystemNode>)=>{
    changeScenario(current=>({...current,nodes:current.nodes.map(node=>node.id===id?{...node,...patch}:node)}));
  },[changeScenario]);
  const moveNode=useCallback((id:string,position:{x:number;y:number})=>updateNode(id,{position}),[updateNode]);
  const addLink=useCallback((link:SystemLink)=>{
    if(scenario.links.length>=120){notify('Maximum 120 dependencies in the interactive demo.',true);return;}
    if(scenario.links.some(l=>l.source===link.source&&l.target===link.target)){notify('That dependency already exists.');return;}
    changeScenario(current=>({...current,links:[...current.links,link]}));notify('Directed dependency added.');
  },[scenario.links,changeScenario,notify]);
  const removeNode=useCallback((id:string)=>{
    if(scenario.nodes.length<=2){notify('Keep at least two systems in the network.',true);return;}
    changeScenario(current=>({...current,nodes:current.nodes.filter(n=>n.id!==id),links:current.links.filter(l=>l.source!==id&&l.target!==id)}));
    if(selectedId===id)setSelectedId(scenario.nodes.find(n=>n.id!==id)?.id||'');
    if(rootId===id)setRootId(scenario.nodes.find(n=>n.id!==id)?.id||'');
  },[changeScenario,scenario.nodes,notify,selectedId,rootId]);
  const removeLink=useCallback((id:string)=>changeScenario(current=>({...current,links:current.links.filter(l=>l.id!==id)})),[changeScenario]);

  const run=useCallback(()=>{
    if(!scenario.nodes.find(n=>n.id===rootId)) {notify('Choose a valid origin system.',true);return;}
    const base=simulate(scenario,rootId,severity);
    const interventions=interventionEnabled&&interventionTarget!==rootId?[{nodeId:interventionTarget,boost:interventionBoost}]:[];
    const next=simulate(scenario,rootId,severity,interventions);
    setBaseline(base);setResult(next);setWave(0);setPlaying(true);
    setHistory(previous=>mergeRuns([next],previous));
    notify(interventions.length?'Simulation finished. Compare the protected system with the baseline.':'Simulation finished. Explore the cascade replay.');
    if(userId){void saveSimulationRun(userId,next).catch(error=>notify(`Run saved locally, but cloud history failed: ${messageOf(error)}`,true));}
  },[scenario,rootId,severity,interventionEnabled,interventionTarget,interventionBoost,userId,notify]);

  const saveSnapshot=useCallback(async()=>{
    if(!scenario.nodes.length||!scenario.title.trim()){notify('Add a scenario name and at least one system.',true);return;}
    if(busy)return;
    setBusy(true);
    try{
      const localCopy=cloneScenario({...scenario,id:uid()});
      setSnapshots(previous=>[localCopy,...previous].slice(0,20));
      if(userId){
        const id=await persistScenario(userId,scenario);
        setCloudSnapshots(previous=>[{ $id:id,title:scenario.title,place:scenario.place,created_at:new Date().toISOString() },...previous]);
        notify('Immutable snapshot saved to Appwrite TablesDB and this browser.');
      }else notify('Snapshot saved in this browser. Connect Appwrite to enable cloud persistence.');
    }catch(error){notify(`Local snapshot kept. Appwrite save failed: ${messageOf(error)}`,true);}finally{setBusy(false);}
  },[scenario,userId,busy,notify]);

  const loadCloud=useCallback(async(id:string)=>{
    try{setBusy(true);const remote=await loadScenarioSnapshot(id);chooseScenario(remote);notify('Cloud snapshot loaded.');}
    catch(error){notify(`Unable to load snapshot: ${messageOf(error)}`,true);}finally{setBusy(false);}
  },[chooseScenario,notify]);
  const loadRun=useCallback((run:SimulationRun)=>{
    const matches=run.scenarioId===scenario.id || run.scenarioTitle===scenario.title;
    if(!matches){notify('This run belongs to a different scenario. Load that scenario first to replay its network.',true);return;}
    setResult(run);setBaseline(simulate(scenario,run.rootId,run.severity));setRootId(run.rootId);setWave(0);setPlaying(true);setView('overview');
  },[scenario,notify]);
  const exportJson=useCallback(()=>{
    const data=JSON.stringify({schema:'rupturemap.v1',scenario,result,exportedAt:new Date().toISOString(),disclaimer:'Synthetic dependency simulation; not a verified infrastructure forecast.'},null,2);
    const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`rupturemap-${scenario.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.json`;a.click();URL.revokeObjectURL(url);
    notify('Scenario JSON exported.');
  },[scenario,result,notify]);
  const cloneNew=useCallback(()=>{
    const next=cloneScenario({...scenario,id:uid(),title:`${scenario.title} · Variant`,type:'custom'});chooseScenario(next);setView('studio');notify('New editable scenario created. Save a snapshot when ready.');
  },[scenario,chooseScenario,notify]);
  const addSystem=useCallback(()=>{
    if(!newName.trim()){notify('Enter a system name.',true);return;}
    if(scenario.nodes.length>=30){notify('Maximum 30 systems per scenario for this demo.',true);return;}
    const id=`n-${uid().slice(0,12)}`;
    const node:SystemNode={id,name:newName.trim().slice(0,100),subtitle:categoryLabel[newCategory].toUpperCase(),category:newCategory,description:'Custom system. Select the card to describe its function and change its resilience.',position:{x:125+(scenario.nodes.length%3)*240,y:95+Math.floor(scenario.nodes.length/3)*140},resilience:40,criticality:3};
    changeScenario(current=>({...current,nodes:[...current.nodes,node]}));setSelectedId(id);setNewName('');notify('System added. Draw a connection or use the dependency builder.');
  },[newName,newCategory,scenario.nodes.length,changeScenario,notify]);
  const activeEvent=result?.events.filter(event=>event.wave<=wave).slice(0,4)??[];
  const filteredHistory=history.filter(run=>`${run.scenarioTitle} ${run.rootId}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="wordmark"><div className="logo-mark"><GitBranch size={21} strokeWidth={2.1}/></div><div><div className="wordmark-text">RUPTUREMAP</div><span className="wordmark-sub">RESILIENCE LABORATORY</span></div></div>
      <div className="side-label">WORKSPACE</div><nav className="nav-list" aria-label="Main navigation">
        {nav.map(item=><button key={item.id} className={`nav-item ${view===item.id?'active':''}`} onClick={()=>setView(item.id)}><item.icon size={18}/><span>{item.label}</span>{item.id==='history'&&history.length>0&&<b className="nav-count">{history.length}</b>}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="model-card"><div className="tiny-icon"><Sparkles size={13}/> A NEW WAY TO SEE RISK</div><h3>Every system has a second-order story.</h3><p>Trace hidden connections. Model failures. Explore more resilient alternatives.</p></div><div className="user-pill"><div className="avatar">R</div><div><strong>Research workspace</strong><small>{userId?'Private cloud session':'Local preview session'}</small></div></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb"><Globe2 size={15}/><span className="crumb-middle">Rupturemap</span><ChevronRight size={13}/><strong>{nav.find(item=>item.id===view)?.label}</strong></div><div className="top-actions"><span className="top-time">EXPLORE / 01</span><span title={cloudStatus==='error'?'Appwrite is not fully connected or its database is not ready':cloudStatus==='preview'?'Add Appwrite environment variables for cloud persistence':'Appwrite connection'} className={`status-badge ${cloudStatus==='preview'||cloudStatus==='error'?'preview':''}`}><i className="online-dot"/>{cloudStatus==='connected'?'Appwrite connected':cloudStatus==='checking'?'Connecting…':cloudStatus==='error'?'Cloud unavailable':'Preview mode'}</span><button className="icon-btn" aria-label="About the model" title="Read the model documentation" onClick={()=>setView('architecture')}><CircleHelp size={16}/></button></div></header>
      <div className="content">
        {view==='overview'&&<>
          <div className="heading-row"><div><div className="eyebrow"><span className="line"/> THE RESILIENCE COMMAND CENTER</div><h1 className="page-title">See what <em>breaks next.</em></h1><p className="page-lead">Explore the invisible dependencies holding systems together. Inject a failure, follow its cascade, then design a stronger response.</p></div><div className="heading-tools"><select className="scenario-selector" aria-label="Choose demonstration scenario" value={DEMO_SCENARIOS.find(s=>s.id===scenario.id)?.id||'custom'} onChange={event=>{const s=DEMO_SCENARIOS.find(s=>s.id===event.target.value);if(s)chooseScenario(s);}}><option value="custom" disabled>✦ {scenario.title}</option>{DEMO_SCENARIOS.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><ActionButton icon={Download} onClick={exportJson}>Export</ActionButton><ActionButton icon={Save} onClick={()=>void saveSnapshot()} kind="primary" disabled={busy}>{busy?'Saving…':'Save snapshot'}</ActionButton></div></div>
          <div className="overview-stats"><StatCard label="Mapped systems" value={scenario.nodes.length.toString().padStart(2,'0')} icon={Layers3} foot="Active network components" tag="LIVE"/><StatCard label="Connections" value={scenario.links.length.toString().padStart(2,'0')} icon={GitBranch} foot="Directed dependencies"/><StatCard label="Affected systems" value={affectedCount.toString().padStart(2,'0')} icon={TriangleAlert} foot={result?'Impact score ≥30':'Awaiting simulation'} tag={result?'MODELLED':undefined}/><StatCard label="Resilience index" value={resilience} suffix="/100" icon={ShieldCheck} foot={result?'Synthetic model score':'Average baseline rating'}/></div>
          <div className="workspace"><section className="panel map-panel"><div className="panel-heading"><div><div className="panel-title">{scenario.title} <span style={{color:'#789098',fontWeight:400}}>/ Network canvas</span></div><div className="panel-caption">{scenario.place} · Directed graph</div></div><div className={`map-status ${result?'hot':''}`}>{result?'● CASCADE SIMULATED':'● ALL SYSTEMS NOMINAL'}</div></div><NetworkMap scenario={scenario} run={result} wave={wave} selectedId={selectedId} rootId={rootId} editing={false} onSelect={setSelectedId} onMove={moveNode} onAddLink={addLink} onRemoveNode={removeNode} onRemoveLink={removeLink}/></section>
            <section className="panel inspector"><div className="panel-heading"><div><div className="panel-title">Simulation control</div><div className="panel-caption">Model a new disruption</div></div><SlidersHorizontal size={17} color="#b6a08d"/></div><div className="inspector-body"><div className="inspect-intro"><div className="inspect-large-icon"><Zap size={20}/></div><div><h3>Failure injection</h3><p>Deterministic cascade engine</p></div></div><p className="inspect-description">Choose the first point of failure and the severity. Downstream systems respond according to directed dependencies and their resilience.</p>
                <div className="field-caption">ORIGIN SYSTEM</div><select className="select-field" value={rootId} aria-label="Failure origin" onChange={e=>{setRootId(e.target.value);if(interventionTarget===e.target.value)setInterventionTarget(scenario.nodes.find(n=>n.id!==e.target.value)?.id||'');clearRun();}}>{scenario.nodes.map(node=><option key={node.id} value={node.id}>{node.name}</option>)}</select>
                <label className="form-label" htmlFor="severity"><span>Disruption intensity</span><strong>{severity}%</strong></label><input className="range-input" id="severity" type="range" min="10" max="100" step="5" value={severity} onChange={e=>{setSeverity(+e.target.value);clearRun();}}/><div className="help-line">Intensity is a synthetic model input, not a measured risk probability.</div>
                <div className="divider"/><div className="toggle-row"><span><strong style={{color:'#d4ddd9'}}>Add an intervention</strong><br/><span style={{fontSize:10,color:'#83949c'}}>Protect one downstream system</span></span><button aria-label="Toggle intervention" aria-pressed={interventionEnabled} className={`toggle ${interventionEnabled?'on':''}`} onClick={()=>{setInterventionEnabled(v=>!v);clearRun();}}/></div>
                {interventionEnabled&&<><label className="form-label"><span>Protected component</span></label><select className="select-field" value={interventionTarget} onChange={e=>{setInterventionTarget(e.target.value);clearRun();}}>{scenario.nodes.filter(n=>n.id!==rootId).map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select><label className="form-label" htmlFor="boost"><span>Resilience boost</span><strong>+{interventionBoost}</strong></label><input className="range-input" id="boost" type="range" min="10" max="80" step="5" value={interventionBoost} onChange={e=>{setInterventionBoost(+e.target.value);clearRun();}}/></>}
                {result&&<><div className="divider"/><div className="sim-summary"><span className="field-caption">MODEL OUTCOME</span><div className="flex-between"><strong>{result.affected} <small style={{fontSize:11,fontWeight:400}}>affected</small></strong><span style={{fontSize:10,color:'#d9a985'}}>Index {result.resilienceIndex}/100</span></div><div className="impact-bar"><div className="impact-fill" style={{width:`${(result.affected/Math.max(scenario.nodes.length,1))*100}%`}}/></div><p>{interventionEnabled&&baseline?`Without intervention: ${baseline.affected} affected · baseline index ${baseline.resilienceIndex}.`:`${result.critical} systems have critical modelled impact.`}</p></div></>}
              </div><div className="inspector-footer"><button className="primary-btn" onClick={run}><Activity size={16}/> Run failure simulation <ArrowRight size={15}/></button><p className="help-line" style={{textAlign:'center',marginTop:11}}>Tap any node on the map to inspect its status.</p></div></section></div>
          <div className="lower-grid"><section className="panel timeline"><div className="timeline-header"><div><div className="panel-title">Cascade replay</div><div className="panel-caption">{result?'Explore system impacts wave by wave':'Ready to record a new simulation'}</div></div>{result&&<div style={{display:'flex',gap:8}}><button className="icon-btn" aria-label={playing?'Pause replay':'Play replay'} onClick={()=>{if(wave>=maxWave)setWave(0);setPlaying(!playing);}}>{playing?<Pause size={14}/>:<Play size={14}/>}</button><button className="icon-btn" aria-label="Restart replay" onClick={()=>{setWave(0);setPlaying(true);}}><RotateCcw size={14}/></button></div>}</div>
              {result?<><div className="timeline-body">{activeEvent.length?activeEvent.map(event=><div className={`timeline-event ${event.score>=65?'alert':''}`} key={event.nodeId}><small>WAVE {event.wave.toString().padStart(2,'0')}</small><b>{scenario.nodes.find(node=>node.id===event.nodeId)?.name??event.nodeId}</b><span>{event.score}% exposure</span></div>):<p className="placeholder-copy">Replaying initial disruption…</p>}</div><div className="timeline-control"><span className="timeline-step">00</span><input aria-label="Replay wave" className="range-input" type="range" min="0" max={Math.max(1,maxWave)} value={wave} onChange={e=>{setPlaying(false);setWave(+e.target.value);}}/><span className="timeline-step">WAVE {wave.toString().padStart(2,'0')} / {maxWave.toString().padStart(2,'0')}</span></div></>:<p className="placeholder-copy">No simulation yet. Select a failure origin and press <strong>Run failure simulation</strong> to reveal the dependency chain.</p>}</section>
            <section className="panel intelligence"><div className="panel-title">Selected system <span style={{color:'#81939a',fontWeight:400}}> / Inspection</span></div><div className="panel-caption">Live model context and direct dependencies</div>{selected?<><div className="info-line"><Box size={15}/><div><strong>{selected.name}</strong><br/>{selected.description}</div></div><div className="info-line"><ShieldCheck size={15}/><div><strong>Resilience {selected.resilience}/100</strong> · criticality {selected.criticality}/5{impact?` · modelled impact ${impact.score}%`:''}</div></div><div className="info-line"><GitBranch size={15}/><div>{scenario.links.filter(l=>l.source===selected.id).length} outgoing dependencies · {scenario.links.filter(l=>l.target===selected.id).length} incoming</div></div></>:<p className="placeholder-copy">Select a system from the network.</p>}</section></div>
        </>}
        {view==='studio'&&<><div className="heading-row"><div><div className="eyebrow"><span className="line"/> DESIGN THE NETWORK</div><h1 className="page-title">Scenario <em>studio.</em></h1><p className="page-lead">Every node and link is editable. Build your own system and save immutable versions to Appwrite.</p></div><div className="heading-tools"><ActionButton icon={Plus} onClick={cloneNew}>Fork scenario</ActionButton><ActionButton icon={Download} onClick={exportJson}>Export JSON</ActionButton><ActionButton icon={Save} kind="primary" onClick={()=>void saveSnapshot()} disabled={busy}>{busy?'Saving…':'Save snapshot'}</ActionButton></div></div>
          <div className="page-section"><div className="flex-between" style={{marginBottom:17}}><div><div className="panel-title">Network editor</div><div className="panel-caption">Drag components · Connect handles · Click to select</div></div><span className="pill">EDIT MODE</span></div><div className="studio-grid"><div><label className="form-label">Scenario name</label><input className="text-field" maxLength={120} value={scenario.title} onChange={e=>changeScenario(s=>({...s,title:e.target.value}))}/></div><div><label className="form-label">Network context</label><input className="text-field" maxLength={180} value={scenario.place} onChange={e=>changeScenario(s=>({...s,place:e.target.value}))}/></div></div></div>
          <div className="workspace"><section className="panel map-panel"><div className="panel-heading"><div><div className="panel-title">Topology editor</div><div className="panel-caption">Connect from the right handle to the left handle of another component</div></div><span className="map-status">● EDITING ENABLED</span></div><NetworkMap scenario={scenario} run={null} wave={0} selectedId={selectedId} rootId={rootId} editing onSelect={setSelectedId} onMove={moveNode} onAddLink={addLink} onRemoveNode={removeNode} onRemoveLink={removeLink}/></section>
            <section className="panel inspector"><div className="panel-heading"><div><div className="panel-title">Component properties</div><div className="panel-caption">Select a system to edit</div></div><Settings2 size={16}/></div><div className="inspector-body">{selected&&<><label className="form-label">System name</label><input className="text-field" maxLength={100} value={selected.name} onChange={e=>updateNode(selected.id,{name:e.target.value})}/><label className="form-label">Category</label><select className="select-field" value={selected.category} onChange={e=>updateNode(selected.id,{category:e.target.value as SystemCategory})}>{categories.map(category=><option key={category} value={category}>{categoryLabel[category]}</option>)}</select><label className="form-label">Description</label><textarea className="text-field" value={selected.description} onChange={e=>updateNode(selected.id,{description:e.target.value.slice(0,900)})}/><label className="form-label"><span>Resilience</span><strong>{selected.resilience}/100</strong></label><input className="range-input" type="range" value={selected.resilience} min={0} max={100} step={5} onChange={e=>updateNode(selected.id,{resilience:+e.target.value})}/><label className="form-label"><span>Criticality</span><strong>{selected.criticality}/5</strong></label><input className="range-input" type="range" value={selected.criticality} min={1} max={5} step={1} onChange={e=>updateNode(selected.id,{criticality:+e.target.value})}/><div className="divider"/><button className="secondary-btn" style={{color:'#de9c8e'}} onClick={()=>removeNode(selected.id)} disabled={scenario.nodes.length<=2}><Trash2 size={14}/> Remove system</button></>}</div></section></div>
          <div className="studio-grid" style={{marginTop:17}}><section className="page-section"><div className="panel-title" style={{marginBottom:18}}>Add a system</div><div className="studio-form"><label>Name<input className="text-field" placeholder="e.g. Backup power facility" value={newName} maxLength={100} onChange={e=>setNewName(e.target.value)}/></label><label>Category<select className="select-field" value={newCategory} onChange={e=>setNewCategory(e.target.value as SystemCategory)}>{categories.map(category=><option key={category} value={category}>{categoryLabel[category]}</option>)}</select></label><button className="primary-btn" onClick={addSystem}><Plus size={15}/> Add component</button></div></section>
            <section className="page-section"><div className="panel-title" style={{marginBottom:18}}>Create a directed dependency</div><div className="studio-form"><div className="form-grid"><label>Supplier<select className="select-field" value={linkFrom} onChange={e=>setLinkFrom(e.target.value)}><option value="">Select supplier</option>{scenario.nodes.map(n=><option value={n.id} key={n.id}>{n.name}</option>)}</select></label><label>Dependent<select className="select-field" value={linkTo} onChange={e=>setLinkTo(e.target.value)}><option value="">Select dependent</option>{scenario.nodes.map(n=><option value={n.id} key={n.id}>{n.name}</option>)}</select></label></div><label className="form-label"><span>Exposure strength</span><strong>{linkExposure}%</strong></label><input className="range-input" type="range" value={linkExposure} min={5} max={100} step={5} onChange={e=>setLinkExposure(+e.target.value)}/><button className="secondary-btn" disabled={!linkFrom||!linkTo||linkFrom===linkTo} onClick={()=>addLink({id:uid(),source:linkFrom,target:linkTo,exposure:linkExposure})}><Link2 size={15}/> Add dependency</button></div></section></div>
          <section className="page-section"><div className="flex-between" style={{marginBottom:15}}><div><div className="panel-title">Dependency register</div><div className="panel-caption">Directed edges encode impact pathways</div></div><span className="pill">{scenario.links.length} LINKED</span></div><div className="studio-grid">{scenario.links.map(link=><div key={link.id} className="studio-row"><GitBranch size={14} color="#d4a685"/><div style={{flex:1,minWidth:0}}><strong>{scenario.nodes.find(n=>n.id===link.source)?.name} → {scenario.nodes.find(n=>n.id===link.target)?.name}</strong><small>Exposure strength {link.exposure}%</small></div><button className="icon-btn" aria-label="Delete dependency" onClick={()=>removeLink(link.id)}><Trash2 size={13}/></button></div>)}</div></section>
        </>}
        {view==='history'&&<><div className="heading-row"><div><div className="eyebrow"><span className="line"/> IMMUTABLE DECISIONS</div><h1 className="page-title">Every run, <em>remembered.</em></h1><p className="page-lead">Review the consequences of earlier scenarios. Your browser retains recent runs; Appwrite syncs private cloud history when connected.</p></div><div className="heading-tools"><ActionButton icon={Save} kind="primary" onClick={()=>void saveSnapshot()} disabled={busy}>Save current scenario</ActionButton></div></div>
          <div className="studio-grid"><section className="page-section"><div className="flex-between" style={{marginBottom:18}}><div><div className="panel-title">Simulation history</div><div className="panel-caption">Saved in this browser {cloudStatus==='connected'?'and Appwrite':'· cloud sync not active'}</div></div><span className="pill">{history.length} RUNS</span></div><div style={{position:'relative',marginBottom:18}}><Search size={15} style={{position:'absolute',left:12,top:12,color:'#809ba5'}}/><input className="text-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by scenario or origin" style={{paddingLeft:36}}/></div><div className="stack">{filteredHistory.length?filteredHistory.map(run=><button key={run.id} onClick={()=>loadRun(run)} className="history-card" style={{textAlign:'left',width:'100%',cursor:'pointer'}}><span className="history-mark"><Activity size={20}/></span><span style={{flex:1,minWidth:0}}><strong>{run.scenarioTitle}</strong><p>{dateTime(run.createdAt)} · {run.severity}% disruption · {run.interventions.length?'Intervention':'Baseline'}</p></span><span className="history-meta"><strong>{run.affected}/{run.impacts.length}</strong><small>AFFECTED</small></span><ChevronRight size={16} color="#8497a1"/></button>):<p className="placeholder-copy">No matching runs yet. Return to Command Center and simulate a disruption.</p>}</div></section>
            <section className="page-section"><div className="flex-between" style={{marginBottom:18}}><div><div className="panel-title">Saved scenario snapshots</div><div className="panel-caption">Reopen your system graphs</div></div><span className="pill">{snapshots.length+cloudSnapshots.length} SAVED</span></div>
              <div className="stack">{cloudSnapshots.map(row=><button key={row.$id} className="history-card" style={{width:'100%',textAlign:'left'}} disabled={busy} onClick={()=>void loadCloud(row.$id)}><span className="history-mark"><Cloud size={18}/></span><span style={{flex:1}}><strong>{row.title}</strong><p>Appwrite TablesDB · {dateTime(row.created_at)}</p></span><ChevronRight size={16}/></button>)}{snapshots.map(item=><button key={item.id} className="history-card" style={{width:'100%',textAlign:'left'}} onClick={()=>chooseScenario(item)}><span className="history-mark"><HardDrive size={18}/></span><span style={{flex:1}}><strong>{item.title}</strong><p>Browser snapshot · {item.nodes.length} systems</p></span><ChevronRight size={16}/></button>)}{!snapshots.length&&!cloudSnapshots.length&&<p className="placeholder-copy">Save your first snapshot from Command Center or Scenario Studio.</p>}</div><p className="small-note" style={{marginTop:18}}>Anonymous Appwrite sessions cannot be recovered if cookies are cleared or you switch devices. Export JSON for a portable backup.</p></section></div>
        </>}
        {view==='architecture'&&<><div className="heading-row"><div><div className="eyebrow"><span className="line"/> OPEN ENGINEERING</div><h1 className="page-title">Built on <em>relationships.</em></h1><p className="page-lead">RUPTUREMAP is a deterministic simulation laboratory, with normalized Appwrite TablesDB storage and no invented risk predictions.</p></div><div className="heading-tools"><ActionButton icon={Download} onClick={exportJson}>Export current graph</ActionButton></div></div><div className="alert-banner"><Info size={17}/> Every network and score in this demo is synthetic and illustrative. This software does not forecast actual disasters or recommend real-world emergency actions.</div>
          <div className="arch-grid"><div className="arch-card"><div className="eyebrow"><Box size={14}/> TABLE 01</div><h3>scenarios</h3><p>Immutable scenario headers with owner identification, domain, description, and creation time.</p><code>owner_id · title · scenario_type</code></div><div className="arch-card"><div className="eyebrow"><Layers3 size={14}/> TABLE 02</div><h3>systems</h3><p>Typed system records with resilience, criticality, spatial coordinates and category. Every system belongs to a scenario snapshot.</p><code>scenario_id · node_key · resilience</code></div><div className="arch-card"><div className="eyebrow"><GitBranch size={14}/> TABLE 03</div><h3>dependencies</h3><p>Directed graph edges preserving source, destination and exposure strength. Indexed by scenario ID for reconstruction.</p><code>source_key · target_key · exposure</code></div><div className="arch-card"><div className="eyebrow"><Activity size={14}/> TABLE 04</div><h3>runs</h3><p>Private event-sourced history containing origin, severity, aggregated outcomes, and the full replay as a JSON payload.</p><code>affected · resilience_index · result_json</code></div></div>
          <section className="page-section" style={{marginTop:18}}><div className="panel-title">How the simulation works</div><div className="studio-grid" style={{marginTop:13}}><div className="info-line"><ArrowDownRight size={17}/><div><strong>1. Inject.</strong> Origin starts at the disruption intensity you choose. Impacts follow directed dependencies, not arbitrary visual proximity.</div></div><div className="info-line"><GitBranch size={17}/><div><strong>2. Propagate.</strong> Each link transmits a fraction of the source impact. The destination node's resilience attenuates it.</div></div><div className="info-line"><ShieldCheck size={17}/><div><strong>3. Intervene.</strong> A resilience boost reduces a system's received disruption and subsequent downstream effects.</div></div><div className="info-line"><BarChart3 size={17}/><div><strong>4. Compare.</strong> Impact levels are synthetic 0–100 scores; the resilience index is 100 minus criticality-weighted mean impact.</div></div></div><div className="divider"/><div className="flex-between"><p className="small-note">Appwrite uses create-only table permissions plus private owner-specific row permissions. Browser preview works without credentials; real TablesDB storage needs the setup script and valid environment variables.</p><button className="secondary-btn" onClick={()=>setView('overview')}><ArrowRight size={15}/> Return to map</button></div></section>
        </>}
      </div>
    </main>
    {toast&&<div className={`toast ${toast.error?'error':''}`} role="status" onClick={()=>setToast(null)}>{toast.error?<AlertCircle size={14} style={{verticalAlign:'middle',marginRight:8}}/>:<Check size={14} style={{verticalAlign:'middle',marginRight:8}}/>}{toast.message}</div>}
  </div>;
}
function messageOf(error:unknown){return error instanceof Error?error.message:String(error);}
function mergeRuns(newRuns:SimulationRun[], existing:SimulationRun[]):SimulationRun[]{const ids=new Set<string>();return [...newRuns,...existing].filter(run=>{if(ids.has(run.id))return false;ids.add(run.id);return true;}).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,50);}
