'use client';
import { memo, useCallback, useMemo } from 'react';
import ReactFlow, { Background, BackgroundVariant, Controls, Handle, MarkerType, Position, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { Building2, Cpu, Cross, Droplets, Layers, Radio, Ship, TrainFront, Zap } from 'lucide-react';
import type { Scenario, SimulationRun, SystemCategory, SystemLink, SystemNode } from '@/lib/types';

const glyphs = { power:Zap, water:Droplets, health:Cross, mobility:TrainFront, comms:Radio, civic:Building2, digital:Cpu, supply:Ship } as const;
export const categoryLabel: Record<SystemCategory,string> = {power:'Energy',water:'Water',health:'Healthcare',mobility:'Mobility',comms:'Communications',civic:'Civic services',digital:'Digital',supply:'Supply chain'};
export const categoryTone: Record<SystemCategory,string> = {power:'amber',water:'blue',health:'mint',mobility:'lavender',comms:'steel',civic:'sand',digital:'indigo',supply:'rust'};
type SystemData = { item:SystemNode; score:number; selected:boolean; isRoot:boolean; visibleImpact:boolean; active:boolean; editor:boolean };
const SystemCard = memo(function SystemCard({data}: NodeProps) {
  const {item,score,selected,isRoot,visibleImpact,active,editor} = data as unknown as SystemData;
  const Icon = glyphs[item.category] || Layers;
  const severity = visibleImpact && score >= 65 ? 'critical' : visibleImpact && score >= 30 ? 'affected' : visibleImpact && score >= 15 ? 'watch' : 'nominal';
  return <div className={`network-node ${severity} ${selected ? 'selected' : ''} ${isRoot ? 'origin' : ''} ${active ? 'in-wave' : ''}`}>
    <Handle type="target" position={Position.Left} className="map-handle" isConnectable={editor} />
    <div className="system-card-top"><span className={`system-icon ${categoryTone[item.category]}`}><Icon size={17} strokeWidth={1.8}/></span><span className="node-signal"><span className="signal-dot"/>{visibleImpact && score >= 15 ? `${score}%`:'NOMINAL'}</span></div>
    <div className="node-title">{item.name}</div><div className="node-category">{item.subtitle}</div>
    {isRoot && <span className="origin-pill">ORIGIN</span>}
    <Handle type="source" position={Position.Right} className="map-handle" isConnectable={editor} />
  </div>;
});
const nodeTypes = { system:SystemCard };

type Props = {
  scenario: Scenario;
  run:SimulationRun|null;
  wave:number;
  selectedId:string;
  rootId:string;
  editing:boolean;
  onSelect:(id:string)=>void;
  onMove:(id:string,position:{x:number;y:number})=>void;
  onAddLink:(link:SystemLink)=>void;
  onRemoveNode:(id:string)=>void;
  onRemoveLink:(id:string)=>void;
};
export default function NetworkMap({scenario,run,wave,selectedId,rootId,editing,onSelect,onMove,onAddLink,onRemoveNode,onRemoveLink}:Props) {
  const nodes:Node[] = useMemo(()=>scenario.nodes.map(item=>{
    const impact=run?.impacts.find(x=>x.nodeId===item.id);
    return {id:item.id,type:'system',position:item.position,draggable:editing,selectable:true,data:{item,score:impact?.score ?? 0,
      visibleImpact:Boolean(run && impact && impact.wave <= wave),active:Boolean(run && impact && impact.wave === wave && impact.score >= 15),
      selected:selectedId===item.id,isRoot:rootId===item.id,editor:editing} satisfies SystemData};
  }),[scenario,run,wave,selectedId,rootId,editing]);
  const edges:Edge[] = useMemo(()=>scenario.links.map(link=>{
    const sourceImpact=run?.impacts.find(item=>item.nodeId===link.source);
    const targetImpact=run?.impacts.find(item=>item.nodeId===link.target);
    const activated=Boolean(run && sourceImpact && targetImpact && sourceImpact.wave <= wave && targetImpact.wave <= wave && targetImpact.parent === link.source && targetImpact.score>=15);
    return {id:link.id,source:link.source,target:link.target,type:'smoothstep',animated:activated,style:{stroke:activated?'#df9a74':'#55636b',strokeWidth:activated?2.4:1.45,opacity:activated?1:.58},markerEnd:{type:MarkerType.ArrowClosed,color:activated?'#df9a74':'#60717d',width:13,height:13},zIndex:activated?4:0};
  }),[scenario.links,run,wave]);
  const connect=useCallback((params:Connection)=>{
    if(!params.source || !params.target || params.source===params.target)return;
    onAddLink({id:`link-${Date.now()}`,source:params.source,target:params.target,exposure:80});
  },[onAddLink]);
  const move=useCallback((_:unknown,node:Node)=>{onMove(node.id,{x:Math.round(node.position.x),y:Math.round(node.position.y)});},[onMove]);
  return <div className="map-container">
    <div className="canvas-chrome"><span className="canvas-dot"/><span>LIVE SYSTEM TOPOLOGY</span><span className="canvas-divider">/</span><span>{scenario.nodes.length.toString().padStart(2,'0')} NODES · {scenario.links.length.toString().padStart(2,'0')} LINKS</span></div>
    <ReactFlow key={scenario.id} nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={(_,node)=>onSelect(node.id)}
      onPaneClick={()=>{}} onNodeDragStop={move} onConnect={editing?connect:undefined} nodesDraggable={editing} nodesConnectable={editing}
      nodesFocusable onNodesDelete={editing?(deleted)=>deleted.forEach(node=>onRemoveNode(node.id)):undefined}
      onEdgesDelete={editing?(deleted)=>deleted.forEach(edge=>onRemoveLink(edge.id)):undefined}
      fitView fitViewOptions={{padding:.14,maxZoom:1.05}} minZoom={.4} maxZoom={1.7}
      zoomOnDoubleClick={false} panOnScroll={false} deleteKeyCode={editing?'Backspace':null} attributionPosition="bottom-right">
      <Background variant={BackgroundVariant.Dots} color="#34414b" gap={23} size={1} />
      <Controls showInteractive={false} position="bottom-left" />
    </ReactFlow>
    <div className="map-coordinate">MODEL / {scenario.type==='cloud'?'DIGITAL':'URBAN'}-01 <span>·</span> SYNTHETIC DATA</div>
    {editing&&<div className="edit-hint">Drag nodes to arrange · Connect right-to-left handles · Backspace to remove</div>}
  </div>;
}
