const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { isSubclass } = foundry.utils;

/**
 * Application responsible for selecting a share media region.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 * @mixes WaitableMixin          Delayed composition @see {@link RegionSelector.implementation}
 */
export default class RegionSelector extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "shm-region-selector-{id}",
    tag: "form",
    window: {
      title: "share-media.shareables.selector.region.label",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 400,
      height: "auto",
    },
    form: {
      handler: RegionSelector.#onSubmit,
      closeOnSubmit: true,
    },
    actions: {
      activateRegion: RegionSelector.#onActivateRegion,
    },
  };

  /** @override */
  static PARTS = {
    form: {
      template: "modules/share-media/templates/shareables/region-selector.hbs",
      root: true,
    },
  };

  /**
   * Active window before this application is opened.
   * @type {ApplicationV2}
   */
  #activeWindow = null;

  /**
   * Region currently activated.
   * @type {Region | null}
   */
  #activeRegion = null;

  /**
   * Hook ID to cleanup after closing this application.
   * @type {number | null}
   */
  #hookId = null;

  /* -------------------------------------------- */
  /*  Region activation
  /* -------------------------------------------- */

  /**
   * Activate a region by showing it in the scene it able.
   * @param {string} id                 Region id.
   * @param {Object} [options]          Options to pass.
   * @param {Object} [options.persist]  Should this region be permanently activated.
   */
  _activateRegion(id, { persist = false } = {}) {
    const region = game.canvas.regions.get(id);
    if (!region) return;
    if (persist) {
      if (this.#activeRegion && this.#activeRegion !== region)
        this._deactivateRegion(this.#activeRegion.id, { release: true });
      this.#activeRegion = region;
    }
    if (region && region.document.visibility === CONST.REGION_VISIBILITY.LAYER)
      region.visible = true;
  }

  /* -------------------------------------------- */

  /**
   * Deactivate a region by hiding it in the scene it able.
   * @param {string} id                 Region id.
   * @param {Object} [options]          Options to pass.
   * @param {Object} [options.release]  Should this region be released from being permanently activated.
   */
  _deactivateRegion(id, { release = false } = {}) {
    const region = game.canvas.regions.get(id);
    if (!region) return;
    if (!release && this.#activeRegion === region) return;
    if (release && this.#activeRegion) this.#activeRegion = null;
    if (region && region.document.visibility === CONST.REGION_VISIBILITY.LAYER)
      region.visible = false;
  }

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
      regions: this.#prepareRegions(),
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare regions, selecting only regions with at least one "ShareRegionBehaviorType" behavior not disabled.
   * If "this.options.targetRegion" is available, make it the default, otherwise make the first region the default.
   * @returns {Array<{
   *   id: string;
   *   name: string;
   *   color: Color;
   * }>}
   */
  #prepareRegions() {
    const regions = game.modules.shareMedia.utils.getAvailableRegions().map((region) => ({
      id: region.id,
      name: region.name,
      color: region.color,
      checked: region.id === this.options.targetRegion,
    }));
    if (regions.length && !regions.some((region) => region.checked)) regions.at(0).checked = true;
    return regions;
  }

  /* -------------------------------------------- */
  /*  Action Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle the activation of a region.
   * @param {PointerEvent} _event  The triggering event.
   * @param {HTMLElement}  target  The targeted DOM element.
   * @this {RegionSelector}
   */
  static #onActivateRegion(_event, target) {
    const element = target.closest("[data-region-id]");
    if (!element || !element.dataset?.regionId) return;
    this._activateRegion(element.dataset.regionId, { persist: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle the submission of this application.
   * @param {SubmitEvent}      _event    The originating form submission or input change event.
   * @param {HTMLFormElement}  _form     The form element that was submitted.
   * @param {FormDataExtended} formData  Processed data for the submitted form.
   * @returns {Promise<string>}
   * @this {RegionSelector}
   */
  static async #onSubmit(_event, _form, formData) {
    if (!Object.keys(formData.object).length) return null;
    return formData.object.region;
  }

  /* -------------------------------------------- */
  /*  Other Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle pointer entering a region selector.
   * @param {PointerEvent} event  The initiating pointerover event.
   */
  #onPointerOver(event) {
    const target = event.target;
    const previousTarget = event.relatedTarget;
    const regionElement = target.closest("[data-region-id]");
    if (!regionElement || regionElement.contains(previousTarget)) return;
    this._activateRegion(regionElement.dataset.regionId);
  }

  /* -------------------------------------------- */

  /**
   * Handle pointer leaving a region selector.
   * @param {PointerEvent} event  The initiating pointerout event.
   */
  #onPointerOut(event) {
    const target = event.target;
    const nextTarget = event.relatedTarget;
    const regionElement = target.closest("[data-region-id]");
    if (!regionElement || regionElement.contains(nextTarget)) return;
    this._deactivateRegion(regionElement.dataset.regionId);
  }

  /* -------------------------------------------- */
  /*  Rendering
  /* -------------------------------------------- */

  /**
   * Attach pointer events to show/hide the regions on hover.
   * @inheritdoc
   */
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("pointerover", this.#onPointerOver.bind(this));
    this.element.addEventListener("pointerout", this.#onPointerOut.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Minimize active window.
   * @inheritdoc
   */
  async _preFirstRender(context, options) {
    super._preFirstRender(context, options);
    if (ui.activeWindow && !ui.activeWindow.minimized) {
      this.#activeWindow = ui.activeWindow;
      this.#activeWindow.minimize();
    }
  }

  /* -------------------------------------------- */

  /**
   * Watch for scene navigation. Close this application if the scene changes.
   * @inheritdoc
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.#hookId = Hooks.once("canvasTearDown", this.close.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Activate the first checked region.
   * @inheritdoc
   */
  async _postRender(context, options) {
    await super._postRender(context, options);
    if (context.regions.length) {
      const region = context.regions.find((region) => region.checked);
      this._activateRegion(region.id, { persist: true });
    }
  }

  /* -------------------------------------------- */

  /**
   * Cleanup references when this application is closed.
   * @inheritdoc
   */
  _onClose(options) {
    super._onClose(options);
    if (this.#hookId) Hooks.off("canvasTearDown", this.#hookId);
    this.#hookId = null;
    if (this.#activeRegion) this._deactivateRegion(this.#activeRegion.id, { release: true });
    this.#activeRegion = null;
    if (this.#activeWindow) this.#activeWindow.maximize();
    this.#activeWindow = null;
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured RegionSelector implementation.
   * @type {typeof RegionSelector}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.shareables.apps.RegionSelector;
    if (!isSubclass(Class, RegionSelector)) {
      console.warn("Configured RegionSelector override must be a subclass of RegionSelector.");
      Class = RegionSelector;
    }

    // Apply required mixins
    const { WaitableMixin } = CONFIG.shareMedia.shareables.mixins;
    return WaitableMixin(Class);
  }
}
