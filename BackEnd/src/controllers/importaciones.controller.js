import fs from 'node:fs/promises';
import * as importacionesService from '../services/importaciones.service.js';

export function uploadType(type) {
  return async (req, res, next) => {
    try {
      if (!req.file) throw Object.assign(new Error('Debe adjuntar un archivo XLSX'), { statusCode: 400, code: 'FILE_REQUIRED' });
      const job = await importacionesService.createJob({ type, file: req.file, actorId: req.user.id });
      res.status(202).json({
        message: 'Archivo recibido; la importación se procesa en segundo plano',
        data: { id: job.id_importacion, estado: job.estado, archivo: job.archivo },
      });
    } catch (error) {
      if (req.file?.path) await fs.rm(req.file.path, { force: true }).catch(() => {});
      next(error);
    }
  };
}

export async function getJob(req, res, next) {
  try {
    const job = await importacionesService.getJob(req.params.id);
    if (!job) throw Object.assign(new Error('Importación no encontrada'), { statusCode: 404, code: 'IMPORT_NOT_FOUND' });
    res.json({ data: job });
  } catch (error) { next(error); }
}
