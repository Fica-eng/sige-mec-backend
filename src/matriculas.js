const router = require('express').Router();
const { autenticar, autorizar, auditar } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { body, validationResult } = require('express-validator');

router.get('/', autenticar, async (req, res) => {
  try {
    const { turmaId, anoLetivo = new Date().getFullYear(), status } = req.query;
    const where = { anoLetivo: parseInt(anoLetivo) };
    if (turmaId) where.turmaId = parseInt(turmaId);
    if (status) where.status = status;
    const matriculas = await prisma.matricula.findMany({
      where,
      include: {
        aluno: { select: { nome: true, apelido: true, genero: true, numeroBI: true } },
        turma: { select: { nome: true, classe: true, turno: true } }
      },
      orderBy: { aluno: { apelido: 'asc' } }
    });
    res.json(matriculas);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', autenticar, autorizar('ADMIN_MEC', 'COORDENADOR_REGIONAL', 'DIRETOR_ESCOLA'),
  auditar('MATRICULAR', 'matriculas'),
  body('alunoId').isInt(), body('turmaId').isInt(), body('anoLetivo').isInt(),
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
    try {
      const matricula = await prisma.matricula.upsert({
        where: { alunoId_anoLetivo: { alunoId: req.body.alunoId, anoLetivo: req.body.anoLetivo } },
        update: { turmaId: req.body.turmaId, status: 'ATIVA' },
        create: req.body,
        include: {
          aluno: { select: { nome: true, apelido: true } },
          turma: { select: { nome: true } }
        }
      });
      res.status(201).json(matricula);
    } catch (err) {
      if (err.code === 'P2002') return res.status(400).json({ error: 'Aluno já matriculado neste ano letivo.' });
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
