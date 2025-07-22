const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { reloadConfirm } = foundry.applications.settings.SettingsConfig;

/**
 * Application responsible for setting the user blacklist.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class BlacklistSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "shm-blacklist",
    tag: "form",
    window: {
      get title() {
        return `share-media.settings.${CONFIG.shareMedia.CONST.MODULE_SETTINGS.blacklistSettings}.label`;
      },
      contentClasses: ["standard-form"],
    },
    position: {
      width: 400,
      height: "auto",
    },
    form: {
      handler: BlacklistSettings.#onSubmit,
      closeOnSubmit: true,
    },
  };

  /** @override */
  static PARTS = {
    form: { template: "modules/share-media/templates/settings/blacklist-settings.hbs", root: true },
  };

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
      description: `${CONFIG.shareMedia.CONST.MODULE_SETTINGS.blacklistSettings}.description`,
      users: this.#prepareUsers(),
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare users, adding a "blacklisted" property depending on current settings.
   * @returns {Array<{
   *   id: string;
   *   name: string;
   *   color: Color;
   *   blacklisted: boolean;
   * }>}
   */
  #prepareUsers() {
    const blacklistSettings = game.modules.shareMedia.settings.get(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.blacklistSettings,
    );

    return game.users.map((user) => ({
      id: user.id,
      name: user.name,
      color: user.color,
      blacklisted: blacklistSettings.includes(user.id),
    }));
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
   * @this {Blacklist}
   */
  static async #onSubmit(_event, _form, formData) {
    const users = Object.keys(formData.object).filter((key) => formData.object[key]);
    await game.modules.shareMedia.settings.set(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.blacklistSettings,
      users,
    );
    // Reload FoundryVTT
    await reloadConfirm({ world: true });
  }
}
