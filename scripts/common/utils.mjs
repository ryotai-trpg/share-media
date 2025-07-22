/* -------------------------------------------- */
/*  Utils functions used throughout the module
/* -------------------------------------------- */

/**
 * Register and preload handlebars partials.
 */
export const registerHandlebarsPartials = () => {
  foundry.applications.handlebars.loadTemplates({
    "share-media.media": "modules/share-media/templates/partials/media.hbs",
  });
};

/* -------------------------------------------- */

/**
 * Waits for the next animation frame(s).
 * Useful for deferring execution until after the browser has repainted.
 * @param {number} [count]  Number of animation frames to wait for (default: 1)
 * @returns {Promise<void>}
 */
export const nextAnimationFrames = async (count = 1) => {
  const promises = Array.from(
    { length: count },
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );
  await Promise.all(promises);
};

/* -------------------------------------------- */

/**
 * Attempt to retrieve the source of an HTML media element.
 * @param {HTMLElement} element  The element being analyzed.
 * @returns {string | null}
 */
export const getMediaSource = (element) => {
  if (!["IMG", "VIDEO"].includes(element?.tagName)) return null;
  return element.src || element.querySelector("source[src]")?.src || null;
};

/* -------------------------------------------- */

/**
 * Escape the URL, strip the origin, and replace dots with dashes as Foundry is using its own dot notation.
 * @param {string} url  The URL to escape.
 * @returns {string}
 */
export const escapeSource = (url) => {
  // [NOTE] handling relative URLs with a fake base
  const urlObj = new URL(url, "http://relative.url");
  return encodeURIComponent(urlObj.pathname + urlObj.search + urlObj.hash).replace(/\./g, "-");
};

/* -------------------------------------------- */

/**
 * Determine if a file is a video file (by extension)
 * @param {string} source  Source URL of a file.
 * @returns {boolean}
 */
export const isVideo = (source) => {
  return foundry.helpers.media.VideoHelper.hasVideoExtension(source);
};
