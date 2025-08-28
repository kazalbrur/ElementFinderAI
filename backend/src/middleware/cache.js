const NodeCache = require('node-cache');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

const cache = new NodeCache({
  stdTTL: config.cache.ttl,
  checkperiod: config.cache.checkPeriod
});

const generateCacheKey = (req) => {
  const body = req.body || {};
  const query = req.query || {};
  const data = { ...body, ...query, path: req.path };
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
};

const cacheMiddleware = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return next();
  }

  const key = generateCacheKey(req);
  const cachedData = cache.get(key);

  if (cachedData) {
    logger.info(`Cache hit for key: ${key}`);
    return res.json(cachedData);
  }

  res.sendResponse = res.json;
  res.json = (body) => {
    cache.set(key, body);
    logger.info(`Cache set for key: ${key}`);
    res.sendResponse(body);
  };

  next();
};

module.exports = { cacheMiddleware, cache };