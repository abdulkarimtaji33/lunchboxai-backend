'use strict';

const Avatar = require('../models/Avatar');
const { formatResponse } = require('../utils/helpers');

async function listAvatars(req, res, next) {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatars = await Avatar.findAll();
    const withUrls = avatars.map(av => ({
      ...av,
      image_url: `${baseUrl}/avatars/${av.filename}`,
    }));
    res.json(formatResponse({ avatars: withUrls }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listAvatars };
