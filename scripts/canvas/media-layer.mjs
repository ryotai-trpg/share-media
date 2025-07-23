const { InteractionLayer } = foundry.canvas.layers;
const { isSubclass } = foundry.utils;

/** @typedef {import("./media-sprite.mjs").default} MediaSprite */

/**
 * Class responsible for managing and displaying media sprites.
 * The layer handles sprites a single scene at a time.
 */
export default class MediaLayer extends InteractionLayer {
  constructor() {
    super();

    // Activate hooks
    this._activateHooks();
  }

  /* -------------------------------------------- */

  /**
   * Map of active sprites by region ID.
   * @type {Map<string, MediaSprite>}
   */
  sprites = new Map();

  /** @inheritdoc */
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: "shm-media-layer",
      zIndex: 100,
    });
  }

  /**
   * The flag key to register the region sort order.
   * @type {string}
   */
  static SORT_FLAG_KEY = "sort";

  /**
   * The flag key to register media options on a region.
   * @type {string}
   */
  static MEDIA_FLAG_KEY = "media";

  /* -------------------------------------------- */
  /*  Layer Management
  /* -------------------------------------------- */

  /**
   * Creating a new container for frames.
   * @inheritdoc
   */
  async _draw(options) {
    super._draw(options);

    // Create a new container containing all the layer frames
    this.objects = this.addChild(new PIXI.Container());
    this.objects.sortableChildren = true;

    // Render scene sprites
    for (const region of game.canvas.regions.placeables) {
      const flag = region.document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
      if (flag) this.addSprite({ targetRegion: region.id, ...flag });
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onClickLeft(_event) {
    if (
      game.settings.get("core", "leftClickRelease") &&
      !game.modules.shareMedia.canvas.sprite.hovered &&
      game.modules.shareMedia.canvas.sprite.controlled
    )
      game.modules.shareMedia.canvas.sprite.controlled.release();
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftDrop(_event) {
    if (game.modules.shareMedia.canvas.sprite.controlled)
      game.modules.shareMedia.canvas.sprite.controlled.release();
  }

  /* -------------------------------------------- */

  /**
   * Steps taken when this layer is deactivated.
   * @inheritdoc
   */
  _deactivate() {
    // Release any controlled sprite
    if (game.modules.shareMedia.canvas.sprite.controlled)
      game.modules.shareMedia.canvas.sprite.controlled.release();

    // Deactivate the associated control tool.
    // [INFO] Needed because there is no dedicated controls associated to this layer (only a tool).
    // Because of this, Foundry will not magically deactivate the associated tool when this layer is deactivated.
    ui.controls.controls.tokens.tools["toggle-shm-media-layer"].active = false;
  }

  /* -------------------------------------------- */

  /**
   * Delete all media sprites and reset the layer.
   * @inheritdoc
   */
  async _tearDown(options) {
    // Delete all media sprites
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    // Clear the sprites map
    this.sprites.clear();

    // Let foundry handle the rest
    return super._tearDown(options);
  }

  /* -------------------------------------------- */
  /*  Sprite Management
  /* -------------------------------------------- */

  /**
   * Create a media sprite on the scene.
   * @param {Object} options                      Options which change how a media is displayed on the scene.
   * @param {string} options.src                  Source URL of the media to share.
   * @param {string} options.targetRegion         Region to display to.
   * @param {...any} [options.additionalOptions]  Others additional options.
   * @returns {Promise<MediaSprite | void>}
   */
  async addSprite(options) {
    // Get the options
    const { src = null, targetRegion = null, ...additionalOptions } = options;

    // Get the region document
    const region = game.canvas.regions.get(targetRegion)?.document;
    if (!region) return;

    // Attempt to remove a previous sprite in the same region
    if (this.sprites.has(targetRegion)) await this.deleteSprite(region.id);

    // Check if the region is valid before creating a new sprite
    if (
      !region.shapes.length ||
      !region.behaviors.some(
        (behavior) =>
          behavior.type === CONFIG.shareMedia.canvas.ShareRegionBehaviorType.type &&
          !behavior.disabled,
      )
    )
      return;

    // Create a new sprite
    const sprite = new game.modules.shareMedia.canvas.sprite(src, region, additionalOptions);
    // Initialize it
    await sprite.initialize();
    // Add it to the canvas
    sprite.addToCanvas();

    // Store the sprite attached to the document region id.
    this.sprites.set(region.id, sprite);

    // Firing hooks
    Hooks.callAll("shareMedia.renderSceneSprite", sprite, region);

    return sprite;
  }

  /* -------------------------------------------- */

  /**
   * Delete a media sprite on the scene.
   * @param {string}  targetRegion  Region identifier.
   * @param {boolean} flag          Unset the flag of the region as well.
   * @returns {Promise<void>}
   */
  async deleteSprite(targetRegion, { unsetFlag = false } = {}) {
    const sprite = this.sprites.get(targetRegion);
    if (!sprite) return;

    // Destroy the sprite
    sprite.destroy();

    // Remove its reference
    this.sprites.delete(targetRegion);

    // Remove the media flag associated with the region document
    if (unsetFlag && game.users.current.isGM) {
      const region = game.canvas.regions.get(targetRegion)?.document;
      if (!region) return;
      await region.unsetFlag("share-media", this.constructor.MEDIA_FLAG_KEY);

      // Firing hooks
      Hooks.callAll("shareMedia.deleteSceneSprite", region);
    }
  }

  /* -------------------------------------------- */

  /**
   * Update a region with media data.
   * Also assign a sort order if the region does not already have one.
   * @param {string} targetRegion  Region ID to update.
   * @param {Object} data          Media data.
   * @returns {Promise<Document | undefined>}
   */
  async createRegionMediaData(targetRegion, data) {
    const region = game.canvas.regions.get(targetRegion)?.document;
    if (!region) return null;

    // Media data to update
    const updates = { [`flags.share-media.${this.constructor.MEDIA_FLAG_KEY}`]: data };

    // Check if region has a sort flag, if not assign one
    if (!region.getFlag("share-media", this.constructor.SORT_FLAG_KEY)) {
      let sort = 0;
      for (const region of game.modules.shareMedia.utils.getAvailableRegions()) {
        sort = Math.max(
          sort,
          (region.getFlag("share-media", this.constructor.SORT_FLAG_KEY) ?? 0) + 1,
        );
      }
      updates[`flags.share-media.${this.constructor.SORT_FLAG_KEY}`] = sort;
    }

    return await region.update(updates, { diff: false });
  }

  /* -------------------------------------------- */

  /**
   * Send the controlled sprite of this layer to the back or bring it to the front.
   * @param {string}  targetRegion  ID of the sprite region.
   * @param {boolean} front         Bring to front instead of send to back?
   * @returns {Promise<void>}
   */
  async sendToBackOrBringToFront(targetRegion, front) {
    const region = game.canvas.regions.get(targetRegion)?.document;
    if (!region) return;

    // Determine the minimum/maximum sort value of the other sprites
    let target = front ? -Infinity : Infinity;
    for (const document of game.modules.shareMedia.utils.getAvailableRegions()) {
      if (document.id === targetRegion) continue;
      const flag = document.getFlag("share-media", this.constructor.SORT_FLAG_KEY);
      if (flag === undefined) continue;
      target = (front ? Math.max : Math.min)(target, flag);
    }

    // If no new sort, return
    if (!Number.isFinite(target)) return;

    // Send to top or bottom and update flag
    target += front ? 1 : -1;
    await region.setFlag("share-media", this.constructor.SORT_FLAG_KEY, target);
  }

  /* -------------------------------------------- */
  /*  Regions Hooks
  /* -------------------------------------------- */

  /**
   * Register foundry regions lifecycle hooks.
   */
  _activateHooks() {
    Hooks.on("updateRegion", this.#onUpdateRegion.bind(this));
    Hooks.on("deleteRegion", this.#onDeleteRegion.bind(this));
    Hooks.on("createRegionBehavior", this.#onCreateRegionBehavior.bind(this));
    Hooks.on("updateRegionBehavior", this.#onUpdateRegionBehavior.bind(this));
    Hooks.on("deleteRegionBehavior", this.#onDeleteRegionBehavior.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle the update of a region.
   * This catches all modifications even those not relevant to share media.
   * @param {RegionDocument} document  The scene document being updated.
   * @param {Object}         _changed  Modified settings of the scene.
   * @param {Object}         _options  Options passed to the update.
   * @param {string}         _userId   User making the update.
   */
  #onUpdateRegion(document, _changed, _options, _userId) {
    const flag = document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
    if (flag) this.addSprite({ targetRegion: document.id, ...flag });
    else this.deleteSprite(document.id);
  }

  /* -------------------------------------------- */

  /**
   * Handle the deletion of a region.
   * @param {RegionDocument}                   document  The existing Document which was deleted.
   * @param {Partial<DatabaseDeleteOperation>} _options  Additional options which modified the deletion request.
   * @param {string}                           _userId   The ID of the User who triggered the deletion workflow.
   */
  #onDeleteRegion(document, _options, _userId) {
    this.deleteSprite(document.id);
  }

  /* -------------------------------------------- */

  /**
   * Handle the creation of a region behavior.
   * @param {RegionBehaviorDocument}           document  The new Document instance which has been created.
   * @param {Partial<DatabaseCreateOperation>} _options  Additional options which modified the creation request.
   * @param {string}                           _userId   The ID of the User who triggered the creation workflow.
   */
  #onCreateRegionBehavior(document, _options, _userId) {
    if (document.type !== CONFIG.shareMedia.canvas.ShareRegionBehaviorType.type) return;
    document = document.parent;
    const flag = document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
    if (flag) this.addSprite({ targetRegion: document.id, ...flag });
  }

  /* -------------------------------------------- */

  /**
   * Handle the update of a region behavior.
   * @param {RegionBehaviorDocument} document  The scene document being updated.
   * @param {Object}                 _changed  Modified settings of the scene.
   * @param {Object}                 _options  Options passed to the update.
   * @param {string}                 _userId   User making the update.
   */
  #onUpdateRegionBehavior(document, _changed, _options, _userId) {
    if (document.type !== CONFIG.shareMedia.canvas.ShareRegionBehaviorType.type) return;
    document = document.parent;
    const flag = document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
    if (flag) this.addSprite({ targetRegion: document.id, ...flag });
  }

  /* -------------------------------------------- */

  /**
   * Handle the deletion of a region behavior.
   * @param {RegionBehaviorDocument}           document  The existing Document which was deleted.
   * @param {Partial<DatabaseDeleteOperation>} _options  Additional options which modified the deletion request.
   * @param {string}                           _userId   The ID of the User who triggered the deletion workflow.
   */
  #onDeleteRegionBehavior(document, _options, _userId) {
    if (document.type !== CONFIG.shareMedia.canvas.ShareRegionBehaviorType.type) return;
    document = document.parent;
    const flag = document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
    if (flag) this.addSprite({ targetRegion: document.id, ...flag });
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured MediaLayer implementation.
   * @type {typeof MediaLayer}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.canvas.MediaLayer;
    if (!isSubclass(Class, MediaLayer)) {
      console.warn("Configured MediaLayer override must be a subclass of MediaLayer.");
      Class = MediaLayer;
    }
    return Class;
  }
}
