import prisma from "../config/prisma.js";

/**
 * Calcula la distancia en kilómetros entre dos puntos geográficos usando la fórmula de Haversine.
 */
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Obtiene la lista de clientes con paginación, filtros y formato exacto.
 * Adicionalmente soporta filtro de proximidad por latitud, longitud y radio.
 * 
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {string} [params.search]
 * @param {string} [params.distrito]
 * @param {string} [params.estado]
 * @param {string} [params.fecha_pago]
 * @param {number} [params.lat]
 * @param {number} [params.lng]
 * @param {number} [params.radio]
 * @returns {Promise<Object>} Resultado con data paginada y objeto pagination.
 */
async function obtenerClientes({ page = 1, limit = 12, search = "", distrito, estado, fecha_pago, lat, lng, radio, asesorId } = {}) {
  const where = {};

  if (asesorId) where.asignaciones = { some: { id_asesor: Number(asesorId), estado: "ACTIVA" } };
  if (distrito) where.distrito = { equals: distrito.trim(), mode: "insensitive" };
  if (estado) where.estado = estado;
  if (fecha_pago) {
    const start = new Date(`${fecha_pago}T00:00:00.000Z`);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    where.ultima_gestion = { gte: start, lt: end };
  }

  if (search && search.trim() !== "") {
    const trimmedSearch = search.trim();
    where.OR = [
      { dni: { contains: trimmedSearch, mode: "insensitive" } },
      { nombres: { contains: trimmedSearch, mode: "insensitive" } },
      { apellido_paterno: { contains: trimmedSearch, mode: "insensitive" } },
      { apellido_materno: { contains: trimmedSearch, mode: "insensitive" } },
    ];
  }

  // Si se envían coordenadas de proximidad, aplicar filtro de Bounding Box a nivel de DB
  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radioKm = Number(radio || 5);

    if (!isNaN(latNum) && !isNaN(lngNum) && !isNaN(radioKm)) {
      // 1 grado de latitud es aproximadamente 111.1 km
      const deltaLat = radioKm / 111.1;
      // 1 grado de longitud es aproximadamente 111.1 km * cos(latitud)
      const deltaLng = radioKm / (111.1 * Math.cos(latNum * Math.PI / 180));

      where.latitud = {
        gte: latNum - deltaLat,
        lte: latNum + deltaLat
      };
      where.longitud = {
        gte: lngNum - deltaLng,
        lte: lngNum + deltaLng
      };
    }
  }

  const skip = (page - 1) * limit;
  const take = limit;

  const [total, clientes] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      skip,
      take,
      orderBy: {
        id_cliente: "asc",
      },
    }),
  ]);

  let data = clientes.map((cliente) => {
    const deuda_total =
      Number(cliente.deuda_castigada ?? 0) +
      Number(cliente.deuda_vigente ?? 0) +
      Number(cliente.otras_deudas ?? 0);

    const apellidos = `${cliente.apellido_paterno ?? ""} ${cliente.apellido_materno ?? ""}`.trim();

    return {
      id: cliente.id_cliente,
      id_cliente: cliente.id_cliente, // Asegura compatibilidad
      dni: cliente.dni,
      nombres: cliente.nombres,
      apellidos,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      distrito: cliente.distrito,
      deuda_total,
      dias_retraso: 0,
      estado: cliente.estado,
      fecha_gestion: cliente.ultima_gestion,
      latitud: cliente.latitud !== null && cliente.latitud !== undefined ? Number(cliente.latitud) : null,
      longitud: cliente.longitud !== null && cliente.longitud !== undefined ? Number(cliente.longitud) : null,
    };
  });

  // Si se pasaron coordenadas, aplicar filtro estricto de distancia circular (Haversine) y ordenar
  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radioKm = Number(radio || 5);

    if (!isNaN(latNum) && !isNaN(lngNum) && !isNaN(radioKm)) {
      data = data
        .map(c => {
          if (c.latitud === null || c.longitud === null) return { ...c, distancia_km: null };
          const dist = calcularDistanciaHaversine(latNum, lngNum, c.latitud, c.longitud);
          return { ...c, distancia_km: parseFloat(dist.toFixed(2)) };
        })
        .filter(c => c.distancia_km !== null && c.distancia_km <= radioKm)
        .sort((a, b) => a.distancia_km - b.distancia_km);
    }
  }

  const finalTotal = (lat !== undefined && lat !== null && lng !== undefined && lng !== null) ? data.length : total;
  const totalPages = Math.ceil(finalTotal / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total: finalTotal,
      totalPages,
    },
  };
}

