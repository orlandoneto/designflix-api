const path = require("path");

/**
 * Sanitize a filename to avoid problematic characters and mojibake artifacts.
 * - Preserves the original extension
 * - Normalizes unicode (removes diacritics)
 * - Removes box-drawing and control characters
 * - Restricts to [a-zA-Z0-9._-] e remove espaços em branco
 * - Collapses multiple separators
 */
function sanitizeFilename(originalName, maxLength = 50) {
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

    // Step 3: Remove disallowed chars and whitespace (replace by dash)
    const safeChars = noBoxDrawing.replace(/[^a-zA-Z0-9._-]+/g, "-");

    // Step 4: Prevent leading/trailing dots or dashes and collapse repeats
    let cleaned = safeChars
      .replace(/^[._-]+/, "")
      .replace(/[._-]+$/, "")
      .replace(/-{2,}/g, "-")
      .replace(/\.{2,}/g, ".");

    // Step 5: Truncate if too long
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength);
    }

    const base = cleaned || "file";
    return `${base}${ext}`;
  } catch (_e) {
    return "file";
  }
}

module.exports = { sanitizeFilename };


