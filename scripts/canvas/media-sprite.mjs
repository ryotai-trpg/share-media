const { PrimarySpriteMesh } = foundry.canvas.primary;
const { MouseInteractionManager } = foundry.canvas.interaction;
const { loadTexture } = foundry.canvas;
const { isSubclass } = foundry.utils;

/** @typedef {import("./apps/media-hud.mjs").default} MediaHUD */

/**
 * A class responsible for generating a sprite mesh, mask and frame from a media source URL.
 * @param {string}         src                             The source URL of the media to display.
 * @param {RegionDocument} region                          The region bound to this sprite.
 * @param {Object}         [options]                       Additional optional arguments.
 * @param {string}         [options.optionName="display"]  The optional display mode.
 * @param {string}         [options.optionValue="fit"]     The optional display mode value.
 * @param {string}         [options.loop=false]            Optional loop argument for videos.
 * @param {string}         [options.mute=false]            Optional mute argument for videos.
 * @throws {Error} If the two basic arguments are passed to this constructor.
 */
export default class MediaSprite {
  constructor(src, region, options) {
    // Check basic arguments
    if (!src || !region)
      throw new Error(
        'You must pass a valid "src" and "region document id" to instantiate the class "SpriteMesh".',
      );

    // Assign mandatory arguments
    this.src = src;
    this.region = region;

    // Assign optional arguments
    Object.assign(this.options, options);
  }

  /* -------------------------------------------- */

  /**
   * The source URL of this sprite.
   * @type {string | null}
   */
  src = null;

  /**
   * The Region document bound to this sprite.
   * @type {RegionDocument | null}
   */
  region = null;

  /**
   * Options which change the way this media is rendered.
   * @type {{ display: string; loop: boolean; mute: boolean }}
   */
  options = {
    display: CONFIG.shareMedia.CONST.LAYERS_OPTIONS.displayFit.value,
    loop: false,
    mute: false,
  };

  /**
   * Sort order of sprites on the "primary" canvas group.
   * @enum {number}
   */
  static SORT_LAYER = 250;

  /**
   * Reference counter for texture usage.
   * @type {Map<string, number>}
   */
  static #textureRefCount = new Map();

  /**
   * Reference to the currently hovered sprite.
   * @type {MediaSprite | null}
   */
  static hovered = null;

  /**
   * Reference to the currently controlled sprite.
   * @type {MediaSprite | null}
   */
  static controlled = null;

  /**
   * Last sprite controlled.
   * @type {string | null}
   */
  static lastControlled = null;

  /**
   * Reference to the media HUD.
   * @type {MediaHUD | null}
   */
  static hud = null;

  /**
   * The primary sprite mesh created for this sprite.
   * @type {PrimarySpriteMesh | null}
   */
  #mesh = null;

  /**
   * Mesh mask graphics.
   * @type {PIXI.Graphics | null}
   */
  #mask = null;

  /**
   * The empty transparent frame of this sprite.
   * @type {PIXI.Graphics | null}
   */
  #frame = null;

  /**
   * The border of this sprite.
   * @type {PIXI.Graphics}
   */
  #border = null;

  /**
   * Video ended event handler function.
   * @type {Function | null}
   */
  #videoEndedHandler = null;

  /**
   * A mouse interaction manager instance which handles mouse workflows related to this object.
   * @type {MouseInteractionManager | null}
   */
  #mouseInteractionManager = null;

  /* -------------------------------------------- */
  /*  Getters & Setters
  /* -------------------------------------------- */

  /**
   * Getter for the internal "this.#frame" object.
   * @type {PIXI.Graphics | null}
   */
  get frame() {
    return this.#frame;
  }

  /* -------------------------------------------- */

  /**
   * Get the fit mode in a compatible PrimarySpriteMesh value.
   * @type {'contain' | 'cover'}
   */
  get fitMode() {
    if (!this.options.optionName) return "contain";
    return this.options.optionValue === CONFIG.shareMedia.CONST.LAYERS_OPTIONS.displayFit.value
      ? "contain"
      : "cover";
  }

  /* -------------------------------------------- */

  /**
   * Get the currently hovered sprite.
   * @type {MediaSprite | null}
   */
  get hovered() {
    return this.constructor.hovered;
  }

  /* -------------------------------------------- */

