/** Normalização de format vs availability (legado: format === 'GRATIS'). */

const FREE_LEGACY_FORMAT = "GRATIS";

function normalizeAvailabilityInput(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "free" || raw === "gratis") return "free";
  if (raw === "paid" || raw === "premium" || raw === "pago") return "paid";
  return null;
}

function isLegacyFreeFormat(format) {
  return String(format || "").trim().toUpperCase() === FREE_LEGACY_FORMAT;
}

function inferFileFormatFromSources(sources) {
  const list = Array.isArray(sources) ? sources : [sources];
  for (const source of list) {
    if (!source) continue;
    const match = String(source).match(/\.([a-z0-9]+)(?:\?|#|$)/i);
    if (!match) continue;
    const ext = match[1].toUpperCase();
    if (ext === "JPG") return "JPEG";
    if (isLegacyFreeFormat(ext)) continue;
    return ext;
  }
  return "JPEG";
}

/** Input do upload — availability explícita ou pago por default. */
function resolveAvailabilityFromInput(data) {
  const fromInput = normalizeAvailabilityInput(data?.availability);
  if (fromInput) return fromInput;
  if (isLegacyFreeFormat(data?.format)) return "free";
  return "paid";
}

/** Formato real do arquivo — nunca persiste GRATIS. */
function resolveFileFormat(data) {
  const detected = String(data?.format || "").trim();
  if (detected && !isLegacyFreeFormat(detected)) {
    return detected.toUpperCase();
  }
  return inferFileFormatFromSources([
    data?.url,
    data?.url_cover,
    data?.url_thumb,
    data?.originalName,
    data?.name,
  ]);
}

function resolveAvailability(row) {
  const fromColumn = normalizeAvailabilityInput(row?.availability);
  if (fromColumn) return fromColumn;
  if (isLegacyFreeFormat(row?.format)) return "free";
  return "paid";
}

function resolveDisplayFormat(row) {
  const raw = String(row?.format || "").trim();
  if (raw && !isLegacyFreeFormat(raw)) {
    return raw.toUpperCase();
  }
  return inferFileFormatFromSources([
    row?.url,
    row?.url_cover,
    row?.url_thumb,
    row?.name,
  ]);
}

/** Filtro SQL para format=GRATIS (legado) ou format real. */
function appendFormatFilter(whereClauses, replacements, format) {
  if (!format || format === "null") return;
  if (isLegacyFreeFormat(format)) {
    whereClauses.push(
      `(umg.availability = 'free' OR UPPER(umg.format) = 'GRATIS')`
    );
    return;
  }
  whereClauses.push("umg.format = :format");
  replacements.format = format;
}

/** Where Sequelize para listagens por usuário. */
function buildSequelizeFormatWhere(format) {
  if (!format || format === "null") return null;
  if (isLegacyFreeFormat(format)) {
    const { Op } = require("sequelize");
    return {
      [Op.or]: [
        { availability: "free" },
        { format: FREE_LEGACY_FORMAT },
      ],
    };
  }
  return { format };
}

function mapGridItemFields(row) {
  return {
    format: resolveDisplayFormat(row),
    availability: resolveAvailability(row),
  };
}

module.exports = {
  FREE_LEGACY_FORMAT,
  normalizeAvailabilityInput,
  isLegacyFreeFormat,
  inferFileFormatFromSources,
  resolveAvailabilityFromInput,
  resolveFileFormat,
  resolveAvailability,
  resolveDisplayFormat,
  appendFormatFilter,
  buildSequelizeFormatWhere,
  mapGridItemFields,
};
