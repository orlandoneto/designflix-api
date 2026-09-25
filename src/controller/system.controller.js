const { formatApiOnlineMessage, resolveApiVersion } = require('../utils/apiVersion');

module.exports = (app) => {
  app.get('/', (req, res) => {
    const version = resolveApiVersion();
    res.status(200).type('text/plain').send(formatApiOnlineMessage(version));
  });
};
