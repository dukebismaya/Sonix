const { URL } = require('url');
const { Readable } = require('stream');

const JAMENDO_DOMAIN = /.jamendo\.com$/i;
const SAFE_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
];

function getSearchParams(req) {
  if (req.query) {
    return req.query;
  }

  const url = req.url || '';
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return {};
  }

  const params = new URLSearchParams(url.slice(queryIndex));
  const result = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function sendCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length,Content-Range,Accept-Ranges,Content-Type');
}

async function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
}

async function audioProxyHandler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      sendCorsHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendCorsHeaders(res);
      res.statusCode = 405;
      res.setHeader('Allow', 'GET,HEAD,OPTIONS');
      res.end('Method Not Allowed');
      return;
    }

    const params = getSearchParams(req);
    const targetParam = Array.isArray(params.target) ? params.target[0] : params.target;

    if (!targetParam) {
      sendCorsHeaders(res);
      res.statusCode = 400;
      res.end('Missing target parameter');
      return;
    }

    if (targetParam.length > 2048) {
      sendCorsHeaders(res);
      res.statusCode = 414;
      res.end('Target URL too long');
      return;
    }

    let targetUrl;
    try {
      targetUrl = new URL(targetParam);
    } catch (error) {
      sendCorsHeaders(res);
      res.statusCode = 400;
      res.end('Invalid target URL');
      return;
    }

    if (!JAMENDO_DOMAIN.test(targetUrl.hostname)) {
      sendCorsHeaders(res);
      res.statusCode = 403;
      res.end('Host not allowed');
      return;
    }

    const fetchImpl = await ensureFetch();
    const upstream = await fetchImpl(targetUrl.toString(), {
      method: 'GET',
      headers: req.headers.range ? { Range: req.headers.range } : undefined,
    });

    sendCorsHeaders(res);
    SAFE_RESPONSE_HEADERS.forEach((header) => {
      const value = upstream.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.statusCode = upstream.status;

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const body = upstream.body;
    if (!body) {
      res.end();
      return;
    }

    if (typeof body.pipe === 'function') {
      body.pipe(res);
      return;
    }

    if (Readable.fromWeb) {
      Readable.fromWeb(body).pipe(res);
      return;
    }

    const reader = body.getReader();
    function push() {
      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            res.end();
            return;
          }
          res.write(Buffer.from(value));
          push();
        })
        .catch((error) => {
          console.error('Audio proxy stream error', error);
          res.destroy(error);
        });
    }
    push();
  } catch (error) {
    console.error('Audio proxy failure', error);
    if (!res.headersSent) {
      sendCorsHeaders(res);
      res.statusCode = 502;
      res.end('Upstream fetch failed');
    } else {
      res.end();
    }
  }
}

module.exports = audioProxyHandler;