async function obtenerPuntosMapa({ estado, fecha_pago, zoom = 6, west, east, south, north, asesorId } = {}) {
  const where = { latitud: { not: null }, longitud: { not: null } };
  if (asesorId) where.asignaciones = { some: { id_asesor: Number(asesorId), estado: "ACTIVA" } };
  if ([west, east, south, north].every(value => Number.isFinite(value))) {
    where.latitud = { gte: south, lte: north };
    where.longitud = { gte: west, lte: east };
  }
  const clientes = await prisma.cliente.findMany({ where, select: {
    id_cliente: true, dni: true, nombres: true, apellido_paterno: true, apellido_materno: true,
    direccion: true, distrito: true, ultima_gestion: true, deuda_castigada: true, deuda_vigente: true,
    otras_deudas: true, latitud: true, longitud: true,
    rutas_clientes: {
      orderBy: { fecha_actualizar: 'desc' }, take: 1,
      select: { estado_visita: true, fecha_actualizar: true, ruta: { select: { estado: true } } },
    },
  } });
  const getOperationalState = cliente => {
    const enlace = cliente.rutas_clientes[0];
    if (enlace) {
      if (enlace.estado_visita === 'REPROGRAMADO') return { estado: 'REPROGRAMADO', fecha: enlace.fecha_actualizar };
      if (enlace.estado_visita === 'NO_ENCONTRADO') return { estado: 'NO_ENCONTRADO', fecha: enlace.fecha_actualizar };
      if (enlace.estado_visita === 'VISITADO') return { estado: 'GESTIONADO', fecha: enlace.fecha_actualizar };
      if (enlace.ruta.estado === 'EN_PROCESO') return { estado: 'EN_VISITA', fecha: enlace.fecha_actualizar };
    }
    return { estado: 'LIBRE', fecha: cliente.ultima_gestion };
  };
  const clientesOperativos = clientes.map(cliente => ({ ...cliente, ...getOperationalState(cliente) }))
    .filter(cliente => !estado || cliente.estado === estado)
    .filter(cliente => {
      if (!fecha_pago) return true;
      if (!cliente.fecha) return false;
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(cliente.fecha)) === fecha_pago;
    });
  const total = clientesOperativos.length;
  const gridSize = Math.max(0.0003, 20 / (2 ** Math.max(1, Math.min(18, zoom))));
  const groups = new Map();
  for (const cliente of clientesOperativos) {
    const latitud = Number(cliente.latitud); const longitud = Number(cliente.longitud);
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud) || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) continue;
    const key = `${Math.floor(latitud / gridSize)}:${Math.floor(longitud / gridSize)}`;
    const group = groups.get(key) || { count: 0, lat: 0, lng: 0, sample: cliente, estados: {} };
    group.count++; group.lat += latitud; group.lng += longitud;
    group.estados[cliente.estado] = (group.estados[cliente.estado] || 0) + 1;
    groups.set(key, group);
  }
  const points = [...groups.values()].map(group => {
    if (group.count > 1) {
      const dominantState = Object.entries(group.estados).sort((a, b) => b[1] - a[1])[0]?.[0] || 'LIBRE';
      return { cluster: true, count: group.count, estado: Object.keys(group.estados).length === 1 ? dominantState : 'MIXTO', estados: group.estados, latitud: group.lat / group.count, longitud: group.lng / group.count };
    }
    const c = group.sample;
    return {
      cluster: false, id: c.id_cliente, dni: c.dni, nombres: c.nombres,
      apellidos: `${c.apellido_paterno || ''} ${c.apellido_materno || ''}`.trim(),
      direccion: c.direccion, distrito: c.distrito, estado: c.estado,
      deuda_total: Number(c.deuda_castigada || 0) + Number(c.deuda_vigente || 0) + Number(c.otras_deudas || 0),
      latitud: Number(c.latitud), longitud: Number(c.longitud),
    };
  });
  return { data: points, total, visibles: clientesOperativos.length, clusters: points.filter(point => point.cluster).length };
}

/**
 * Obtiene un cliente por su id_cliente y lo devuelve con el formato y transformaciones requeridos.
 * 
 * @param {number} id - El ID del cliente a buscar (id_cliente).
 * @returns {Promise<Object|null>} Objeto con la propiedad data conteniendo el cliente transformado, o null si no se encuentra.
 */
