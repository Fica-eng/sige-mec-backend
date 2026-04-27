const router = require('express').Router();
const { autenticar, autorizar, auditar } = require('../middleware/auth');
const prisma = require('../config/prisma');
const { body, validationResult } = require('express-validator');

router.get('/', autenticar, async (req, res) => {
  try {
    const { escolaId, status, genero, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (req.user.role === 'DIRETOR_ESCOLA') where.escolaId = req.user.escolaId;
    else if (escolaId) where.escolaId = parseInt(escolaId);
    if (status) where.status = status;
    if (genero) where.genero = genero;
    if (search) where.OR = [
      { nome: { contains: search, mode: 'insensitive' } },
      { apelido: { contains: search, mode: 'insensitive' } },
      { numeroBI: { contains: search, mode: 'insensitive' } },
    ];
    const [alunos, total] = await Promise.all([
      prisma.aluno.findMany({ where, skip, take: parseInt(limit), include: { escola: { select: { nome: true, tipo: true } }, matriculas: { where: { anoLetivo: new Date().getFullYear() }, include: { turma: { select: { nome: true, classe: true } } } } }, orderBy: [{ apelido: 'asc' }, { nome: 'asc' }] }),
      prisma.aluno.count({ where })
    ]);
    res.json({ data: alunos, meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', autenticar, async (req, res) => {
  try {
    const aluno = await prisma.aluno.findUnique({ where: { id: parseInt(req.params.id) }, include: { escola: { select: { nome: true, tipo: true } }, matriculas: { include: { turma: true }, orderBy: { anoLetivo: 'desc' } }, notas: { include: { disciplina: { select: { nome: true } } }, orderBy: [{ anoLetivo: 'desc' }, { trimestre: 'asc' }] } } });
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
    res.json(aluno);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', autenticar, autorizar('ADMIN_MEC', 'COORDENADOR_REGIONAL', 'DIRETOR_ESCOLA'), auditar('CRIAR', 'alunos'),
  body('nome').notEmpty(), body('apelido').notEmpty(),
  body('dataNascimento').isISO8601(), body('genero').isIn(['M', 'F']), body('escolaId').isInt(),
  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
    try {
      const aluno = await prisma.aluno.create({ data: { ...req.body, dataNascimento: new Date(req.body.dataNascimento) }, include: { escola: { select: { nome: true } } } });
      res.status(201).json(aluno);
    } catch (err) {
      if (err.code === 'P2002') return res.status(400).json({ error: 'BI já registado.' });
      res.status(500).json({ error: err.message });
    }
  }
);

router.put('/:id', autenticar, autorizar('ADMIN_MEC', 'COORDENADOR_REGIONAL', 'DIRETOR_ESCOLA'), auditar('ACTUALIZAR', 'alunos'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.dataNascimento) data.dataNascimento = new Date(data.dataNascimento);
    const aluno = await prisma.aluno.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(aluno);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/transferir', autenticar, autorizar('ADMIN_MEC', 'COORDENADOR_REGIONAL', 'DIRETOR_ESCOLA'), body('escolaDestinoId').isInt(), async (req, res) => {
  try {
    const { escolaDestinoId, motivo } = req.body;
    const aluno = await prisma.aluno.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
    await prisma.$transaction([
      prisma.transferencia.create({ data: { alunoId: aluno.id, escolaOrigemId: aluno.escolaId, escolaDestinoId: parseInt(escolaDestinoId), motivo } }),
      prisma.aluno.update({ where: { id: aluno.id }, data: { escolaId: parseInt(escolaDestinoId), status: 'TRANSFERIDO' } })
    ]);
    res.json({ message: 'Transferência registada.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/boletim', autenticar, async (req, res) => {
  try {
    const { anoLetivo = new Date().getFullYear() } = req.query;
    const aluno = await prisma.aluno.findUnique({ where: { id: parseInt(req.params.id) }, include: { escola: { select: { nome: true } }, notas: { where: { anoLetivo: parseInt(anoLetivo) }, include: { disciplina: { select: { nome: true } } }, orderBy: [{ disciplinaId: 'asc' }, { trimestre: 'asc' }] } } });
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });
    const discMap = {};
    for (const nota of aluno.notas) {
      if (!discMap[nota.disciplinaId]) discMap[nota.disciplinaId] = { disciplina: nota.disciplina.nome, notas: [] };
      discMap[nota.disciplinaId].notas.push({ trimestre: nota.trimestre, valor: nota.valor });
    }
    for (const d of Object.values(discMap)) {
      d.media = d.notas.reduce((s, n) => s + n.valor, 0) / d.notas.length;
      d.aprovado = d.media >= 10;
    }
    const disciplinas = Object.values(discMap);
    const mediaGeral = disciplinas.length ? disciplinas.reduce((s, d) => s + d.media, 0) / disciplinas.length : 0;
    res.json({ aluno: { id: aluno.id, nome: aluno.nome + ' ' + aluno.apelido, escola: aluno.escola.nome }, anoLetivo: parseInt(anoLetivo), disciplinas, mediaGeral: Math.round(mediaGeral * 10) / 10, aprovado: mediaGeral >= 10 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
