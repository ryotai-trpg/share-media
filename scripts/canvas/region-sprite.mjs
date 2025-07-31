import MediaSprite from "./media-sprite.mjs";

/**
 * A class responsible for generating a sprite in a region area.
 */
export default class RegionSprite extends MediaSprite {
  /** @override */
  _createMesh() {
    // Get the area bounds
    const { x, y, width, height } = this.area.bounds;

    // Scale the mesh to appropriate dimensions
    this._mesh.resize(width, height, { fit: this.fitMode });

    // Position the mesh
    this._mesh.x = x + (width - this._mesh.width) / 2;
    this._mesh.y = y + (height - this._mesh.height) / 2;
  }

  /* -------------------------------------------- */

  /** @override */
  _createMask() {
    // get the polygons
    const polygons = this.area.polygons;

    // Fill the mask
    if (polygons?.length) {
      this._mask.beginFill(0xffffff, 1);

      for (const polygon of polygons) {
        if (polygon.isPositive) {
          // Positive polygon = outer boundary
          this._mask.drawPolygon(polygon);
        } else {
          // Negative polygon = hole
          this._mask.beginHole();
          this._mask.drawPolygon(polygon);
          this._mask.endHole();
        }
      }

      this._mask.endFill();
    }
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

      // get the polygonTree
      const polygonsTree = this.area.polygonTree;

      // Create the shape
      for (const node of polygonsTree) {
        if (node.isHole) continue;
        this._border.drawShape(node.polygon);
        this._border.beginHole();
        for (const hole of node.children) this._border.drawShape(hole.polygon);
        this._border.endHole();
      }
    }
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured implementation for this sprite type.
   * @type {typeof RegionSprite}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.canvas.RegionSprite;
    if (!isSubclass(Class, RegionSprite)) {
      console.warn("Configured RegionSprite override must be a subclass of RegionSprite.");
      Class = RegionSprite;
    }
    return Class;
  }
}
