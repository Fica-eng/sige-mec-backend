const router = require('express').Router();
const { autenticar, autorizar, auditar } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { body, validationResult } = require('express-validator');

router.get('/', autenticar, async (req, res) => {
  try {
    const { tipo, provinciaId, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { ativa: true };
    if (req.user.role === 'DIRETOR_ESCOLA') where.id = req.user.escolaId;
    else if (req.user.role === 'COORDENADOR_REGIONAL' && req.user.provinciaId) where.provinciaId = req.user.provinciaId;
    if (tipo) where.tipo = tipo;
    if (provinciaId) where.provinciaId = parseInt(provinciaId);
    if (search) where.OR = [
      { nome:   { contains: search, mode: 'insensitive' } },
      { codigo: { contains: search, mode: 'insensitive' } },
    ];
    const [escolas, total] = await Promise.all([
      prisma.escola.findMany({ where, skip, take: parseInt(limit), include: { provincia: { select: { nome: true } }, distrito: { select: { nome: true } }, _count: { select: { alunos: true, professores: true } } }, orderBy: { nome: 'asc' } }),
      prisma.escola.count({ where })
    ]);
    res.json({ data: escolas, meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/codigo/:codigo', autenticar, async (req, res) => {
  try {
    const escola = await prisma.escola.findUnique({
      where: { codigo: req.params.codigo.toUpperCase() },
      include: { provincia: { select: { nome: true } }, distrito: { select: { nome: true } }, _count: { select: { alunos: true, professores: true } } }
    });
    if (!escola) return res.status(404).json({ error: 'Escola não encontrada.' });
    res.json(escola);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', autenticar, async (req, res) => {
  try {
    const escola = await prisma.escola.findUnique({ where: { id: parseInt(req.params.id) }, include: { provincia: true, distrito: true, _count: { select: { alunos: true, professores: true } } } });
    if (!escola) return res.status(404).json({ error: 'Escola não encontrada.' });
    res.json(escola);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', autenticar, autorizar('ADMIN_MEC', 'COORDENADOR_REGIONAL'), auditar('CRIAR', 'escolas'),
  body('codigo').notEmpty(), body('nome').notEmpty(),
  body('tipo').isIn(['PRIMARIA', 'BASICA', 'SECUNDARIA']),
  body('provinciaId').isInt(), body('distritoId').isInt(),
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
    try {
      const escola = await prisma.escola.create({ data: req.body, include: { provincia: true, distrito: true } });
      res.status(201).json(escola);
    } catch (err) {
      if (err.code === 'P2002') return res.status(400).json({ error: 'Código já existe.' });
      res.status(500).json({ error: err.message });
    }
  }
);

router.put('/:id', autenticar, autorizar('ADMIN_MEC', 'COORDENADOR_REGIONAL'), auditar('ACTUALIZAR', 'escolas'), async (req, res) => {
  try {
    const escola = await prisma.escola.update({ where: { id: parseInt(req.params.id) }, data: req.body, include: { provincia: true, distrito: true } });
    res.json(escola);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Escola não encontrada.' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', autenticar, autorizar('ADMIN_MEC'), auditar('DESACTIVAR', 'escolas'), async (req, res) => {
  try {
    await prisma.escola.update({ where: { id: parseInt(req.params.id) }, data: { ativa: false } });
    res.json({ message: 'Escola desactivada.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
