// POST /professores/:id/disciplinas
router.post('/:id/disciplinas', autenticar, async (req, res) => {
  try {
    var { disciplinaId } = req.body;
    var r = await prisma.professorDisciplina.upsert({
      where: { professorId_disciplinaId: { professorId: parseInt(req.params.id), disciplinaId: parseInt(disciplinaId) } },
      update: {},
      create: { professorId: parseInt(req.params.id), disciplinaId: parseInt(disciplinaId) }
    });
    res.json(r);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
