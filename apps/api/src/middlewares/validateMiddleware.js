function validateBody(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const message = err.errors.map((e) => e.message).join(', ');
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message,
            details: err.errors,
          },
        });
      }
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
        },
      });
    }
  };
}

module.exports = {
  validateBody,
};

