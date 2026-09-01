/**
 * Respostas HTTP padronizadas do domínio de autenticação (público).
 * Status permitidos: 200 (sucesso), 400 (erro do cliente), 500 (erro interno).
 *
 * Envelope:
 *   200 → { success: true, message?, data? }
 *   400/500 → { success: false, message }
 */

function ok(res, { message, data } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  return res.status(200).json(body);
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function serverError(res, message = "Erro interno do servidor") {
  return res.status(500).json({ success: false, message });
}

module.exports = {
  ok,
  badRequest,
  serverError,
};
