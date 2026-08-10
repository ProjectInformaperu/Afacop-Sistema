import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query("SELECT id_asesor, nombres, correo, distrito FROM asesores WHERE dni = '88776655'");
    console.log('RESULTADO_DB_VERIFICACION:', JSON.stringify(res.rows, null, 2));

    const apiRes = await fetch('http://localhost:4001/api/asesores');
    const json = await apiRes.json();
    const carlos = (json.data || []).find(x => x.dni === '88776655');
    console.log('RESULTADO_API_VERIFICACION:', JSON.stringify(carlos, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
