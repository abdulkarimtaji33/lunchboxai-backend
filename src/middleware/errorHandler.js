function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
