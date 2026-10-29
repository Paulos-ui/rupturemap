import type { Intervention, Scenario, SimulationRun } from './types';
// The engine is plain JavaScript so that the same exact algorithm can be tested by Node.
import { simulate as coreSimulate } from './engine.mjs';
export function simulate(scenario: Scenario, rootId: string, severity: number, interventions: Intervention[] = []): SimulationRun {
  return coreSimulate(scenario, rootId, severity, interventions) as SimulationRun;
}
