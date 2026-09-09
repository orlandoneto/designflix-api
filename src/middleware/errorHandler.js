/**
 * Fim da pilha do Express.
 *
 * Sem estes dois, rota inexistente e `throw` em rota async caem no handler
 * default do Express, que responde HTML — furando o envelope
 * `{ success, message }` que o resto da API garante e entregando stack trace
 * ao cliente quando `NODE_ENV` não é produção.
 *
 * @see src/utils/httpResponse.js
 */

const { notFound, serverError } = require('../utils/httpResponse');

function notFoundHandler(req, res) {
  return notFound(res, 'Endpoint não encontrado');
}

function errorHandler(logger = console) {
  return (err, req, res, next) => {
    logger.error(`[HTTP] ${req.method} ${req.originalUrl}`, {
      message: err && err.message,
      stack: err && err.stack,
    });

    // Resposta já começou a ir: só o Express sabe abortar a conexão sem
    // corromper o corpo que o cliente está lendo.
    if (res.headersSent) return next(err);

    // Mensagem genérica de propósito: `err.message` cru vaza detalhe de
    // implementação (nome de tabela, caminho de arquivo) para o cliente.
    return serverError(res);
  };
}

module.exports = { notFoundHandler, errorHandler };
