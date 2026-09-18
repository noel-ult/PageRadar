import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() { try { await prisma.$queryRaw`SELECT 1`; console.log('Database connection: ok'); } finally { await prisma.$disconnect(); } }
void check();
