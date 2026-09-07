/**
 * Normaliza width/height/file_size vindos do pipeline de upload (Sharp + archive).
 * Nunca lança — campos inválidos viram null.
 */
function resolvePersistedImageMeta(data) {
  const meta = data?.imageMetadata && typeof data.imageMetadata === 'object'
    ? data.imageMetadata
    : {};

  const width = Number(meta.width);
  const height = Number(meta.height);

  let fileSize = null;
  if (data?.contentSize != null && data.contentSize !== '') {
    fileSize = Number(data.contentSize);
  } else if (data?.previewSize != null && data.previewSize !== '') {
    fileSize = Number(data.previewSize);
  } else if (data?.file_size != null && data.file_size !== '') {
    fileSize = Number(data.file_size);
  }

  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : null,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : null,
    file_size:
      Number.isFinite(fileSize) && fileSize >= 0 ? Math.round(fileSize) : null,
  };
}

module.exports = {
  resolvePersistedImageMeta,
};
