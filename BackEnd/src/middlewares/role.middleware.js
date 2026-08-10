/**
 * Middleware para validar que el usuario cuente con los roles autorizados.
 * 
 * @param {string[]} allowedRoles - Lista de roles permitidos para acceder a la ruta.
 * @returns {import("express").RequestHandler} Middleware de Express.
 */
export function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado. Middleware auth debe preceder a este guard." });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ error: "No autorizado. Permisos insuficientes." });
    }

    next();
  };
}
