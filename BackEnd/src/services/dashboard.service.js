import prisma from "../config/prisma.js";

/**
 * Obtiene las estadísticas agregadas para el Dashboard (Fase 1 + Consolidado independiente).
 * 
 * @returns {Promise<Object>} KPIs y agrupaciones del dashboard.
 */
async function obtenerStats() {
  // Calcular inicio y fin del día actual en la zona horaria de Perú (America/Lima, UTC-5)
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const formattedDate = formatter.format(new Date()); // Formato YYYY-MM-DD
  
  // Las visitas son instantes reales y se contabilizan según el día de Lima.
  const startOfDay = new Date(`${formattedDate}T00:00:00-05:00`);
  const endOfDay = new Date(`${formattedDate}T23:59:59.999-05:00`);
  // fecha_programada es una fecha de calendario. Estos límites reconocen el
  // formato actual y los registros heredados que quedaron a medianoche UTC.
  const routeStartOfDay = new Date(`${formattedDate}T00:00:00.000Z`);
  const routeEndOfDay = new Date(`${formattedDate}T23:59:59.999Z`);

  // Ejecutar consultas concurrentes a la base de datos radar360
  const [
    totalClientes,
    totalWorkers,
    totalAdmisiones,
    rutasHoy,
    rutasCompletadas,
    gestionesHoy,
    totalReprogramados,
    rawDistritos,
    rawEstadosGestion,
    asesores,
    totalVisitas,
    visitasEfectivas,
    recaudacion,
    pagosHoy,
    recaudacionHoy
  ] = await Promise.all([
    // 1. Total Clientes
    prisma.cliente.count(),

    // 2. Total Asesores Activos
    prisma.asesor.count({
      where: { estado: "ACTIVO" },
    }),

    // 3. Total Admisiones
    prisma.admision.count(),

    // 4. Rutas Hoy (programadas para la fecha actual)
    prisma.ruta.count({
      where: {
        fecha_programada: {
          gte: routeStartOfDay,
          lte: routeEndOfDay,
        },
        estado: { in: ["PROGRAMADA", "EN_PROCESO"] },
      },
    }),

    // 5. Rutas Completadas Hoy (estado FINALIZADA)
    prisma.ruta.count({
      where: {
        fecha_programada: {
          gte: routeStartOfDay,
          lte: routeEndOfDay,
        },
        estado: "FINALIZADA",
      },
    }),

    // 6. Gestiones Hoy (Visitas registradas hoy)
    prisma.visita.count({
      where: {
        fecha_creacion: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    }),

    // 7. Reprogramados Hoy (Visitas hoy con resultado REPROGRAMADO)
    prisma.visita.count({
      where: {
        fecha_creacion: {
          gte: startOfDay,
          lte: endOfDay,
        },
        resultado: "REPROGRAMADO",
      },
    }),

    // 8. Clientes por Distrito (Top 10)
    prisma.cliente.groupBy({
      by: ["distrito"],
      _count: { id_cliente: true },
      orderBy: { _count: { id_cliente: "desc" } },
      take: 10,
    }),

    // 9. Estado operativo más reciente de cada cliente. El campo Cliente.estado
    // es administrativo (ACTIVO/INACTIVO) y no representa la gestión de cobranza.
    prisma.$queryRaw`
      WITH ultima_gestion AS (
        SELECT DISTINCT ON (id_cliente) id_cliente, estado_visita
        FROM rutas_clientes
        ORDER BY id_cliente, fecha_actualizar DESC, id_ruta_cliente DESC
      )
      SELECT COALESCE(ug.estado_visita, 'PENDIENTE') AS estado, COUNT(*)::int AS total
      FROM clientes c
      LEFT JOIN ultima_gestion ug ON ug.id_cliente = c.id_cliente
      GROUP BY COALESCE(ug.estado_visita, 'PENDIENTE')
    `,

    // 10. Listado de asesores con rutas y visitas de hoy (para resumenWorkers)
    prisma.asesor.findMany({
      where: { estado: "ACTIVO" },
      include: {
        rutas: {
          where: {
            fecha_programada: {
              gte: routeStartOfDay,
              lte: routeEndOfDay,
            },
          },
          include: {
            rutas_clientes: true,
          },
        },
        visitas: {
          where: {
            fecha_creacion: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      },
    }),

    prisma.visita.count(),
    prisma.visita.count({ where: { es_efectiva: true } }),
    prisma.visita.aggregate({ _sum: { monto_recaudado: true } }),
    prisma.visita.count({
      where: {
        fecha_creacion: { gte: startOfDay, lte: endOfDay },
        OR: [{ resultado: 'PAGO' }, { monto_recaudado: { gt: 0 } }],
      },
    }),
    prisma.visita.aggregate({
      where: { fecha_creacion: { gte: startOfDay, lte: endOfDay } },
      _sum: { monto_recaudado: true },
    }),
  ]);

  // Formatear Clientes por Distrito al esquema que espera el frontend
  const clientesPorDistrito = rawDistritos.map((d) => ({
    distrito: d.distrito || "Sin distrito",
    total: String(d._count.id_cliente),
  }));

  // Formatear Clientes por Estado
  const totalsByStatus = new Map(rawEstadosGestion.map(item => [item.estado, Number(item.total)]));
  const clientesPorEstado = [
    { estado: 'PENDIENTE', total: String(totalsByStatus.get('PENDIENTE') || 0) },
    { estado: 'VISITADO', total: String(totalsByStatus.get('VISITADO') || 0) },
    { estado: 'REPROGRAMADO', total: String(totalsByStatus.get('REPROGRAMADO') || 0) },
    { estado: 'NO_ENCONTRADO', total: String(totalsByStatus.get('NO_ENCONTRADO') || 0) },
  ];

  // Formatear resumen de productividad de asesores
  const resumenWorkers = asesores.map((a) => {
    const total_asignados = a.rutas.reduce(
      (sum, r) => sum + r.rutas_clientes.length,
      0
    );
    const total_pagos = a.visitas.filter((v) => v.resultado === "PAGO").length;
    const total_reprogramados = a.visitas.filter(
      (v) => v.resultado === "REPROGRAMADO"
    ).length;
    const total_no_encontrados = a.visitas.filter(
      (v) => v.resultado === "NO_ENCONTRADO"
    ).length;

    return {
      worker_id: String(a.id_asesor),
      worker_nombre: `${a.nombres} ${a.apellido_paterno ?? ""} ${a.apellido_materno ?? ""}`.trim(),
      sede_id: null,
      estado_jornada: "INACTIVO", // Valor por defecto debido a falta de modulo Jornada
      validado: false, // Valor por defecto debido a falta de modulo Jornada
      total_asignados,
      total_pagos,
      total_reprogramados,
      total_no_encontrados,
    };
  });

  return {
    totalClientes,
    clientesPorEstado,
    workersActivos: totalWorkers,
    totalWorkers,
    totalAdmisiones,
    rutasHoy,
    rutasCompletadas,
    gestionesHoy,
    totalReprogramados,
    clientesPagoHoy: pagosHoy,
    montoRecuperadoHoy: Number(recaudacionHoy._sum.monto_recaudado || 0),
    efectividadCobranza: totalVisitas > 0 ? Math.round((visitasEfectivas / totalVisitas) * 100) : 0,
    montoRecuperado: Number(recaudacion._sum.monto_recaudado || 0),
    clientesPorDistrito,
    resumenWorkers,
  };
}

/**
 * Obtiene la actividad de visitas más reciente.
 * 
 * @param {Object} params
 * @param {number} params.limit
 * @param {number} params.offset
 * @returns {Promise<Array>} Listado de gestiones formateado.
 */
async function obtenerActividad({ limit, offset, id_asesor, fecha }) {
  const where = {};
  const routeWhere = {};
  let start;
  let end;
  if (id_asesor) {
    where.id_asesor = Number(id_asesor);
    routeWhere.id_asesor = Number(id_asesor);
  }
  if (fecha) {
    start = new Date(`${fecha}T00:00:00-05:00`);
    if (Number.isNaN(start.getTime())) {
      throw Object.assign(new Error('La fecha de actividad no es válida'), { statusCode: 400 });
    }
    end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.fecha_creacion = { gte: start, lt: end };
    routeWhere.fecha_actualizar = { gte: start, lt: end };
  }
  const [visitas, rutas] = await Promise.all([
    prisma.visita.findMany({
      where,
      take: limit + offset,
      orderBy: { fecha_creacion: 'desc' },
      include: { asesor: true, cliente: true },
    }),
    prisma.ruta.findMany({
      where: routeWhere,
      take: limit + offset,
      orderBy: { fecha_actualizar: 'desc' },
      include: {
        asesor: { select: { nombres: true } },
        rutas_clientes: {
          where: { estado_visita: { not: 'PENDIENTE' } },
          include: { cliente: true },
        },
      },
    }),
  ]);

  const visitEvents = visitas.map((v) => {
    const clienteApellido = `${v.cliente.apellido_paterno ?? ""} ${v.cliente.apellido_materno ?? ""}`.trim();
    return {
      id: String(v.id_visita),
      cliente_id: String(v.id_cliente),
      worker_id: String(v.id_asesor),
      tipificacion: v.resultado || "GESTIONADO",
      estado_nuevo: v.resultado || "GESTIONADO",
      observacion: v.observaciones || "",
      es_offline: false,
      created_at: v.fecha_creacion,
      worker_nombre: v.asesor.nombres,
      cliente_nombre: v.cliente.nombres,
      cliente_apellido: clienteApellido,
    };
  });

  const visitedRouteClients = new Set(visitas.map(item => item.id_ruta_cliente).filter(Boolean));
  const routeEvents = rutas.flatMap(route => {
    const base = {
      worker_id: String(route.id_asesor),
      worker_nombre: route.asesor.nombres,
      es_offline: false,
    };
    const events = [];
    if (route.fecha_inicio_real) events.push({
      ...base, id: `ruta-${route.id_ruta}-inicio`, tipificacion: 'RUTA_INICIADA',
      estado_nuevo: 'RUTA_INICIADA', observacion: `Ruta #${route.id_ruta}`,
      created_at: route.fecha_inicio_real,
    });
    if (route.estado === 'FINALIZADA' && route.fecha_fin_real) events.push({
      ...base, id: `ruta-${route.id_ruta}-fin`, tipificacion: 'RUTA_FINALIZADA',
      estado_nuevo: 'RUTA_FINALIZADA', observacion: `Ruta #${route.id_ruta}`,
      created_at: route.fecha_fin_real,
    });
    if (route.estado === 'CANCELADA') events.push({
      ...base, id: `ruta-${route.id_ruta}-cancelada`, tipificacion: 'RUTA_CANCELADA',
      estado_nuevo: 'RUTA_CANCELADA', observacion: `Ruta #${route.id_ruta}`,
      created_at: route.fecha_actualizar,
    });
    for (const item of route.rutas_clientes) {
      if (visitedRouteClients.has(item.id_ruta_cliente)) continue;
      events.push({
        ...base,
        id: `ruta-cliente-${item.id_ruta_cliente}-${item.estado_visita}`,
        cliente_id: String(item.id_cliente),
        tipificacion: item.estado_visita,
        estado_nuevo: item.estado_visita,
        observacion: `Ruta #${route.id_ruta}`,
        created_at: item.fecha_actualizar,
        cliente_nombre: item.cliente.nombres,
        cliente_apellido: `${item.cliente.apellido_paterno || ''} ${item.cliente.apellido_materno || ''}`.trim(),
      });
    }
    return events;
  });

  return [...visitEvents, ...routeEvents]
    .filter(event => !start || (new Date(event.created_at) >= start && new Date(event.created_at) < end))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(offset, offset + limit);
}

/**
 * Exporta el historial de visitas a formato CSV.
 * 
 * @param {Object} params
 * @param {string} [params.fecha_inicio]
 * @param {string} [params.fecha_fin]
 * @returns {Promise<string>} Contenido CSV.
 */
async function exportarActividad({ fecha_inicio, fecha_fin }) {
  const where = {};
  if (fecha_inicio || fecha_fin) {
    where.fecha_creacion = {};
    if (fecha_inicio) {
      where.fecha_creacion.gte = new Date(fecha_inicio);
    }
    if (fecha_fin) {
      const end = new Date(fecha_fin);
      if (fecha_fin.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      where.fecha_creacion.lte = end;
    }
  }

  const visitas = await prisma.visita.findMany({
    where,
    orderBy: {
      fecha_creacion: "desc",
    },
    include: {
      asesor: true,
      cliente: true,
    },
  });

  let csv = "ID,Worker,Cliente,Tipificacion,Estado Nuevo,Observacion,Fecha Hora\n";
  visitas.forEach((v) => {
    const fecha = new Date(v.fecha_creacion).toLocaleString("es-PE", { timeZone: "America/Lima" });
    const cleanObs = v.observaciones ? v.observaciones.replace(/"/g, '""').replace(/\n/g, " ") : "";
    const workerName = `${v.asesor.nombres} ${v.asesor.apellido_paterno ?? ""}`.trim();
    const clientName = `${v.cliente.nombres} ${v.cliente.apellido_paterno ?? ""} ${v.cliente.apellido_materno ?? ""}`.trim();
    csv += `${v.id_visita},"${workerName}","${clientName}",${v.resultado || "GESTIONADO"},${v.resultado || "GESTIONADO"},"${cleanObs}","${fecha}"\n`;
  });

  return csv;
}

export default {
  obtenerStats,
  obtenerActividad,
  exportarActividad,
};
