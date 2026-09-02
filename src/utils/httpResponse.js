/**
 * Respostas HTTP padronizadas da API pública Designflix.
 *
 * Envelope:
 *   sucesso → { success: true, message?, data?, pagination?, meta? }
 *   erro    → { success: false, message }
 *
 * Status:
 *   200 — sucesso
 *   400 — erro do cliente (validação)
 *   404 — recurso não encontrado
 *   410 — endpoint/recurso removido
 *   500 — erro interno
 *
 * Auth público usa 200/400/500 (ver docs/contextos/auth-publico.md).
 * Catálogo/home usa também 404/410 quando aplicável.
 */

function ok(res, { message, data, pagination, meta } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  if (pagination !== undefined) body.pagination = pagination;
  if (meta !== undefined) body.meta = meta;
  return res.status(200).json(body);
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function notFound(res, message = 'Recurso não encontrado') {
  return res.status(404).json({ success: false, message });
}

function gone(res, message = 'Endpoint removido') {
  return res.status(410).json({ success: false, message });
}

function serverError(res, message = 'Erro interno do servidor') {
  return res.status(500).json({ success: false, message });
}

module.exports = {
  ok,
  badRequest,
  notFound,
  gone,
  serverError,
};
