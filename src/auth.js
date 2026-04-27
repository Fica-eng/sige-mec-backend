const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');

router.post('/login',
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Palavra-passe obrigatória'),
  ctrl.login
);
router.post('/refresh', ctrl.refresh);
router.post('/logout', autenticar, ctrl.logout);
router.get('/me', autenticar, ctrl.me);
router.patch('/password', autenticar,
  body('passwordAtual').notEmpty(),
  body('passwordNova').isLength({ min: 8 }),
  ctrl.alterarPassword
);

module.exports = router;
