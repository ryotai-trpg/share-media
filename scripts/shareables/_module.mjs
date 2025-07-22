export { default as ShareablesManager } from "./shareables-manager.mjs";
export * as apps from "./apps/_module.mjs";
export * as mixins from "./mixins/_module.mjs";

/**
 * Apply the needed modificcations to show tokens buttons and entities context entries.
 */
export const applyEntitySharingSettings = () => {
  // Entity settings
  const entitySharingSettings = game.modules.shareMedia.settings.get(
    CONFIG.shareMedia.CONST.MODULE_SETTINGS.entitySharingSettings,
  );

  // Add context menu entries and token buttons only if settings allow it
  for (const [entity, config] of Object.entries(entitySharingSettings)) {
    // Sheets
    if (config.sheet) {
      const hookName = `get${entity.charAt(0).toUpperCase() + entity.slice(1, -1)}ContextOptions`;
      Hooks.on(hookName, (_application, menuItems) => {
        // Create the entry
        const entry = {
          name: "share-media.shareables.selector.entities.label",
          icon: `<i class="${CONFIG.shareMedia.CONST.ICONS.shareAgain}"></i>`,
          condition: (li) => {
            if (!game.users.current.isGM) return false;
            const document = game[entity].get(li.dataset.entryId);
            const { img } = document.constructor.getDefaultArtwork(document._source);
            return document.img !== img;
          },
          callback: (li) => {
            const document = game[entity].get(li.dataset.entryId);
            const options = { src: document.img };
            if (config.caption) options.settings = { caption: document.name };
            new game.modules.shareMedia.shareables.apps.shareSelector(options).render({
              force: true,
            });
          },
        };

        // Add the entry to the menu
        menuItems.splice(0, 0, entry);
      });
    }

    // Tokens
    if (config.hud) {
      const entityName =
        entity === "actors" ? "Token" : entity.charAt(0).toUpperCase() + entity.slice(1, -1);
      const hookName = `render${entityName}HUD`;
      Hooks.on(hookName, (application, element, _context, _options) => {
        if (!game.users.current.isGM) return;
        if (!application.object.document.texture.src) return;

        // Create a button
        const button = document.createElement("button");
        button.className = "control-icon";
        button.dataset.tooltip = "share-media.shareables.selector.entities.label";
        button.innerHTML = `<i class="${CONFIG.shareMedia.CONST.ICONS.shareAgain}"></i>`;

        // Add the click handler to the button
        button.addEventListener("click", () => {
          const options = { src: application.object.document.texture.src };
          if (config.caption) options.settings = { caption: application.object[entity].name };
          new game.modules.shareMedia.shareables.apps.shareSelector(options).render({
            force: true,
          });
        });

        // Add the button to the HUD
        const leftCol = element.querySelector(".col.left");
        if (leftCol) leftCol.appendChild(button);
      });
    }
  }
};
