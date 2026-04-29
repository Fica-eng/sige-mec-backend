var router = require('express').Router();
var prisma = require('../config/prisma');
var { autenticar } = require('../middleware/auth');

// GET /distritos?provinciaId=1
router.get('/', autenticar, async function(req, res) {
  try {
    var where = {};
    if (req.query.provinciaId) where.provinciaId = parseInt(req.query.provinciaId);
    var distritos = await prisma.distrito.findMany({
      where: where,
      orderBy: { nome: 'asc' }
    });
    res.json(distritos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
