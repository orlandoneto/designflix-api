const path = require("path");

/**
 * Sanitize a filename to avoid problematic characters and mojibake artifacts.
 * - Preserves the original extension
 * - Normalizes unicode (removes diacritics)
 * - Removes box-drawing and control characters
 * - Restricts to [a-zA-Z0-9._-] and replaces spaces with '-'
 * - Collapses multiple separators
 */
function sanitizeFilename(originalName) {
  try {
    if (!originalName || typeof originalName !== "string") {
      return "file";
    }

    const ext = (path.extname(originalName) || "").toLowerCase();
    const nameOnly = path.basename(originalName, ext);

    // Step 1: Unicode normalize and strip combining marks
    const normalized = nameOnly
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");

    // Step 2: Remove box-drawing chars and other odd symbols often seen in mojibake
    const noBoxDrawing = normalized.replace(/[\u2500-\u257F]/g, "");

    // Step 3: Replace anything not allowed with a space
    const safeChars = noBoxDrawing.replace(/[^a-zA-Z0-9._ -]+/g, " ");

    // Step 4: Collapse whitespace to single hyphen and trim
    const collapsed = safeChars.trim().replace(/\s+/g, "-");

    // Step 5: Prevent leading/trailing dots or dashes and collapse repeats
    const cleaned = collapsed
      .replace(/^[.-]+/, "")
      .replace(/[.-]+$/, "")
      .replace(/-{2,}/g, "-")
      .replace(/\.{2,}/g, ".");

    const base = cleaned || "file";
    return `${base}${ext}`;
  } catch (_e) {
    return "file";
  }
}

module.exports = { sanitizeFilename };


