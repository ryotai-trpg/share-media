/* ------------------------------------------------------ */
/* Share Media
/* Author: Maxime
/* Discord: Maxime1562
/* Software License: AGPL-3.0
/* Repository: https://github.com/mech-tools/share-media
/* ------------------------------------------------------ */

import { CONST, utils } from "./common/_module.mjs";
import * as settings from "./settings/_module.mjs";
import * as ui from "./ui/_module.mjs";
import * as canvas from "./canvas/_module.mjs";
import * as layers from "./layers/_module.mjs";
import * as shareables from "./shareables/_module.mjs";
import Api from "./api.mjs";

/* -------------------------------------------- */
/*  Foundry VTT Initialization
/* -------------------------------------------- */

Hooks.once("init", () => {
  // Expose the module CONFIG
  CONFIG.shareMedia = {
    CONST,
    settings: settings.SettingsCache,
    utils,
    ui,
    canvas,
    layers,
    shareables,
    api: Api,
  };

  // Initialize settings
  settings.initializeSettings();

  // Call shareMedia.init Hook before any registration
  Hooks.callAll("shareMedia.init", CONFIG.shareMedia);

  // Quick getter for this module ("game.modules.shareMedia")
  Object.defineProperty(game.modules, "shareMedia", {
    get: () => game.modules.get("share-media"),
    configurable: false,
    enumerable: false,
  });

  // Create internal objects
  Object.defineProperties(game.modules.shareMedia, {
    settings: { value: CONFIG.shareMedia.settings, enumerable: true },
    utils: { value: CONFIG.shareMedia.utils, enumerable: true },
    ui: { value: {}, enumerable: true },
    canvas: { value: { apps: {} }, enumerable: true },
    layers: { value: {}, enumerable: true },
    shareables: { value: { apps: {} }, enumerable: true },
    collections: { value: { apps: {} }, enumerable: true },
    api: { value: Api, enumerable: true },
  });

  // Register region behaviors
  CONFIG.shareMedia.canvas.registerRegionBehaviors();

  // Regiter media layer
  CONFIG.shareMedia.canvas.registerMediaLayer();

  // Register media sidebar
  CONFIG.shareMedia.ui.registerMediaSidebar();

  // Apply entity settings
  CONFIG.shareMedia.shareables.applyEntitySharingSettings();

  // Register handlebars partials
  CONFIG.shareMedia.utils.registerHandlebarsPartials();
});

/* -------------------------------------------- */
/*  Foundry VTT Setup
/* -------------------------------------------- */

Hooks.once("setup", () => {
  const config = CONFIG.shareMedia;
  const module = game.modules.shareMedia;

  // Expose ui
  module.ui.detector = new config.ui.MediaDetector.implementation();
  module.ui.overlay = new config.ui.MediaOverlay.implementation();

  // Expose canvas
  module.canvas.sprite = config.canvas.MediaSprite.implementation;
  module.canvas.apps.hud = config.canvas.apps.MediaHUD.implementation;

  // Expose layers
  module.layers.popout = config.layers.PopoutLayer.implementation;
  module.layers.fullscreen = config.layers.FullscreenLayer.implementation;

  // Expose shareables
  module.shareables.manager = new config.shareables.ShareablesManager.implementation();
  module.shareables.apps.userSelector = config.shareables.apps.UserSelector.implementation;
  module.shareables.apps.regionSelector = config.shareables.apps.RegionSelector.implementation;
  module.shareables.apps.shareSelector = config.shareables.apps.ShareSelector.implementation;

  // Call shareMedia.setup Hook
  Hooks.callAll("shareMedia.setup", module);
});

/* -------------------------------------------- */
/*  Foundry VTT Ready
/* -------------------------------------------- */

Hooks.once("ready", () => {
  const module = game.modules.shareMedia;

  // Get convenient references to object initialized after or during Foundry setup
  module.ui.sidebar = window.ui["shm-media-sidebar"];
  module.canvas.layer = game.canvas["shm-media-layer"];
  module.collections.media = game["shm-media-collection"];

  // Call shareMedia.ready Hook
  Hooks.callAll("shareMedia.ready", module);
});
