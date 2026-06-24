// In-run gameplay scene (continuous-survival biome stages). The 2600-line monolith was
// split into domain mixins under run/ (R21.3); this file just assembles them. The scene is a
// single `this`-bound object literal exposed via refs.run — Object.assign keeps call sites and
// behavior identical (later mixins win on the one duplicate key: exit, as before).
import { refs } from './refs.js';
import { lifecycleMixin } from './run/lifecycle.js';
import { modesMixin } from './run/modes.js';
import { eventsMixin } from './run/events.js';
import { combatMixin } from './run/combat.js';
import { loopMixin } from './run/loop.js';
import { coopMixin } from './run/coop.js';
import { renderHudMixin } from './run/render_hud.js';
import { shopHiddenMixin } from './run/shop_hidden.js';
import { renderMixin } from './run/render.js';
import { overlaysMixin } from './run/overlays.js';

export const runScene = Object.assign({}, lifecycleMixin, modesMixin, eventsMixin, combatMixin, loopMixin, coopMixin, renderHudMixin, shopHiddenMixin, renderMixin, overlaysMixin);

refs.run = runScene;
