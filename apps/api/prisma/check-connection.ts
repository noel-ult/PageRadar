import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(__dirname, '../../../.env') });
const prisma = new PrismaClient();
async function check() { try { await prisma.$queryRaw`SELECT 1`; console.log('Database connection: ok'); } finally { await prisma.$disconnect(); } }
void check();
