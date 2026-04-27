const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({https://github.com/Fica-eng/sige-mec-backend/edit/main/src/prisma.js
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

module.exports = prisma;
