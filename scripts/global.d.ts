import * as CommonModule from "./common/_module.mjs";
import * as SettingsModule from "./settings/_module.mjs";
import * as UiModule from "./ui/_module.mjs";
import * as CanvasModule from "./canvas/_module.mjs";
import * as LayersModule from "./layers/_module.mjs";
import * as ShareablesModule from "./shareables/_module.mjs";
import Api from "./api.mjs";

/* -------------------------------------------- */
/*  Namespace declarations
/*  Allow IDEs to discover the project types
/*  No actual runtime use
/* -------------------------------------------- */

declare global {
  // Global "CONFIG" object
  namespace CONFIG.shareMedia {
    const CONST: typeof CommonModule.CONST;
    const settings: typeof SettingsModule.SettingsCache;
    const utils: typeof CommonModule.utils;
    const ui: typeof UiModule;
    const canvas: typeof CanvasModule;
    const layers: typeof LayersModule;
    const shareables: typeof ShareablesModule;
    const api: Api;
  }

  // shareMedia module
  namespace game.modules.shareMedia {
    const settings: typeof SettingsModule.SettingsCache;
    const utils: typeof CommonModule.utils;
    const ui: {
      detector: InstanceType<typeof UiModule.MediaDetector>;
      overlay: InstanceType<typeof UiModule.MediaOverlay>;
      sidebar: InstanceType<typeof UiModule.MediaSidebar>;
    };
    const canvas: {
      layer: InstanceType<typeof CanvasModule.MediaLayer>;
      sprite: typeof CanvasModule.MediaSprite;
      apps: {
        hud: typeof CanvasModule.apps.MediaHUD;
      };
    };
    const layers: {
      popout: typeof LayersModule.PopoutLayer;
      fullscreen: typeof LayersModule.FullscreenLayer;
    };
    const shareables: {
      manager: InstanceType<typeof ShareablesModule.ShareablesManager>;
      apps: {
        userSelector: typeof ShareablesModule.apps.UserSelector;
        regionSelector: typeof ShareablesModule.apps.RegionSelector;
        shareSelector: typeof ShareablesModule.apps.ShareSelector;
      };
    };
    const collections: {
      media: Map<string, any>;
    };
    const api = Api;
  }
}

export {};