  set hovered(value) {
    if (!(value instanceof this.constructor) && value !== null)
      throw new Error('Wrong type passed to hovered "MediaSprite"');
    this.constructor.hovered = value;
  }

  /* -------------------------------------------- */

  /**
   * Get the currently controlled sprite.
   * @type {MediaSprite | null}
   */
  get controlled() {
    return this.constructor.controlled;
  }
  /* -------------------------------------------- */

  /**
   * Set the currently controlled sprite.
   * @param {MediaSprite | null} value  The new value.
   * @throws {Error} If the value is not of MediaSprite or null.
   */
  set controlled(value) {
    if (!(value instanceof this.constructor) && value !== null)
      throw new Error('Wrong type passed to controlled "MediaSprite"');
    this.constructor.controlled = value;
  }

  /* -------------------------------------------- */

  /**
   * Whether the current sprite instance is controlled.
   * @type {boolean}
   */
  get isControlled() {
    return this.constructor.controlled === this;
  }

  /* -------------------------------------------- */

  /**
   * Get the media HUD application.
   * @type {MediaHUD}
   */
  get hud() {
    // Initialize the HUD if not existent
    if (!this.constructor.hud) this.constructor.hud = new game.modules.shareMedia.canvas.apps.hud();
    return this.constructor.hud;
  }

  /* -------------------------------------------- */
  /*  Initialization
  /* -------------------------------------------- */

