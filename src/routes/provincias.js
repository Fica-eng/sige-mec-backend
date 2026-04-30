var router = require('express').Router();
var prisma = require('../config/prisma');
var { autenticar } = require('../middleware/auth');

router.get('/', autenticar, async function(req, res) {
  try {
    var provincias = await prisma.provincia.findMany({
      orderBy: { nome: 'asc' }
    });
    res.json(provincias);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
