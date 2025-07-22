export default {
  printWidth: 100,
  plugins: ["@homer0/prettier-plugin-jsdoc"],

  // JsDoc configuration
  jsdocPrintWidth: 125,
  jsdocConsistentColumns: false,
  jsdocAllowAccessTag: false,
  jsdocFormatDotForArraysAndObjects: false,
  jsdocReplaceTagsSynonyms: false,
  jsdocLinesBetweenDescriptionAndTags: 0,
  jsdocUseInlineCommentForASingleTagBlock: true,
  jsdocLinesBetweenExampleTagAndCode: 0,
  jsdocExperimentalFormatCommentsWithoutTags: true,
  jsdocExperimentalIgnoreInlineForCommentsWithoutTags: true,
};
