'use strict';

const Avatar = require('../models/Avatar');
const { formatResponse } = require('../utils/helpers');

async function listAvatars(req, res, next) {
  try {
    const avatars = await Avatar.findAll();
    res.json(formatResponse({ avatars }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listAvatars };
