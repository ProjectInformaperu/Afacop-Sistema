export function validate(schemas) {
  return async (req, _res, next) => {
    try {
      for (const location of ['params', 'query', 'body']) {
        if (!schemas[location]) continue;
        const parsed = await schemas[location].parseAsync(req[location]);
        if (location === 'body') req.body = parsed;
        req.validated = { ...(req.validated || {}), [location]: parsed };
      }
      next();
    } catch (error) {
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      next(error);
    }
  };
}
