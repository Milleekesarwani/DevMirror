/**
 * Middleware factory to validate request body, query, or params against a Zod schema
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} source 
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // Use sanitized/parsed data
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validate;
