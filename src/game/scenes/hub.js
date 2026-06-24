// Hub / TOWN scene (multi-room ruin town). The 1860-line monolith was split into domain
// mixins under hub/ (R21.5); this file just assembles them. The scene is a single `this`-bound
// object literal exposed via refs.hub — Object.assign keeps call sites and behavior identical.
import { refs } from './refs.js';
import { lifecycleMixin } from './hub/lifecycle.js';
import { menusMixin } from './hub/menus.js';
import { panelsMixin } from './hub/panels.js';
import { upgradesMixin } from './hub/upgrades.js';
import { renderMixin } from './hub/render.js';
import { renderSmithMixin } from './hub/render_smith.js';
import { renderWardrobeMixin } from './hub/render_wardrobe.js';
import { renderPersonalMixin } from './hub/render_personal.js';

export const hubScene = Object.assign({}, lifecycleMixin, menusMixin, panelsMixin, upgradesMixin, renderMixin, renderSmithMixin, renderWardrobeMixin, renderPersonalMixin);

refs.hub = hubScene;
