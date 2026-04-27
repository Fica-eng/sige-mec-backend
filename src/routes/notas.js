const router = require('express').Router();
const { autenticar, autorizar, auditar } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { body, validationResult } = require('express-validator');

router.get('/', autenticar, async (req, res) => {
  try {
    const { disciplinaId, alunoId, anoLetivo = new Date().getFullYear(), trimestre } = req.query;
    const where = { anoLetivo: parseInt(anoLetivo) };
    if (disciplinaId) where.disciplinaId = parseInt(disciplinaId);
    if (alunoId) where.alunoId = parseInt(alunoId);
    if (trimestre) where.trimestre = parseInt(trimestre);
    const notas = await prisma.nota.findMany({ where, include: { aluno: { select: { nome: true, apelido: true } }, disciplina: { select: { nome: true } } }, orderBy: [{ aluno: { apelido: 'asc' } }, { trimestre: 'asc' }] });
    res.json(notas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', autenticar, auditar('LANCAR_NOTA', 'notas'),
  body('alunoId').isInt(), body('disciplinaId').isInt(),
  body('valor').isFloat({ min: 0, max: 20 }), body('trimestre').isInt({ min: 1, max: 3 }),
  body('anoLetivo').isInt(),
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
    try {
      const { alunoId, disciplinaId, anoLetivo, trimestre, valor, professorId = 1 } = req.body;
      const nota = await prisma.nota.upsert({
        where: { alunoId_disciplinaId_anoLetivo_trimestre: { alunoId, disciplinaId, anoLetivo, trimestre } },
        update: { valor },
        create: { alunoId, disciplinaId, anoLetivo, trimestre, valor, professorId },
        include: { aluno: { select: { nome: true, apelido: true } }, disciplina: { select: { nome: true } } }
      });
      res.json(nota);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

router.post('/lote', autenticar, async (req, res) => {
  const { notas, professorId = 1 } = req.body;
  if (!Array.isArray(notas)) return res.status(400).json({ error: 'Formato inválido.' });
  try {
    const results = await Promise.all(notas.map(n =>
      prisma.nota.upsert({
        where: { alunoId_disciplinaId_anoLetivo_trimestre: { alunoId: n.alunoId, disciplinaId: n.disciplinaId, anoLetivo: n.anoLetivo, trimestre: n.trimestre } },
        update: { valor: n.valor },
        create: { ...n, professorId }
      })
    ));
    res.json({ message: results.length + ' notas lançadas.', total: results.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
