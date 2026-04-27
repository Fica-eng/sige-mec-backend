const router = require('express').Router();
const { autenticar, autorizar } = require('../middleware/auth');
const prisma = require('../config/prisma');

router.get('/', autenticar, async (req, res) => {
  try {
    const { escolaId, anoLetivo = new Date().getFullYear(), classe } = req.query;
    const where = { anoLetivo: parseInt(anoLetivo) };
    if (req.user.role === 'DIRETOR_ESCOLA') where.escolaId = req.user.escolaId;
    else if (escolaId) where.escolaId = parseInt(escolaId);
    if (classe) where.classe = parseInt(classe);
    const turmas = await prisma.turma.findMany({ where, include: { escola: { select: { nome: true } }, professor: { select: { nome: true, apelido: true } }, _count: { select: { matriculas: true } } }, orderBy: [{ classe: 'asc' }, { nome: 'asc' }] });
    res.json(turmas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', autenticar, autorizar('ADMIN_MEC', 'COORDENADOR_REGIONAL', 'DIRETOR_ESCOLA'), async (req, res) => {
  try {
    const turma = await prisma.turma.create({ data: req.body, include: { escola: { select: { nome: true } } } });
    res.status(201).json(turma);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
