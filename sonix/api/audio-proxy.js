const audioProxyHandler = require('../server/audioProxyHandler');

module.exports = async function handler(req, res) {
  await audioProxyHandler(req, res);
};
