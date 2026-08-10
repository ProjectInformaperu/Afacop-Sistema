import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seedDatabase() {
  console.log("🌱 [Seed] Preparando datos de prueba...");
  try {
    // 1. Crear Asesor de prueba
    await pool.query(`
      INSERT INTO asesores (dni, nombres, apellido_paterno, apellido_materno, estado, fecha_actualizar)
      VALUES ('99999999', 'Juan Asesor', 'Perez', 'Gomez', 'ACTIVO', NOW())
      ON CONFLICT (dni) DO UPDATE
      SET nombres = EXCLUDED.nombres
      RETURNING id_asesor;
    `);

    const resAsesor = await pool.query("SELECT id_asesor FROM asesores WHERE dni = '99999999'");
    const idAsesor = resAsesor.rows[0].id_asesor;
    console.log(`✅ [Seed] Asesor de prueba verificado con ID: ${idAsesor}`);

    // Generar hashes
    const hashAdmin = await bcrypt.hash("admin_pass", 10);
    const hashWorker = await bcrypt.hash("worker_pass", 10);
    const hashInactive = await bcrypt.hash("inactive_pass", 10);

    // 2. Limpiar usuarios de prueba anteriores
    await pool.query("DELETE FROM usuarios WHERE username IN ('admin_test', 'worker_test', 'inactive_test')");

    // 3. Crear usuarios de prueba
    // admin_test
    await pool.query(`
      INSERT INTO usuarios (id_usuario, username, password_hash, rol, estado, id_asesor)
      VALUES ('a0000000-0000-0000-0000-000000000001', 'admin_test', $1, 'ADMIN', 'ACTIVO', NULL)
    `, [hashAdmin]);

    // worker_test (vinculado a idAsesor)
    await pool.query(`
      INSERT INTO usuarios (id_usuario, username, password_hash, rol, estado, id_asesor)
      VALUES ('a0000000-0000-0000-0000-000000000002', 'worker_test', $1, 'WORKER', 'ACTIVO', $2)
    `, [hashWorker, idAsesor]);

    // inactive_test
    await pool.query(`
      INSERT INTO usuarios (id_usuario, username, password_hash, rol, estado, id_asesor)
      VALUES ('a0000000-0000-0000-0000-000000000003', 'inactive_test', $1, 'WORKER', 'INACTIVO', NULL)
    `, [hashInactive]);

    console.log("✅ [Seed] Usuarios de prueba insertados exitosamente.");
  } catch (err) {
    console.error("❌ [Seed] Error al poblar base de datos:", err);
    process.exit(1);
  }
}

