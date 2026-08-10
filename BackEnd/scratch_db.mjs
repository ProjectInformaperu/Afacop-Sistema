import { PrismaClient } from './generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const total = await prisma.cliente.count();
    const countWithCoords = await prisma.cliente.count({
      where: {
        NOT: {
          latitud: null
        }
      }
    });
    console.log('Total de clientes en DB:', total);
    console.log('Clientes con coordenadas:', countWithCoords);

    if (countWithCoords > 0) {
      const samples = await prisma.cliente.findMany({
        where: {
          NOT: {
            latitud: null
          }
        },
        take: 3
      });
      console.log('Muestras con coordenadas:', JSON.stringify(samples, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