  /**
   * Initialize the sprite by creating the mesh, the mask and the frame.
   * @returns {Promise<this>}
   * @throws {Error} If the texture couldn't be loaded.
   */
  async initialize() {
    // Create mesh, mask and frame
    await this._createMesh();
    this._createMask();
    this._createFrame();
    this._createBorder();
    this._createInteractionManager();

    // Return the instance
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Create the mesh to be added to the "primary" canvas group.
   */
  async _createMesh() {
    // Load the texture with a module cache key
    this.src = `${this.src}?share-media-texture`;
    const texture = await loadTexture(this.src);
    if (!texture) throw new Error(`Failed to load texture from ${this.src}`);
    MediaSprite.#incrementTextureRef(this.src);

    // Create the mesh
    this.#mesh = new PrimarySpriteMesh(texture);

    // Get the region bounds
    const bounds = this.region.bounds;

    // Scale the mesh to appropriate dimensions
    this.#mesh.resize(bounds.width, bounds.height, { fit: this.fitMode });

    // Position the mesh
    this.#mesh.x = bounds.x + (bounds.width - this.#mesh.width) / 2;
    this.#mesh.y = bounds.y + (bounds.height - this.#mesh.height) / 2;

    // Assign "primary" canvas sort and region sort
    this.#mesh.sortLayer = this.constructor.SORT_LAYER;
    this.#mesh.sort =
      this.region.getFlag(
        "share-media",
        game.modules.shareMedia.canvas.layer.constructor.SORT_FLAG_KEY,
      ) ?? 1;
  }

  /* -------------------------------------------- */

  /**
   * Create the mask added to the mesh.
   */
  _createMask() {
    // Create an empty mask
    this.#mask = new PIXI.Graphics();

    // Get the region polygons
    const polygons = this.region.polygons;

    // Fill the mask
    if (polygons?.length) {
      this.#mask.beginFill(0xffffff, 1);

      for (const polygon of polygons) {
        if (polygon.isPositive) {
          // Positive polygon = outer boundary
          this.#mask.drawPolygon(polygon);
        } else {
          // Negative polygon = hole
          this.#mask.beginHole();
          this.#mask.drawPolygon(polygon);
          this.#mask.endHole();
        }
      }

      this.#mask.endFill();
    }

    // Add the mask to the mesh
    this.#mesh.mask = this.#mask;
  }

  /* -------------------------------------------- */

  /**
   * Create a transparent frame to be added to the "media" layer.
   * [INFO] This is a simple transparent copy of the mask.
   */
  _createFrame() {
    // Simply clone the mask and make it transparent
    this.#frame = this.#mask.clone();
    this.#frame.alpha = 0;
    this.#frame.cursor = "pointer";
  }

  /* -------------------------------------------- */

  /**
   * Create a border around "this.#frame"
   */
  _createBorder() {
    this.#border = new PIXI.Graphics();
    this.#border.eventMode = "none";
    this.#border.visible = false;

    const thickness = CONFIG.Canvas.objectBorderThickness * game.canvas.dimensions.uiScale;
    for (const lineStyle of [
      { width: thickness, color: 0x000000, join: PIXI.LINE_JOIN.ROUND, alignment: 0.75 },
      { width: thickness / 2, color: 0xffffff, join: PIXI.LINE_JOIN.ROUND, alignment: 1 },
    ]) {
      this.#border.lineStyle(lineStyle);
      for (const node of this.region.polygonTree) {
        if (node.isHole) continue;
        this.#border.drawShape(node.polygon);
        this.#border.beginHole();
        for (const hole of node.children) this.#border.drawShape(hole.polygon);
        this.#border.endHole();
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Create a standard MouseInteractionManager for "this.#frame".
   */
  _createInteractionManager() {
    // Handle permissions to perform various actions
    const permissions = {
      hoverIn: () => game.users.current.isGM,
      hoverOut: () => game.users.current.isGM,
      clickLeft: () => game.users.current.isGM,
      clickRight: () => game.users.current.isGM,
      dragStart: () => false,
      dragLeftStart: () => false,
      dragRightStart: () => false,
    };

    // Define callback functions for each workflow step
    const callbacks = {
      hoverIn: this._onHoverIn.bind(this),
      hoverOut: this._onHoverOut.bind(this),
      clickLeft: this._onClickLeft.bind(this),
      clickRight: this._onClickRight.bind(this),
    };

    // Create the interaction manager
    this.#mouseInteractionManager = new MouseInteractionManager(
      this.#frame,
      game.canvas.stage,
      permissions,
      callbacks,
    );

    // Activate the interaction manager
    this.#mouseInteractionManager.activate();
  }

  /* -------------------------------------------- */
  /*  Interactivity
  /* -------------------------------------------- */

  /**
   * Actions that should be taken when a mouseover event occurs.
   * @param {PIXI.FederatedEvent} event  The triggering canvas interaction event.
   */
  _onHoverIn(event) {
    // Returning if hovering is happening while pressing left or right button
    if (event.buttons & 0x03) return;
    // Store the currently hovered element
    this.hovered = this;
    // If already controlled do not go further
    if (this.isControlled) return;

    // Show the border
    this.#border.visible = true;
    this.#border.tint = CONFIG.Canvas.dispositionColors.FRIENDLY;
  }

  /* -------------------------------------------- */

  /**
   * Actions that should be taken when a mouseout event occurs.
   * @param {PIXI.FederatedEvent} _event  The triggering canvas interaction event.
   */
  _onHoverOut(_event) {
    // Remove hovered element
    this.hovered = null;
    // If already controlled do not go further
    if (this.isControlled) return;

    // Hide the border
    this.#border.visible = false;
  }

  /* -------------------------------------------- */

  /**
   * Actions that should be taken when a single left-click event occurs.
   * @param {PIXI.FederatedEvent} _event  The triggering canvas interaction event.
   */
  _onClickLeft(_event) {
    this.control();
  }

  /* -------------------------------------------- */

  /**
   * Actions that should be taken when a single right-click event occurs.
   * @param {PIXI.FederatedEvent} _event  The triggering canvas interaction event.
   */
  _onClickRight(_event) {
    this.control();
    this.hud.bind(this);
  }

  /* -------------------------------------------- */

  /**
   * Assume control of the MediaSprite, releasing any previous.
   */
  control() {
    if (this.isControlled) return;
    if (!this.isControlled) this.controlled?.release();
    this.controlled = this;
    this.constructor.lastControlled = this.region.id;
    this.#border.visible = true;
    this.#border.tint = CONFIG.Canvas.dispositionColors.CONTROLLED;
  }

  /* -------------------------------------------- */

  /**
   * Release the current sprite.
   */
  release() {
    if (!this.isControlled) return;
    this.controlled = null;
    this.hud.close();
    this.#border.visible = false;
  }

  /* -------------------------------------------- */
  /*  Sprite Lifecycle
  /* -------------------------------------------- */

  /**
   * Add the sprite to the current canvas.
   */
  addToCanvas() {
    if (!game.canvas) return;

    // Add the mask to the "hidden" canvas group
    game.canvas.masks.addChild(this.#mask);
    // Add the sprite to the "primary" canvas group
    game.canvas.primary.addChild(this.#mesh);
    // Add the frame to the "media" layer
    game.modules.shareMedia.canvas.layer.objects.addChild(this.#frame);
    // Add the border to the "media" layer
    game.modules.shareMedia.canvas.layer.objects.addChild(this.#border);

    // Manage video playback
    const video = game.video.getVideoSource(this.#mesh);
    if (video) {
      // Add this video to the primary if video shouldn't be muted
      // [INFO] Foundry handles volume for us
      if (!this.options.mute) game.canvas.primary.videoMeshes.add(this.#mesh);

      // Delete media on ended if loop is "false"
      if (!this.options.loop) {
        this.#videoEndedHandler = () =>
          game.modules.shareMedia.canvas.layer.deleteSprite(this.region.id, { unsetFlag: true });
        video.addEventListener("ended", this.#videoEndedHandler);
      }

      // Start the video
      game.video.play(video, {
        loop: this.options.loop,
        volume: this.options.mute ? 0 : game.settings.get("core", "globalAmbientVolume"),
      });
    }

    // Reassign controls if layer is still active
    if (game.modules.shareMedia.canvas.layer.active) {
      // Control this sprite again if it was the last controlled
      if (this.constructor.lastControlled === this.region.id) this.control();
      // Reopen the hud if it was open for the sprite region
      if (game.modules.shareMedia.canvas.apps.hud.lastSprite === this.region.id)
        this.hud.bind(this);
    }
  }

  /* -------------------------------------------- */

  /**
   * Destroy the current sprite, removing it from the canvas and destroying objects and references.
   */
  destroy() {
    if (!game.canvas) return;

    // Removing controlled and hovered elements
    if (this.isControlled) this.release();
    if (this.hovered) this.hovered = null;

    // Manage video
    const video = game.video.getVideoSource(this.#mesh);
    if (video) {
      if (this.#videoEndedHandler) {
        video.removeEventListener("ended", this.#videoEndedHandler);
        this.#videoEndedHandler = null;
      }
      if (game.canvas.primary.videoMeshes.has(this.#mesh))
        game.canvas.primary.videoMeshes.delete(this.#mesh);
      game.video.stop(video);
    }

    // Cancel the interaction manager
    this.#mouseInteractionManager.cancel();

    // Remove PIXI elements from canvas
    if (this.#mesh.parent) this.#mesh.parent.removeChild(this.#mesh);
    if (this.#mask.parent) this.#mask.parent.removeChild(this.#mask);
    if (this.#frame.parent) this.#frame.parent.removeChild(this.#frame);
    if (this.#border.parent) this.#border.parent.removeChild(this.#border);

    // Destroy PIXI elements
    if (!this.#mesh.destroyed) this.#mesh.destroy();
    if (!this.#mask.destroyed) this.#mask.destroy();
    if (!this.#frame.destroyed) this.#frame.destroy();
    if (!this.#border.destroyed) this.#border.destroy();

    // Remove references
    this.region = null;
    this.#mesh = null;
    this.#mask = null;
    this.#frame = null;
    this.#border = null;
    this.#mouseInteractionManager = null;

    // Unload texture if needed
    MediaSprite.#decrementTextureRef(this.src);
  }

  /* -------------------------------------------- */
  /*  Textures Management
  /* -------------------------------------------- */

  /**
   * Increment texture reference count.
   * @param {string} src  Texture source URL.
   */
  static #incrementTextureRef(src) {
    if (!src) return;
    const count = MediaSprite.#textureRefCount.get(src) || 0;
    MediaSprite.#textureRefCount.set(src, count + 1);
  }

  /* -------------------------------------------- */

  /**
   * Decrement texture reference count and unload if no more references.
   * @param {string} src  Texture source URL.
   * @returns {Promise<void>}
   */
  static async #decrementTextureRef(src) {
    if (!src) return;

    const count = MediaSprite.#textureRefCount.get(src) || 0;
    if (count <= 1) {
      // No more references, safe to unload
      MediaSprite.#textureRefCount.delete(src);
      await PIXI.Assets.unload(src).catch(() => {
        // Ignore errors as texture might already be unloaded
      });
    } else {
      // Still has references, just decrement
      MediaSprite.#textureRefCount.set(src, count - 1);
    }
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured MediaSprite implementation.
   * @type {typeof MediaSprite}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.canvas.MediaSprite;
    if (!isSubclass(Class, MediaSprite)) {
      console.warn("Configured MediaSprite override must be a subclass of MediaSprite.");
      Class = MediaSprite;
    }
    return Class;
  }
}
