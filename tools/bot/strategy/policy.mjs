// Stable experiment identities. Do not retune C after preregistration.
const POLICIES=Object.freeze({
 A:Object.freeze({id:'A',choiceStrategy:'A',xpWeight:1}),
 B:Object.freeze({id:'B',choiceStrategy:'B',xpWeight:1}),
 C:Object.freeze({id:'C',choiceStrategy:'A',xpWeight:1.5}),
});
export function policyOf(id){
 if(!Object.hasOwn(POLICIES,id))throw Error('unknown policy: '+id);
 return POLICIES[id];
}
