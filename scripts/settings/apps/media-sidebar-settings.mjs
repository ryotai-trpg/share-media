const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { reloadConfirm } = foundry.applications.settings.SettingsConfig;
const { expandObject } = foundry.utils;

/**
 * Application responsible for adjusting settings for the media sidebar.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class MediaSidebarSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "shm-media-history-sidebar-settings",
    tag: "form",
    window: {
      get title() {
        return `share-media.settings.${CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSidebarSettings}.label`;
      },
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: 600,
    },
    form: {
      handler: MediaSidebarSettings.#onSubmit,
      closeOnSubmit: true,
    },
  };

  /** @override */
  static PARTS = {
    form: {
      template: "modules/share-media/templates/settings/media-sidebar-settings.hbs",
      root: true,
    },
  };

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
      description: `${CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSidebarSettings}.description`,
      mediaSidebarSettings: game.modules.shareMedia.settings.get(
        CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSidebarSettings,
      ),
    };
  }

  /* -------------------------------------------- */
  /*  Action Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle the submission of this application.
   * @param {SubmitEvent}      _event    The originating form submission or input change event.
   * @param {HTMLFormElement}  _form     The form element that was submitted.
   * @param {FormDataExtended} formData  Processed data for the submitted form.
   * @returns {Promise<void>}
   * @this {MediaSidebarSettings}
   */
  static async #onSubmit(_event, _form, formData) {
    const historySettings = expandObject(formData.object);
    game.modules.shareMedia.settings.set(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSidebarSettings,
      historySettings,
    );
    // Reload FoundryVTT
    await reloadConfirm({ world: true });
  }
}
