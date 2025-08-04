import MediaSprite from "./media-sprite.mjs";
const { isSubclass } = foundry.utils;

/**
 * A class responsible for generating a sprite in a tile area.
 */
export default class TileSprite extends MediaSprite {
  /** @override */
  _createMesh() {
    // Get the area bounds
    const { x, y, width, height } = this.area;

    // Rotate the mesh
    this._mesh.anchor.set(0.5);
    this._mesh.rotation = Math.toRadians(this.area.rotation);

    // Scale the mesh to appropriate dimensions
    this._mesh.resize(width, height, { fit: this.fitMode });

    // Position the mesh
    this._mesh.x = x + width / 2;
    this._mesh.y = y + height / 2;
  }

  /* -------------------------------------------- */

  /** @override */
  _createMask() {
    // Get the area bounds
    const { x, y, width, height } = this.area;

    // Draw the mask
    this._mask.beginFill(0xffffff, 1);
    this._mask.drawRect(x, y, width, height);
    this._mask.endFill();

    // Rotate the mask
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    this._mask.pivot.set(centerX, centerY);
    this._mask.x = centerX;
    this._mask.y = centerY;
    this._mask.rotation = Math.toRadians(this.area.rotation);
  }

  /* -------------------------------------------- */

  /** @override */
  _createBorder() {
    const thickness = CONFIG.Canvas.objectBorderThickness * game.canvas.dimensions.uiScale;
    for (const lineStyle of [
      { width: thickness, color: 0x000000, join: PIXI.LINE_JOIN.ROUND, alignment: 0.75 },
      { width: thickness / 2, color: 0xffffff, join: PIXI.LINE_JOIN.ROUND, alignment: 1 },
    ]) {
      // Assign the line style of the shape
      this._border.lineStyle(lineStyle);

      // Create the shape
      this._border.drawRect(this.area.x, this.area.y, this.area.width, this.area.height);

      // Rotate the shape
      this._border.pivot.set(this.area.x + this.area.width / 2, this.area.y + this.area.height / 2);
      this._border.x = this.area.x + this.area.width / 2;
      this._border.y = this.area.y + this.area.height / 2;
      this._border.rotation = Math.toRadians(this.area.rotation);
    }
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured implementation for this sprite type.
   * @type {typeof TileSprite}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.canvas.TileSprite;
    if (!isSubclass(Class, TileSprite)) {
      console.warn("Configured TileSprite override must be a subclass of TileSprite.");
      Class = TileSprite;
    }
    return Class;
  }
}
