const { RegionBehaviorType } = foundry.data.regionBehaviors;
const { isSubclass } = foundry.utils;

/**
 * The data model for a behavior that allows to share a media on the scene.
 * This is mainly a discriminant to choose a zone from the scene.
 */
export default class ShareRegionBehaviorType extends RegionBehaviorType {
  /**
   * The behavior type identifier.
   * @type {string}
   */
  static type = "share-media.ShareRegion";

  /** @override */
  static defineSchema() {
    return {};
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured ShareRegionBehaviorType implementation.
   * @type {typeof ShareRegionBehaviorType}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.canvas.ShareRegionBehaviorType;
    if (!isSubclass(Class, ShareRegionBehaviorType)) {
      console.warn(
        "Configured ShareRegionBehaviorType override must be a subclass of ShareRegionBehaviorType.",
      );
      Class = ShareRegionBehaviorType;
    }
    return Class;
  }
}
