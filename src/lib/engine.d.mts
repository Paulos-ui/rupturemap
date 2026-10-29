import type { Scenario, Intervention, SimulationRun } from './types';
export function simulate(scenario: Scenario, rootId: string, severity: number, interventions?: Intervention[], runId?: string): SimulationRun;
