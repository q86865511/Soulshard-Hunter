// Shared scene references to wire navigation without import cycles.
// Each scene module assigns itself here at load; navigation reads from here.
export const refs = { title: null, hub: null, run: null };