async function obtenerClientePorId(id, asesorId) {
  const cliente = await prisma.cliente.findFirst({
    where: {
      id_cliente: id,
      ...(asesorId ? { asignaciones: { some: { id_asesor: Number(asesorId), estado: "ACTIVA" } } } : {}),
    },
    include: {
      visitas: {
        orderBy: { fecha_creacion: 'desc' },
        include: { asesor: true },
      },
    },
  });

  if (!cliente) {
    return null;
  }

  const deuda_castigada = Number(cliente.deuda_castigada ?? 0);
  const deuda_vigente = Number(cliente.deuda_vigente ?? 0);
  const otras_deudas = Number(cliente.otras_deudas ?? 0);
  const deuda_total = deuda_castigada + deuda_vigente + otras_deudas;

  const apellidos = `${cliente.apellido_paterno ?? ""} ${cliente.apellido_materno ?? ""}`.trim();

  return {
    data: {
      id: cliente.id_cliente,
      dni: cliente.dni,
      nombres: cliente.nombres,
      apellidos,
      apellido_paterno: cliente.apellido_paterno,
      apellido_materno: cliente.apellido_materno,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      distrito: cliente.distrito,
      deuda_castigada,
      deuda_vigente,
      otras_deudas,
      deuda_total,
      estado: cliente.estado,
      fecha_gestion: cliente.ultima_gestion,
      latitud: cliente.latitud !== null && cliente.latitud !== undefined ? Number(cliente.latitud) : null,
      longitud: cliente.longitud !== null && cliente.longitud !== undefined ? Number(cliente.longitud) : null,
      gestiones: cliente.visitas.map(visita => ({
        id: visita.id_visita,
        tipificacion: visita.resultado || 'GESTIONADO',
        resultado: visita.resultado,
        observacion: visita.observaciones,
        created_at: visita.fecha_creacion,
        fecha_hora_checkin: visita.fecha_hora_checkin,
        fecha_hora_checkout: visita.fecha_hora_checkout,
        monto_recaudado: visita.monto_recaudado !== null ? Number(visita.monto_recaudado) : null,
        fecha_promesa: visita.fecha_promesa,
        worker_nombre: `${visita.asesor.nombres} ${visita.asesor.apellido_paterno || ''}`.trim(),
        evidencias: visita.foto_url ? [visita.foto_url] : [],
        es_offline: false,
      })),
    },
  };
}

/**
 * Normaliza los nombres de encabezado de Excel eliminando acentos, 
 * caracteres especiales de formato, espacios redundantes y convirtiendo a minúsculas.
 * 
 * @param {string} header 
 * @returns {string}
 */
function normalizarHeaderKey(header) {
  if (!header || typeof header !== "string") return "";
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos/diacríticos
    .replace(/[^a-z0-9,\s_]/g, "")   // Mantener alfanuméricos, coma, espacio y guion bajo
    .replace(/\s+/g, " ");           // Espacios simples
}

/**
 * Convierte montos con formatos tipo "S/ 18,944.21" o números a float.
 * 
 * @param {any} val 
 * @returns {number}
 */
