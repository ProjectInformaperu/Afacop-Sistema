import authService from "../services/auth.service.js";
import * as mfaService from "../services/mfa.service.js";

// Mapa de traducción de códigos de error internos a códigos de estado HTTP
const ERROR_STATUS_MAP = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  USER_INACTIVE: 403,
  USER_NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

/**
 * Controlador para manejar el inicio de sesión de usuarios.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    const resultado = await authService.login(username, password);

    if (!resultado.success) {
      const status = ERROR_STATUS_MAP[resultado.code] || 500;
      return res.status(status).json({ error: resultado.error });
    }

    if (resultado.mfaRequired || resultado.mfaEnrollmentRequired) {
      return res.status(200).json({
        mfaRequired: Boolean(resultado.mfaRequired),
        mfaEnrollmentRequired: Boolean(resultado.mfaEnrollmentRequired),
        challengeToken: resultado.challengeToken,
      });
    }
    return res.status(200).json({
      token: resultado.token,
      user: resultado.user,
    });
  } catch (error) {
    console.error("Error en authController.login:", error);
    return res.status(500).json({
      error: "Error interno del servidor al procesar el inicio de sesión"
    });
  }
}

async function verifyMfa(req, res, next) {
  try {
    const resultado = await authService.verifyMfa(req.body.challengeToken, req.body.code);
    res.json({ token: resultado.token, user: resultado.user });
  } catch (error) { next(error); }
}

async function setupMfaEnrollment(req, res, next) {
  try { res.json(await authService.setupMfaEnrollment(req.body.challengeToken)); } catch (error) { next(error); }
}

async function confirmMfaEnrollment(req, res, next) {
  try {
    const resultado = await authService.confirmMfaEnrollment(req.body.challengeToken, req.body.code);
    res.json({ token: resultado.token, user: resultado.user });
  } catch (error) { next(error); }
}

async function setupMfa(req, res, next) {
  try { res.json(await mfaService.setup(req.user.id, req.user.username)); } catch (error) { next(error); }
}

async function confirmMfa(req, res, next) {
  try { await mfaService.confirm(req.user.id, req.body.code); res.json({ message: 'MFA habilitado correctamente' }); } catch (error) { next(error); }
}

async function disableMfa(req, res, next) {
  try { await mfaService.disable(req.user.id, req.body.password); res.json({ message: 'MFA deshabilitado correctamente' }); } catch (error) { next(error); }
}

async function logout(req, res, next) {
  try { await authService.logout(req.user.id); res.status(204).send(); } catch (error) { next(error); }
}

/**
 * Controlador para obtener el perfil del usuario autenticado actualmente.
 * 
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function me(req, res) {
  try {
    // El ID de usuario es inyectado por el middleware de autenticación en req.user
    const idUsuario = req.user?.id;

    const resultado = await authService.me(idUsuario);

    if (!resultado.success) {
      const status = ERROR_STATUS_MAP[resultado.code] || 500;
      return res.status(status).json({ error: resultado.error });
    }

    return res.status(200).json({
      user: resultado.user
    });
  } catch (error) {
    console.error("Error en authController.me:", error);
    return res.status(500).json({
      error: "Error interno del servidor al obtener la sesión"
    });
  }
}

export default {
  login,
  verifyMfa,
  setupMfaEnrollment,
  confirmMfaEnrollment,
  setupMfa,
  confirmMfa,
  disableMfa,
  logout,
  me,
};
