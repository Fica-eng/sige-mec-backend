const router = require('express').Router();
const { autenticar } = require('../middleware/auth');
const prisma = require('../config/prisma');

router.get('/dashboard', autenticar, async (req, res) => {
  try {
    const ano = parseInt(req.query.anoLetivo) || new Date().getFullYear();
    const [totalEscolas, totalAlunos, totalProfessores, alunosAtivos, alunosEvadidos, totalMatriculas, notasAgregadas] = await Promise.all([
      prisma.escola.count({ where: { ativa: true } }),
      prisma.aluno.count(),
      prisma.professorEscola.count({ where: { anoLetivo: ano, ativo: true } }),
      prisma.aluno.count({ where: { status: 'ATIVO' } }),
      prisma.aluno.count({ where: { status: 'EVADIDO' } }),
      prisma.matricula.count({ where: { anoLetivo: ano } }),
      prisma.nota.aggregate({ where: { anoLetivo: ano }, _avg: { valor: true } }),
    ]);
    const taxaEvasao = totalAlunos ? ((alunosEvadidos / totalAlunos) * 100).toFixed(1) : 0;
    res.json({
      anoLetivo: ano,
      escolas: { total: totalEscolas },
      alunos: { total: totalAlunos, ativos: alunosAtivos, evadidos: alunosEvadidos },
      professores: { total: totalProfessores },
      matriculas: { total: totalMatriculas },
      taxaEvasao: parseFloat(taxaEvasao),
      mediaNotas: notasAgregadas._avg.valor ? notasAgregadas._avg.valor.toFixed(1) : null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/matriculas-por-provincia', autenticar, async (req, res) => {
  try {
    const provincias = await prisma.provincia.findMany({
      include: {
        escolas: {
          include: { _count: { select: { alunos: true, professores: true } } }
        }
      }
    });
    const resultado = provincias.map(p => ({
      id: p.id, nome: p.nome, codigo: p.codigo,
      totalEscolas: p.escolas.length,
      totalAlunos: p.escolas.reduce((s, e) => s + e._count.alunos, 0),
      totalProfessores: p.escolas.reduce((s, e) => s + e._count.professores, 0),
    }));
    res.json(resultado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/genero', autenticar, async (req, res) => {
  try {
    const [masculino, feminino] = await Promise.all([
      prisma.aluno.count({ where: { genero: 'M' } }),
      prisma.aluno.count({ where: { genero: 'F' } }),
    ]);
    const total = masculino + feminino;
    res.json({
      masculino, feminino, total,
      paridade: total ? (feminino / masculino).toFixed(2) : 0,
      pctFeminino: total ? ((feminino / total) * 100).toFixed(1) : 0,
      pctMasculino: total ? ((masculino / total) * 100).toFixed(1) : 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/evasao', autenticar, async (req, res) => {
  try {
    const [total, evadidos] = await Promise.all([
      prisma.aluno.count(),
      prisma.aluno.count({ where: { status: 'EVADIDO' } }),
    ]);
    res.json({
      totalAlunos: total,
      totalEvadidos: evadidos,
      taxaEvasao: total ? ((evadidos / total) * 100).toFixed(2) : 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/por-tipo-escola', autenticar, async (req, res) => {
  try {
    const contagem = await prisma.escola.groupBy({
      by: ['tipo'],
      where: { ativa: true },
      _count: { tipo: true }
    });
    res.json(contagem.map(c => ({ tipo: c.tipo, totalEscolas: c._count.tipo })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/ratio-professor-aluno', autenticar, async (req, res) => {
  try {
    const ano = parseInt(req.query.anoLetivo) || new Date().getFullYear();
    const provincias = await prisma.provincia.findMany({
      include: {
        escolas: {
          include: { _count: { select: { alunos: true, professores: { where: { anoLetivo: ano } } } } }
        }
      }
    });
    const resultado = provincias.map(p => {
      const totalAlunos = p.escolas.reduce((s, e) => s + e._count.alunos, 0);
      const totalProfs  = p.escolas.reduce((s, e) => s + e._count.professores, 0);
      const ratio = totalProfs ? Math.round(totalAlunos / totalProfs) : null;
      return {
        provincia: p.nome, totalAlunos, totalProfessores: totalProfs, ratio,
        status: !totalProfs ? 'SEM_DADOS' : ratio <= 25 ? 'EXCEDENTE' : ratio <= 35 ? 'ADEQUADO' : ratio <= 40 ? 'ATENCAO' : 'CRITICO'
      };
    });
    res.json(resultado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