function parseMonto(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;

  const str = String(val).trim();
  if (!str) return 0;

  // Remover prefijos de moneda (S/, S/., $, PEN, USD), comas de miles y espacios
  const cleanStr = str
    .replace(/(S\/\.?|\$|PEN|USD)/gi, "")
    .replace(/,/g, "")
    .trim();

  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

/**
 * Separa la cadena de nombres según el estándar SBS:
 * 1. Si contiene coma (,), todo lo que está antes de la coma son Apellidos y después Nombres.
 *    - Apellidos con >= 2 palabras -> palabra[0] = Paterno, resto = Materno.
 *    - Apellidos con 1 palabra -> palabra[0] = Paterno, Materno = "".
 * 2. Si no contiene coma, asume formato por espacios.
 * 
 * @param {string} nombreCadena 
 * @returns {{ apellido_paterno: string, apellido_materno: string, nombres: string }}
 */
function separarNombreCompleto(nombreCadena) {
  if (!nombreCadena || typeof nombreCadena !== "string") {
    return { apellido_paterno: "", apellido_materno: "", nombres: "" };
  }

  const str = nombreCadena.trim();
  if (!str) {
    return { apellido_paterno: "", apellido_materno: "", nombres: "" };
  }

  // CASO 1: Delimitador por coma (,) -> "APELLIDOS, NOMBRES"
  if (str.includes(",")) {
    const partes = str.split(",");
    const rawApellidos = partes[0] ? partes[0].trim() : "";
    const rawNombres = partes.slice(1).join(",").trim();

    const palabrasApellidos = rawApellidos ? rawApellidos.split(/\s+/).filter(Boolean) : [];

    let apellido_paterno = "";
    let apellido_materno = "";

    if (palabrasApellidos.length >= 2) {
      apellido_paterno = palabrasApellidos[0];
      apellido_materno = palabrasApellidos.slice(1).join(" ");
    } else if (palabrasApellidos.length === 1) {
      apellido_paterno = palabrasApellidos[0];
      apellido_materno = "";
    }

    const nombresFinal = rawNombres || rawApellidos;

    return {
      apellido_paterno,
      apellido_materno,
      nombres: nombresFinal
    };
  }

  // CASO 2: Sin coma -> separación por espacios
  const palabras = str.split(/\s+/).filter(Boolean);

  if (palabras.length >= 3) {
    return {
      apellido_paterno: palabras[0],
      apellido_materno: palabras[1],
      nombres: palabras.slice(2).join(" ")
    };
  } else if (palabras.length === 2) {
    return {
      apellido_paterno: palabras[0],
      apellido_materno: palabras[1],
      nombres: str
    };
  } else if (palabras.length === 1) {
    return {
      apellido_paterno: palabras[0],
      apellido_materno: "",
      nombres: palabras[0]
    };
  }

  return { apellido_paterno: "", apellido_materno: "", nombres: str };
}

/**
 * Extrae latitud y longitud desde una columna unificada (ej: "LATITUD, LONGITUD")
 * o columnas individuales.
 * 
 * @param {Object} rowObj - Objeto con llaves ya normalizadas
 * @returns {{ latitud: number|null, longitud: number|null }}
 */
function extraerCoordenadas(rowObj) {
  // Buscar primero columna combinada (ej: "latitud, longitud", "latitud,longitud")
  let valCombinado = null;
  for (const key of Object.keys(rowObj)) {
    if (key.includes("latitud") && key.includes("longitud")) {
      valCombinado = rowObj[key];
      break;
    }
  }

  if (valCombinado !== null && valCombinado !== undefined && String(valCombinado).trim() !== "") {
    const str = String(valCombinado).trim();
    // Dividir por coma o espacio
    const partes = str.split(/[,;\s]+/).filter(Boolean);
    if (partes.length >= 2) {
      const lat = parseFloat(partes[0]);
      const lng = parseFloat(partes[1]);
      return {
        latitud: isNaN(lat) ? null : lat,
        longitud: isNaN(lng) ? null : lng
      };
    }
  }

  // Buscar columnas individuales
  let latVal = null;
  let lngVal = null;

  for (const key of Object.keys(rowObj)) {
    if (key === "latitud" || key === "lat") latVal = rowObj[key];
    if (key === "longitud" || key === "lng" || key === "long") lngVal = rowObj[key];
  }

  const lat = latVal !== null && latVal !== undefined && latVal !== "" ? parseFloat(latVal) : null;
  const lng = lngVal !== null && lngVal !== undefined && lngVal !== "" ? parseFloat(lngVal) : null;

  return {
    latitud: lat !== null && !isNaN(lat) ? lat : null,
    longitud: lng !== null && !isNaN(lng) ? lng : null
  };
}

/**
 * Procesa la importación del archivo Excel en la base de datos adaptando la estructura SBS de la Caja Huancayo.
 * Extrae únicamente los campos necesarios y los mapea a la tabla clientes.
 *
 * @param {Buffer} fileBuffer - El buffer binario del archivo Excel.
 * @returns {Promise<Object>} Resumen del procesamiento con totales.
 */
async function importarClientes(fileBuffer) {
  const workbook = xlsx.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  let insertados = 0;
  let errores = 0;
  const detalleErrores = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    
    // Normalizar llaves de la fila (ignorar mayúsculas/minúsculas, espacios adicionales y tildes)
    const rowObj = {};
    for (const key of Object.keys(rawRow)) {
      const normKey = normalizarHeaderKey(key);
      if (normKey) {
        rowObj[normKey] = rawRow[key];
      }
    }

    // Mapeo flexible de atributos (prioriza SBS, cae en formato interno)
    const rawDni = rowObj.documento ?? rowObj.dni ?? rowObj.doc_identidad ?? rowObj.num_doc;
    const rawNombres = rowObj.nombres ?? rowObj.nombre_completo ?? rowObj.cliente;
    const rawApPaterno = rowObj.apellido_paterno ?? rowObj.paterno ?? rowObj.ap_paterno;
    const rawApMaterno = rowObj.apellido_materno ?? rowObj.materno ?? rowObj.ap_materno;
    const rawDireccion = rowObj.direccion ?? rowObj.dir_domi ?? rowObj.domicilio;
    const rawDistrito = rowObj.dist_domi ?? rowObj.distrito ?? rowObj.dis_domi;
    const rawDeudaCastigada = rowObj["deuda castigada"] ?? rowObj.deuda_castigada ?? rowObj.castigada;
    const rawDeudaVigente = rowObj["deuda vigentes"] ?? rowObj["deuda vigente"] ?? rowObj.deuda_vigente ?? rowObj.vigente;
    const rawOtrasDeudas = rowObj["otras deudas"] ?? rowObj.otras_deudas ?? rowObj.otra_deuda;
    const rawTelefono = rowObj.telefono ?? rowObj.telef ?? rowObj.celular;
    const rawEstado = rowObj.estado;
    const rawUltimaGestion = rowObj.ultima_gestion ?? rowObj["ultima gestion"] ?? rowObj.fec_gestion;

    const dni = rawDni !== null && rawDni !== undefined ? String(rawDni).trim() : null;

    // Procesamiento de nombres y apellidos
    let nombres = rawNombres !== null && rawNombres !== undefined ? String(rawNombres).trim() : "";
    let apellido_paterno = rawApPaterno !== null && rawApPaterno !== undefined ? String(rawApPaterno).trim() : "";
    let apellido_materno = rawApMaterno !== null && rawApMaterno !== undefined ? String(rawApMaterno).trim() : "";

    if (nombres && (!apellido_paterno || apellido_paterno === "")) {
      const parsed = separarNombreCompleto(nombres);
      nombres = parsed.nombres;
      apellido_paterno = parsed.apellido_paterno;
      apellido_materno = parsed.apellido_materno;
    }

    // Validación básica mandatoria de la fila
    if (!dni || !nombres) {
      errores++;
      detalleErrores.push({
        fila: i + 2, // Fila 1 es la cabecera
        dni: dni || "",
        errores: ["El DNI y los Nombres son campos obligatorios"]
      });
      continue;
    }

    // Coordenadas (LATITUD, LONGITUD)
    const { latitud, longitud } = extraerCoordenadas(rowObj);

    // Montos
    const deuda_castigada = parseMonto(rawDeudaCastigada);
    const deuda_vigente = parseMonto(rawDeudaVigente);
    const otras_deudas = parseMonto(rawOtrasDeudas);

    // Campos secundarios
    const telefono = rawTelefono !== null && rawTelefono !== undefined && String(rawTelefono).trim() !== "" 
      ? String(rawTelefono).trim() 
      : null;
    const direccion = rawDireccion !== null && rawDireccion !== undefined && String(rawDireccion).trim() !== "" 
      ? String(rawDireccion).trim() 
      : null;
    const distrito = rawDistrito !== null && rawDistrito !== undefined && String(rawDistrito).trim() !== "" 
      ? String(rawDistrito).trim() 
      : null;
    const estado = rawEstado !== null && rawEstado !== undefined && String(rawEstado).trim() !== "" 
      ? String(rawEstado).trim() 
      : "ACTIVO";
    const ultima_gestion = rawUltimaGestion ? new Date(rawUltimaGestion) : null;

    try {
      await prisma.cliente.create({
        data: {
          dni,
          nombres,
          apellido_paterno: apellido_paterno || "",
          apellido_materno: apellido_materno || "",
          telefono,
          direccion,
          distrito,
          estado,
          deuda_castigada,
          deuda_vigente,
          otras_deudas,
          ultima_gestion: (ultima_gestion && !isNaN(ultima_gestion.getTime())) ? ultima_gestion : null,
          latitud,
          longitud,
        }
      });
      insertados++;
    } catch (err) {
      errores++;
      detalleErrores.push({
        fila: i + 2,
        dni,
        errores: [err.message]
      });
    }
  }

  return {
    insertados,
    actualizados: 0,
    errores,
    detalleErrores
  };
}

export default {
  obtenerClientes,
  obtenerPuntosMapa,
  obtenerClientePorId,
  importarClientes,
};
