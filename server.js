require('dotenv').config();
const { execSync } = require('child_process');
const app    = require('./app');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3000;

async function iniciar() {

  // 1. Migrações
  try {
    logger.info('🔄 A aplicar migrações...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    logger.info('✅ Migrações aplicadas.');
  } catch (e) {
    logger.error('❌ Erro nas migrações: ' + e.message);
    process.exit(1);
  }

  // 2. Seed (não fatal)
  try {
    logger.info('🌱 A executar seed...');
    execSync('node prisma/seed.js', { stdio: 'inherit' });
    logger.info('✅ Seed concluído.');
  } catch (e) {
    logger.warn('⚠ Seed ignorado: ' + e.message);
  }

  // 3. Servidor
  app.listen(PORT, () => {
    logger.info('🚀 SIGE API iniciada na porta ' + PORT);
    logger.info('📍 Ambiente: ' + (process.env.NODE_ENV || 'development'));
  });
}

iniciar();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection: ' + err.message);
  process.exit(1);
});
