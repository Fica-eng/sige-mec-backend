const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma  = require('../config/prisma');
const logger  = require('../config/logger');

const gerarTokens = (userId) => {
  const access = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refresh = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { access, refresh };
};

exports.login = async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
  const { email, password } = req.body;
  try {
    const utilizador = await prisma.utilizador.findUnique({
      where: { email },
      include: {
        escola:   { select: { id: true, nome: true } },
        provincia:{ select: { id: true, nome: true } }
      }
    });
    if (!utilizador || !utilizador.ativo) return res.status(401).json({ error: 'Credenciais inválidas.' });
    const valido = await bcrypt.compare(password, utilizador.passwordHash);
    if (!valido) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const { access, refresh } = gerarTokens(utilizador.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { token: refresh, utilizadorId: utilizador.id, expiresAt } });
    await prisma.utilizador.update({ where: { id: utilizador.id }, data: { ultimoLogin: new Date() } });

    logger.info('Login: ' + email + ' [' + utilizador.role + ']');
    res.json({
      accessToken: access, refreshToken: refresh,
      utilizador: { id: utilizador.id, nome: utilizador.nome, email: utilizador.email, role: utilizador.role, escola: utilizador.escola, provincia: utilizador.provincia }
    });
  } catch (err) {
    logger.error('Erro login: ' + err.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token obrigatório.' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const guardado = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!guardado || guardado.expiresAt < new Date()) return res.status(401).json({ error: 'Token inválido ou expirado.' });
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const { access, refresh: newRefresh } = gerarTokens(payload.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { token: newRefresh, utilizadorId: payload.id, expiresAt } });
    res.json({ accessToken: access, refreshToken: newRefresh });
  } catch (err) {
    res.status(401).json({ error: 'Token inválido.' });
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  res.json({ message: 'Sessão terminada.' });
};

exports.me = async (req, res) => {
  const u = await prisma.utilizador.findUnique({
    where: { id: req.user.id },
    select: { id: true, nome: true, email: true, role: true, ultimoLogin: true, escola: { select: { id: true, nome: true, tipo: true } }, provincia: { select: { id: true, nome: true } } }
  });
  res.json(u);
};

exports.alterarPassword = async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
  const { passwordAtual, passwordNova } = req.body;
  const utilizador = await prisma.utilizador.findUnique({ where: { id: req.user.id } });
  const valido = await bcrypt.compare(passwordAtual, utilizador.passwordHash);
  if (!valido) return res.status(400).json({ error: 'Palavra-passe actual incorrecta.' });
  const hash = await bcrypt.hash(passwordNova, 12);
  await prisma.utilizador.update({ where: { id: req.user.id }, data: { passwordHash: hash } });
  res.json({ message: 'Palavra-passe alterada.' });
};
