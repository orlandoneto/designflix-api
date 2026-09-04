/**
 * Catálogo público: nunca devolver o arquivo limpo (`url`) em listagens.
 * Preview só com url_cover / url_thumb (marca d'água).
 * O `url` limpo fica no detalhe para o fluxo de download autenticado
 * (próximo passo: trocar por signed URL server-side).
 */

function redactCleanFileUrl(item) {
  if (!item || typeof item !== 'object') return item;
  return { ...item, url: null };
}

function redactCleanFileUrlList(items) {
  if (!Array.isArray(items)) return items;
  return items.map(redactCleanFileUrl);
}

module.exports = {
  redactCleanFileUrl,
  redactCleanFileUrlList,
};
