const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');

const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido.' });
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const utilizador = await prisma.utilizador.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, nome: true, ativo: true, escolaId: true, provinciaId: true }
    });
    if (!utilizador || !utilizador.ativo) {
      return res.status(401).json({ error: 'Utilizador inválido.' });
    }
    req.user = utilizador;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

const autorizar = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  next();
};

const auditar = (acao, tabela) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode < 400 && req.user) {
      try {
        await prisma.auditoria.create({
          data: {
            utilizadorId: req.user.id,
            acao, tabela,
            registoId: parseInt(req.params?.id) || null,
            detalhes: req.method !== 'GET' ? req.body : null,
            ip: req.ip,
          }
        });
      } catch (e) {}
    }
  });
  next();
};

module.exports = { autenticar, autorizar, auditar };
