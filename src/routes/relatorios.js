const router = require('express').Router();
const { autenticar } = require('../middleware/auth');
const prisma = require('../config/prisma');

router.get('/matriculas-anual', autenticar, async (req, res) => {
  try {
    const ano = parseInt(req.query.anoLetivo) || new Date().getFullYear();
    const [totalMatriculas, porGenero, porTipo] = await Promise.all([
      prisma.matricula.count({ where: { anoLetivo: ano, status: 'ATIVA' } }),
      prisma.aluno.groupBy({ by: ['genero'], _count: true }),
      prisma.escola.groupBy({ by: ['tipo'], where: { ativa: true }, _count: true }),
    ]);
    res.json({
      titulo: 'Relatório Anual de Matrículas ' + ano,
      anoLetivo: ano, totalMatriculas,
      distribuicaoGenero: Object.fromEntries(porGenero.map(g => [g.genero, g._count])),
      distribuicaoTipo: Object.fromEntries(porTipo.map(t => [t.tipo, t._count])),
      geradoEm: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/desempenho', autenticar, async (req, res) => {
  try {
    const ano = parseInt(req.query.anoLetivo) || new Date().getFullYear();
    const [mediaGeral, porDisciplina] = await Promise.all([
      prisma.nota.aggregate({ where: { anoLetivo: ano }, _avg: { valor: true } }),
      prisma.nota.groupBy({ by: ['disciplinaId'], where: { anoLetivo: ano }, _avg: { valor: true }, _count: true }),
    ]);
    const disciplinas = await prisma.disciplina.findMany({ select: { id: true, nome: true } });
    const discMap = Object.fromEntries(disciplinas.map(d => [d.id, d.nome]));
    res.json({
      titulo: 'Relatório de Desempenho ' + ano,
      anoLetivo: ano,
      mediaGeral: mediaGeral._avg.valor ? mediaGeral._avg.valor.toFixed(1) : null,
      porDisciplina: porDisciplina.map(d => ({ disciplina: discMap[d.disciplinaId] || 'N/A', media: d._avg.valor ? d._avg.valor.toFixed(1) : null, totalNotas: d._count })),
      geradoEm: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/evasao', autenticar, async (req, res) => {
  try {
    const [total, evadidos] = await Promise.all([
      prisma.aluno.count(),
      prisma.aluno.count({ where: { status: 'EVADIDO' } }),
    ]);
    const porProvincia = await prisma.provincia.findMany({
      include: { escolas: { include: { alunos: { where: { status: 'EVADIDO' }, select: { id: true } }, _count: { select: { alunos: true } } } } }
    });
    res.json({
      titulo: 'Relatório de Evasão Escolar',
      totalAlunos: total, totalEvadidos: evadidos,
      taxaNacional: total ? ((evadidos / total) * 100).toFixed(1) : '0.0',
      porProvincia: porProvincia.map(p => {
        const totalP = p.escolas.reduce((s, e) => s + e._count.alunos, 0);
        const evadidosP = p.escolas.reduce((s, e) => s + e.alunos.length, 0);
        return { provincia: p.nome, totalAlunos: totalP, evadidos: evadidosP, taxa: totalP ? ((evadidosP / totalP) * 100).toFixed(1) : '0.0' };
      }),
      geradoEm: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
