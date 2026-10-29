/**
 * Explainable *synthetic* dependency-propagation model; not a real-world forecast.
 * A link's exposure indicates how much upstream disruption can travel downstream.
 * Node resilience and interventions dampen that disruption.
 * The strongest incoming path wins; this avoids double-counting shared dependencies.
 * Every node may only be updated by a higher score and there are finite scores,
 * so cycles settle without producing a runaway cascade.
 */
export function simulate(scenario, rootId, severity, interventions = [], runId = `run-${Date.now()}`) {
  if (!scenario.nodes.some(node => node.id === rootId)) throw new Error('Choose a system to simulate.');
  const normalizedSeverity = Math.max(0, Math.min(100, severity));
  const scores = new Map(scenario.nodes.map(node => [node.id, 0]));
  const waves = new Map(scenario.nodes.map(node => [node.id, -1]));
  const parents = new Map(scenario.nodes.map(node => [node.id, null]));
  const byId = new Map(scenario.nodes.map(node => [node.id, node]));
  const boostById = new Map(interventions.map(item => [item.nodeId, Math.max(0, Math.min(100, item.boost))]));
  scores.set(rootId, normalizedSeverity);
  waves.set(rootId, 0);
  const queue = [rootId];
  let iterations = 0;
  while (queue.length && iterations < scenario.nodes.length * scenario.links.length * 2 + 10) {
    iterations++;
    const source = queue.shift();
    const upstream = scores.get(source);
    for (const link of scenario.links.filter(link => link.source === source)) {
      if (link.target === rootId) continue;
      const dest = byId.get(link.target);
      if (!dest) continue;
      const effectiveResilience = Math.min(100, dest.resilience + (boostById.get(dest.id) ?? 0));
      const attenuation = Math.max(0, 1 - effectiveResilience * 0.007);
      const next = Math.round(upstream * (Math.max(0, Math.min(100, link.exposure)) / 100) * attenuation * 100) / 100;
      if (next <= (scores.get(dest.id) ?? 0) + 0.01) continue;
      scores.set(dest.id, next);
      const candidateWave = (waves.get(source) ?? 0) + 1;
      waves.set(dest.id, candidateWave);
      parents.set(dest.id, source);
      queue.push(dest.id);
    }
  }
  const impacts = scenario.nodes.map(node => ({ nodeId: node.id, score: Math.round(scores.get(node.id) ?? 0), wave: waves.get(node.id) ?? -1, parent: parents.get(node.id) ?? null }));
  const events = impacts.filter(item => item.score >= 15).sort((a,b) => a.wave - b.wave || b.score - a.score).map(item => ({ wave: item.wave, nodeId: item.nodeId, score: item.score, source: item.parent }));
  const affected = impacts.filter(item => item.score >= 30).length;
  const critical = impacts.filter(item => item.score >= 65).length;
  const totalWeight = scenario.nodes.reduce((sum,node) => sum + node.criticality,0) || 1;
  const weightedExposure = scenario.nodes.reduce((sum,node) => sum + (scores.get(node.id) ?? 0) * node.criticality,0) / totalWeight;
  return { id: runId, scenarioId: scenario.id, scenarioTitle: scenario.title, rootId, severity: normalizedSeverity, interventions, impacts, events, affected, critical, resilienceIndex: Math.max(0, Math.round(100 - weightedExposure)), createdAt: new Date().toISOString() };
}
