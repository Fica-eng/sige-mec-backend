const router = require('express').Router();
const { autenticar, autorizar, auditar } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { body, validationResult } = require('express-validator');

router.get('/', autenticar, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { ativo: true };
    if (search) where.OR = [{ nome: { contains: search, mode: 'insensitive' } }, { apelido: { contains: search, mode: 'insensitive' } }];
    const [professores, total] = await Promise.all([
      prisma.professor.findMany({ where, skip, take: parseInt(limit), include: { escolas: { include: { escola: { select: { nome: true, tipo: true } } } }, disciplinas: { include: { disciplina: { select: { nome: true } } } } }, orderBy: { apelido: 'asc' } }),
      prisma.professor.count({ where })
    ]);
    res.json({ data: professores, meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', autenticar, async (req, res) => {
  try {
    const prof = await prisma.professor.findUnique({ where: { id: parseInt(req.params.id) }, include: { escolas: { include: { escola: true }, orderBy: { anoLetivo: 'desc' } }, disciplinas: { include: { disciplina: true } } } });
    if (!prof) return res.status(404).json({ error: 'Professor não encontrado.' });
    res.json(prof);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', autenticar, autorizar('ADMIN_MEC', 'COORDENADOR_REGIONAL'), auditar('CRIAR', 'professores'),
  body('nome').notEmpty(), body('apelido').notEmpty(),
  body('genero').isIn(['M', 'F']),
  body('habilitacao').isIn(['MEDIO', 'BACHAREL', 'LICENCIATURA', 'MESTRADO', 'DOUTORAMENTO']),
  body('numeroFuncionario').notEmpty(),
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
    try {
      const { escolaId, ...dados } = req.body;
      const prof = await prisma.professor.create({ data: { ...dados, dataNascimento: new Date(dados.dataNascimento) } });
      if (escolaId) {
        await prisma.professorEscola.create({ data: { professorId: prof.id, escolaId: parseInt(escolaId), anoLetivo: new Date().getFullYear() } });
      }
      res.status(201).json(prof);
    } catch (err) {
      if (err.code === 'P2002') return res.status(400).json({ error: 'Número de funcionário já existe.' });
      res.status(500).json({ error: err.message });
    }
  }
);

router.put('/:id', autenticar, autorizar('ADMIN_MEC', 'COORDENADOR_REGIONAL'), auditar('ACTUALIZAR', 'professores'), async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.escolaId;
    if (data.dataNascimento) data.dataNascimento = new Date(data.dataNascimento);
    const prof = await prisma.professor.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(prof);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Associar disciplina ao professor
router.post('/:id/disciplinas', autenticar, async (req, res) => {
  try {
    const { disciplinaId } = req.body;
    const r = await prisma.professorDisciplina.upsert({
      where: { professorId_disciplinaId: { professorId: parseInt(req.params.id), disciplinaId: parseInt(disciplinaId) } },
      update: {},
      create: { professorId: parseInt(req.params.id), disciplinaId: parseInt(disciplinaId) }
    });
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
