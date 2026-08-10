import prisma from "../config/prisma.js";

async function obtenerVisitas() {
  return prisma.visita.findMany({
    orderBy: { fecha_hora_checkin: "desc" },
    take: 100,
    include: {
      cliente: { select: { nombres: true, apellido_paterno: true } },
      asesor: { select: { nombres: true, apellido_paterno: true } },
    },
  });
}

async function crearVisita(data) {
  return prisma.visita.create({
    data: {
      id_cliente: Number(data.id_cliente),
      id_asesor: Number(data.id_asesor),
      tipo_visita: data.tipo_visita || "EXTRAORDINARIA",
      fecha_hora_checkin: data.fecha_hora_checkin ? new Date(data.fecha_hora_checkin) : new Date(),
      latitud: Number(data.latitud || 0),
      longitud: Number(data.longitud || 0),
      resultado: data.resultado,
      es_efectiva: ["GESTIONADO", "PROMESA DE PAGO"].includes(data.resultado),
      monto_recaudado: data.monto_recaudado === "" || data.monto_recaudado == null ? null : Number(data.monto_recaudado),
      observaciones: data.observaciones || null,
    },
    include: { cliente: true, asesor: true },
  });
}

async function obtenerResumen() {
  const [visitas, efectivas, recaudacion] = await Promise.all([
    prisma.visita.count(),
    prisma.visita.count({ where: { es_efectiva: true } }),
    prisma.visita.aggregate({ _sum: { monto_recaudado: true } }),
  ]);
  return {
    visitas,
    efectivas,
    recaudacion: Number(recaudacion._sum.monto_recaudado || 0),
    efectividad: visitas ? Math.round((efectivas / visitas) * 100) : 0,
  };
}

export default { obtenerVisitas, crearVisita, obtenerResumen };