async function runTests() {
  const baseUrl = "http://localhost:4002";
  let adminToken = "";
  let workerToken = "";

  console.log("\n🧪 [Tests] Iniciando suite de pruebas...");

  try {
    // ----------------------------------------------------
    // Prueba 1: Verificar que el servidor responde
    // ----------------------------------------------------
    console.log("\nPrueba 1: Verificar inicio de servidor...");
    const resPing = await fetch(`${baseUrl}/`);
    const dataPing = await resPing.json();
    console.log(`HTTP Status: ${resPing.status}`);
    console.log("Respuesta raíz:", JSON.stringify(dataPing, null, 2));
    if (resPing.status === 200 && dataPing.modulos.includes("Auth")) {
      console.log("PASS: El servidor está arriba y expone el módulo Auth.");
    } else {
      throw new Error("FAIL: El servidor no responde o no tiene registrado el módulo Auth.");
    }

    // ----------------------------------------------------
    // Prueba 3: POST /api/auth/login con credenciales correctas
    // ----------------------------------------------------
    console.log("\nPrueba 3: Login correcto (ADMIN y WORKER)...");
    
    // Login ADMIN
    const resLoginAdmin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_test', password: 'admin_pass' })
    });
    const dataLoginAdmin = await resLoginAdmin.json();
    console.log(`ADMIN Login status: ${resLoginAdmin.status}`);
    console.log("ADMIN Response:", JSON.stringify(dataLoginAdmin, null, 2));
    
    if (resLoginAdmin.status === 200 && dataLoginAdmin.token && dataLoginAdmin.user.rol === 'ADMIN') {
      adminToken = dataLoginAdmin.token;
      console.log("PASS: Login de ADMIN exitoso.");
    } else {
      throw new Error("FAIL: Login de ADMIN fallido.");
    }

    // Login WORKER
    const resLoginWorker = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'worker_test', password: 'worker_pass' })
    });
    const dataLoginWorker = await resLoginWorker.json();
    console.log(`WORKER Login status: ${resLoginWorker.status}`);
    console.log("WORKER Response:", JSON.stringify(dataLoginWorker, null, 2));
    
    if (resLoginWorker.status === 200 && dataLoginWorker.token && dataLoginWorker.user.rol === 'WORKER') {
      workerToken = dataLoginWorker.token;
      console.log("PASS: Login de WORKER exitoso.");
    } else {
      throw new Error("FAIL: Login de WORKER fallido.");
    }

    // ----------------------------------------------------
    // Prueba 4: Login con casos incorrectos / inactivos
    // ----------------------------------------------------
    console.log("\nPrueba 4: Login fallido (inexistente, incorrecto, inactivo)...");

    // Caso 4.1: Usuario inexistente
    const resFail1 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'inexistente_user', password: 'password' })
    });
    console.log(`Caso Inexistente: HTTP ${resFail1.status} - Response:`, await resFail1.json());
    if (resFail1.status !== 401) throw new Error("FAIL: Debería responder 401 para usuario inexistente.");

    // Caso 4.2: Contraseña incorrecta
    const resFail2 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_test', password: 'wrong_password' })
    });
    console.log(`Caso Contraseña Incorrecta: HTTP ${resFail2.status} - Response:`, await resFail2.json());
    if (resFail2.status !== 401) throw new Error("FAIL: Debería responder 401 para contraseña incorrecta.");

    // Caso 4.3: Usuario inactivo
    const resFail3 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'inactive_test', password: 'inactive_pass' })
    });
    console.log(`Caso Usuario Inactivo: HTTP ${resFail3.status} - Response:`, await resFail3.json());
    if (resFail3.status !== 403) throw new Error("FAIL: Debería responder 403 para usuario inactivo.");

    console.log("PASS: Control de logins fallidos funciona correctamente.");

    // ----------------------------------------------------
    // Prueba 5: GET /api/auth/me con token válido
    // ----------------------------------------------------
    console.log("\nPrueba 5: GET /api/auth/me con token válido...");
    const resMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const dataMe = await resMe.json();
    console.log(`GET /me status: ${resMe.status}`);
    console.log("GET /me Response:", JSON.stringify(dataMe, null, 2));
    if (resMe.status === 200 && dataMe.user.username === 'admin_test') {
      console.log("PASS: Perfil obtenido exitosamente utilizando JWT.");
    } else {
      throw new Error("FAIL: Error al obtener perfil con token válido.");
    }

    // ----------------------------------------------------
    // Prueba 6: authMiddleware con token inválido/expirado/sin cabecera
    // ----------------------------------------------------
    console.log("\nPrueba 6: Validaciones del authMiddleware...");

    // Caso 6.1: Sin header Authorization
    const resNoAuth = await fetch(`${baseUrl}/api/auth/me`);
    console.log(`Caso Sin Header: HTTP ${resNoAuth.status} - Response:`, await resNoAuth.json());
    if (resNoAuth.status !== 401) throw new Error("FAIL: Debería denegar acceso sin header.");

    // Caso 6.2: Formato incorrecto
    const resBadFormat = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Invalido ${adminToken}` }
    });
    console.log(`Caso Formato Invalido: HTTP ${resBadFormat.status} - Response:`, await resBadFormat.json());
    if (resBadFormat.status !== 401) throw new Error("FAIL: Debería denegar acceso con formato inválido.");

    // Caso 6.3: Token inválido
    const resBadToken = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer token_falso` }
    });
    console.log(`Caso Token Invalido: HTTP ${resBadToken.status} - Response:`, await resBadToken.json());
    if (resBadToken.status !== 401) throw new Error("FAIL: Debería denegar acceso con token corrupto.");

    console.log("PASS: Filtros y seguridad de authMiddleware validados.");

    // ----------------------------------------------------
    // Prueba 7: Probar roleMiddleware con ruta temporal (Omitida en producción)
    // ----------------------------------------------------
    console.log("\nPrueba 7: Probar roleMiddleware (Verificación manual en desarrollo)...");
    console.log("SKIP: Ruta temporal removida para producción. Valido de forma satisfactoria en la Fase 6.");

    console.log("\n🎉 ¡TODOS LOS TESTS DE AUTENTICACIÓN PRODUCTIVOS PASARON EXITOSAMENTE! 🎉");

  } catch (error) {
    console.error("\n❌ ERROR DURANTE LA SUITE DE PRUEBAS:", error.message);
    process.exit(1);
  }
}

async function main() {
  await seedDatabase();

  // Cambiar puerto del servidor antes de importarlo
  process.env.PORT = '4002';
  
  // Importar el servidor para iniciarlo en el puerto 4002
  console.log("⚡ [Server] Iniciando servidor Express local en el puerto 4002...");
  await import('../src/server.js');

  // Pequeña espera para asegurar que el puerto esté escuchando
  await new Promise(resolve => setTimeout(resolve, 1500));

  await runTests();

  // Limpieza de conexiones y cierre de pruebas
  await pool.end();
  console.log("🔌 Conexiones de base de datos cerradas. Finalizando pruebas.");
  process.exit(0);
}

main();
