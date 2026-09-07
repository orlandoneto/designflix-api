const { mapGridItemFields } = require('../../utils/grid-item');
const { mapBrowserAssetUrls } = require('../../utils/objectStorage');
const { redactCleanFileUrl } = require('../catalog/public-catalog-item');

const GRID_LIST_ATTRIBUTES = [
  'id',
  'name',
  'format',
  'availability',
  'url_thumb',
  'url_cover',
  'url',
  'count_download',
];

/**
 * Item de grid seguro para listagens da biblioteca (Salvos / Downloads).
 * Sempre redige `url` limpo.
 */
function mapLibraryGridItem(grid) {
  if (!grid) return null;
  const plain = typeof grid.toJSON === 'function' ? grid.toJSON() : { ...grid };
  const mapped = mapBrowserAssetUrls(plain);
  const fields = mapGridItemFields(mapped);
  return redactCleanFileUrl({
    id: mapped.id,
    name: mapped.name,
    format: fields.format,
    availability: fields.availability,
    url_thumb: mapped.url_thumb || null,
    url_cover: mapped.url_cover || null,
    url: mapped.url || null,
    count_download: mapped.count_download ?? null,
  });
}

module.exports = {
  GRID_LIST_ATTRIBUTES,
  mapLibraryGridItem,
};
