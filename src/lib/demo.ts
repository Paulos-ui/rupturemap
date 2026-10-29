import type { Scenario, SystemNode, SystemLink } from './types';
const n = (id: string, name: string, subtitle: string, category: SystemNode['category'], x: number, y: number, resilience: number, criticality: number, description: string): SystemNode => ({ id, name, subtitle, category, position: { x, y }, resilience, criticality, description });
const e = (source: string, target: string, exposure: number): SystemLink => ({ id: `${source}-${target}`, source, target, exposure });
export const DEMO_SCENARIOS: Scenario[] = [
  {
    id: 'port-meridian', title: 'Port Meridian', place: 'Coastal infrastructure network', type: 'city',
    description: 'A fictional coastal city whose energy, public services, logistics and communications depend on one another.',
    nodes: [
      n('grid', 'East Substation', 'ENERGY • CORE', 'power', 65, 206, 16, 5, 'Primary distribution substation supporting the city core.'),
      n('water', 'Water Treatment', 'PUBLIC UTILITIES', 'water', 345, 50, 26, 5, 'Pumping and purification infrastructure serving residential districts.'),
      n('telecom', 'Comms Exchange', 'NETWORKS', 'comms', 355, 205, 32, 4, 'Emergency radio, mobile connectivity and municipal data relay.'),
      n('rail', 'Transit Junction', 'MOBILITY', 'mobility', 347, 372, 39, 3, 'Central junction connecting freight, municipal transit and commuters.'),
      n('hospital', 'General Hospital', 'CRITICAL CARE', 'health', 665, 48, 46, 5, 'Regional emergency hospital with limited independent reserve power.'),
      n('port', 'Port Logistics', 'SUPPLY CHAIN', 'supply', 674, 210, 44, 4, 'Harbor distribution and time-sensitive goods processing.'),
      n('district', 'North District', 'PUBLIC SERVICES', 'civic', 669, 377, 30, 4, 'Residential and commercial services for the northern district.'),
    ],
    links: [ e('grid', 'water', 93), e('grid','telecom', 95), e('grid','rail', 79), e('water','hospital',82), e('telecom','hospital', 74), e('telecom','port', 85), e('rail','port',88), e('water','district',78), e('port','district',64), e('telecom','district',57) ],
  },
  {
    id: 'atlas-region', title: 'Atlas Region', place: 'Distributed cloud operations', type: 'cloud',
    description: 'A fictional cloud deployment linking identity, edge traffic, data infrastructure and commerce workloads.',
    nodes: [
      n('identity', 'Identity Gateway', 'ACCESS CONTROL', 'digital', 58, 206, 21, 5, 'Token issuance and identity validation for the cloud region.'),
      n('edge', 'Traffic Gateway', 'EDGE ROUTING', 'comms', 340, 58, 24, 5, 'Routes authenticated traffic across regional services.'),
      n('events', 'Event Bus', 'STREAMING', 'digital', 345, 210, 39, 4, 'Distributes events between critical business systems.'),
      n('secrets', 'Key Management', 'SECURITY', 'digital', 341, 375, 50, 5, 'Credential and key management supporting stateful services.'),
      n('orders', 'Order Processing', 'TRANSACTIONS', 'supply', 671, 55, 29, 5, 'Regional checkout and inventory reservation processing.'),
      n('database', 'Primary Database', 'DATA LAYER', 'digital', 665, 221, 37, 5, 'Transactional persistence for core application workloads.'),
      n('insights', 'Analytics Studio', 'INSIGHTS', 'digital', 660, 374, 57, 2, 'Operational reporting and business monitoring.'),
    ],
    links: [e('identity','edge',91),e('identity','events',84),e('identity','secrets',69),e('edge','orders',93),e('events','database',86),e('secrets','database',83),e('database','orders',89),e('database','insights',95),e('events','insights',73)],
  },
];
export const cloneScenario = (scenario: Scenario): Scenario => JSON.parse(JSON.stringify(scenario)) as Scenario;
