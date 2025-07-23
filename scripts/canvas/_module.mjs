export { default as MediaLayer } from "./media-layer.mjs";
export { default as MediaSprite } from "./media-sprite.mjs";
export { default as ShareRegionBehaviorType } from "./share-region-behavior.mjs";
export * as apps from "./apps/_module.mjs";

/**
 * Register the needed region behaviors.
 */
export const registerRegionBehaviors = () => {
  const config = CONFIG.shareMedia;
  const shareRegionBehaviorType = config.canvas.ShareRegionBehaviorType;

  // Register the behavior implementation
  CONFIG.RegionBehavior.dataModels[shareRegionBehaviorType.type] =
    shareRegionBehaviorType.implementation;
  // Register the behavior icon
  CONFIG.RegionBehavior.typeIcons[shareRegionBehaviorType.type] = config.CONST.ICONS.sceneFit;
};

/**
 * Register the needed media layer.
 */
export const registerMediaLayer = () => {
  // Blacklist settings
  const blacklistSettings = game.modules.shareMedia.settings.get(
    CONFIG.shareMedia.CONST.MODULE_SETTINGS.blacklistSettings,
  );

  // Add the media layer to the list of layers to render
  // Do that only if the current user is not blacklisted
  if (!blacklistSettings.includes(game.userId)) {
    CONFIG.Canvas.layers["shm-media-layer"] = {
      group: "interface",
      layerClass: CONFIG.shareMedia.canvas.MediaLayer.implementation,
    };

    // Add a button to the tokens tools
    // [INFO] This button activates/deactivates the media layer
    Hooks.on("getSceneControlButtons", (controls) => {
      controls.tokens.tools["toggle-shm-media-layer"] = {
        name: "toggle-shm-media-layer",
        title: "share-media.canvas.layer.tool.label",
        icon: CONFIG.shareMedia.CONST.ICONS.mediaLayer,
        toggle: true,
        visible: game.users.current.isGM,
        active: (() => {
          if (!game.modules.shareMedia.canvas.layer) return false;
          return game.modules.shareMedia.canvas.layer.active;
        })(),
        onChange: (_event, active) => {
          if (active) {
            if (game.modules.shareMedia.canvas.layer.sprites.size < 1)
              ui.notifications.info(game.i18n.localize("share-media.canvas.layer.tool.zero"));
            game.modules.shareMedia.canvas.layer.activate();
          } else game.canvas.tokens.activate();
        },
      };
    });
  }
};
