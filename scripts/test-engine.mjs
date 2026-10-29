import assert from 'node:assert/strict';
import { simulate } from '../src/lib/engine.mjs';
const network = { id:'test', title:'Test', nodes:[
  {id:'a',resilience:0,criticality:5}, {id:'b',resilience:10,criticality:4}, {id:'c',resilience:80,criticality:3}],
  links:[{source:'a',target:'b',exposure:100},{source:'b',target:'c',exposure:100}]
};
const normal = simulate(network, 'a', 100);
assert.equal(normal.impacts.find(i => i.nodeId === 'a').score, 100);
assert.ok(normal.impacts.find(i => i.nodeId === 'b').score > normal.impacts.find(i => i.nodeId === 'c').score);
const protectedRun = simulate(network, 'a', 100, [{nodeId:'b',boost:85}]);
assert.ok(protectedRun.impacts.find(i => i.nodeId === 'b').score < normal.impacts.find(i => i.nodeId === 'b').score);
assert.ok(protectedRun.resilienceIndex > normal.resilienceIndex);
assert.equal(normal.affected, 3);
const cyclic = {...network, links: [...network.links, {source:'c',target:'a',exposure:100}]};
assert.equal(simulate(cyclic, 'a',100).impacts.length,3);
console.log('PASS: propagation, intervention, score, and cyclic safety checks');
