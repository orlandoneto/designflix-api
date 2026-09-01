/**
 * Modo de upload em disco (dev/testes).
 * Produção e caminho S3 canônico NÃO usam isto.
 *
 * Ativar no .env:
 *   STORAGE_TYPE=local
 *   STORAGE_TYPE=develop
 *   (ou STORAGE_DRIVER com os mesmos valores)
 */
function isLocalUploadMode() {
  const forced = (
    process.env.STORAGE_DRIVER ||
    process.env.STORAGE_TYPE ||
    ""
  )
    .toLowerCase()
    .trim();
  return forced === "local" || forced === "develop" || forced === "development";
}

module.exports = { isLocalUploadMode };
