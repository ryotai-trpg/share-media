const { hasProperty } = foundry.utils;

/**
 * Mixin that provides darkness overlay functionality for media layers.
 * @param {Class} Base  The base class to extend with darkness functionality.
 * @returns {Class}
 */
export default function DarknessMixin(Base) {
  /** @param {boolean} [darkness=false]  Should scene darkness being applied to this application? */
  return class extends Base {
    /**
     * Reference to the HTML darkness element.
     * @type {HTMLElement | null}
     */
    darknessOverlay = null;

    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      darkness: false,
    };

    /**
     * Scene id attached to this application.
     * @type {string | null}
     */
    #sceneId = null;

    /**
     * ID from hook monitoring scene update.
     * @type {number | null}
     */
    #sceneHookId = null;

    /**
     * ID from hook monitoring canvas update.
     * @type {number | null}
     */
    #canvasHookId = null;

    /**
     * Previous darkness recorded on the canvas.
     * @type {number | null}
     */
    #previousCanvasDarknessLevel = null;

    /**
     * Current darkness animation.
     * @type {Animation | null}
     */
    #darknessAnimation = null;

    /* -------------------------------------------- */
    /*  Getters
    /* -------------------------------------------- */

    /**
     * Check if the application can render and update the darkness overlay.
     * @type {boolean}
     */
    get canDisplayDarkness() {
      return this.options.darkness && game.scenes.current;
    }

    /* -------------------------------------------- */
    /*  Darkness Methods
    /* -------------------------------------------- */

    /**
     * Update the application darkness based on the scene update.
     * @param {SceneDocument} document  The scene document being updated.
     * @param {Object}        changed   Modified settings of the scene.
     * @param {Object}        options   Options passed to the update.
     * @param {string}        _userId   User making the update.
     * @returns {Promise<void>}
     */
    async #updateDarkness(document, changed, options, _userId) {
      // Darkness must be changed for the specific scene the application is bound to
      if (document.id !== this.#sceneId || !hasProperty(changed, "environment.darknessLevel"))
        return;

      // Cancel any existing animation
      if (this.#darknessAnimation) {
        // Preserve current styles before canceling
        this.#darknessAnimation.commitStyles();
        this.#darknessAnimation.cancel();
      }

      // Animate according to the scene update (using the same duration)
      const initialOpacity = parseFloat(getComputedStyle(this.darknessOverlay).opacity);
      this.#darknessAnimation = this.darknessOverlay.animate(
        [{ opacity: initialOpacity }, { opacity: changed.environment.darknessLevel }],
        { duration: options?.animateDarkness ?? 0, fill: "forwards" },
      );

      // Await a finished animation (not cancelled) and reset the animation
      await this.#darknessAnimation.finished.catch((_error) => null);
      if (this.#darknessAnimation?.playState === "finished") {
        this.#darknessAnimation.commitStyles();
        this.#darknessAnimation.cancel();
        this.#darknessAnimation = null;
      }
    }

    /* -------------------------------------------- */

    /**
     * Monitor darkness level changes on the current canvas.
     * @inheritdoc
     */
    #onCanvasEnvironmentChange(config) {
      // We need to be on the same scene as the canvas
      if (game.canvas.scene.id !== this.#sceneId) return;

      // If no darkness level, do nothing
      const darknessLevel = config.environment?.darknessLevel;
      if (!darknessLevel && darknessLevel !== 0) return;

      // If first darkness level, store it and wait for another hook fired
      if (!this.#previousCanvasDarknessLevel) {
        this.#previousCanvasDarknessLevel = darknessLevel;
        return;
      }

      // If second, but identical darkness level, return early and wait for another
      if (this.#previousCanvasDarknessLevel === darknessLevel) return;

      // If second and different darkness level, deduce the darkness level transition direction
      // [INFO] this assumes darkness is animated and transition from 0 to 1 or 1 to 0
      const direction = this.#previousCanvasDarknessLevel < darknessLevel ? 1 : 0;
      const duration =
        Math.abs(direction - darknessLevel) * CONFIG.Canvas.darknessToDaylightAnimationMS;
      this.#updateDarkness(
        game.scenes.get(this.#sceneId),
        { environment: { darknessLevel: direction } },
        { animateDarkness: duration },
      );

      // Finally, unregister this hook as we don't need it anymore
      Hooks.off("configureCanvasEnvironment", this.#canvasHookId);
      this.#canvasHookId = null;
    }

    /* -------------------------------------------- */
    /*  Context
    /* -------------------------------------------- */

    /** @inheritdoc */
    async _prepareContext(options) {
      return {
        ...(await super._prepareContext(options)),
        ...(this.canDisplayDarkness && {
          darkness: this.canDisplayDarkness,
          darknessColor: new Color(CONFIG.Canvas.darknessColor).css,
          initialOpacity: game.scenes.current.environment.darknessLevel,
        }),
      };
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    _prepareHookContext() {
      return {
        ...super._prepareHookContext(),
        darkness: this.options.darkness,
      };
    }

    /* -------------------------------------------- */
    /*  Rendering
    /* -------------------------------------------- */

    /**
     * Watch and update darkness if requested.
     * @inheritdoc
     */
    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      if (this.canDisplayDarkness) {
        this.#sceneId = game.scenes.current.id;
        this.#sceneHookId = Hooks.on("updateScene", this.#updateDarkness.bind(this));
        this.#canvasHookId = Hooks.on(
          "configureCanvasEnvironment",
          this.#onCanvasEnvironmentChange.bind(this),
        );
      }
    }

    /* -------------------------------------------- */

    /**
     * Store convenient element references.
     * @inheritdoc
     */
    async _onRender(context, options) {
      await super._onRender(context, options);
      if (this.canDisplayDarkness) this.darknessOverlay = this.element.querySelector(".darkness");
    }

    /* -------------------------------------------- */

    /**
     * Wait for an ongoing darkness transition at the time this application is rendered.
     * Quickly unregister the hook as it is only needed for a short period of time after this application is rendered.
     * @inheritdoc
     */
    async _postRender(context, options) {
      await super._postRender(context, options);
      if (this.canDisplayDarkness) {
        setTimeout(() => {
          if (this.#canvasHookId) {
            Hooks.off("configureCanvasEnvironment", this.#canvasHookId);
            this.#canvasHookId = null;
          }
        }, 100);
      }
    }

    /* -------------------------------------------- */

    /**
     * Cleanup references when this application is closed.
     * @inheritdoc
     */
    _onClose(options) {
      super._onClose(options);
      this._resetDarknessState();
      this._resetDarknessDOM();
    }

    /* -------------------------------------------- */
    /*  Helpers
    /* -------------------------------------------- */

    /**
     * Clear all dependencies to avoid memory leaks.
     */
    _resetDarknessState() {
      if (this.#sceneHookId) Hooks.off("updateScene", this.#sceneHookId);
      this.#sceneHookId = null;
      if (this.#canvasHookId) Hooks.off("configureCanvasEnvironment", this.#canvasHookId);
      this.#canvasHookId = null;
      this.#sceneId = null;
      this.#previousCanvasDarknessLevel = null;
    }

    /* -------------------------------------------- */

    /**
     * Reset all DOM events, including CSS state.
     */
    _resetDarknessDOM() {
      if (this.#darknessAnimation) this.#darknessAnimation.cancel();
      this.#darknessAnimation = null;
      this.darknessOverlay = null;
    }
  };
}
