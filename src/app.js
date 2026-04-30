var express     = require('express');
var cors        = require('cors');
var helmet      = require('helmet');
var compression = require('compression');
var morgan      = require('morgan');
var rateLimit   = require('express-rate-limit');
var logger      = require('./config/logger');

var app = express();

app.use(helmet());
app.use(compression());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

var limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiados pedidos. Tente novamente em 15 minutos.' },
});
app.use('/api/', limiter);

var loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas tentativas. Tente novamente em 15 minutos.' },
});
app.use('/api/v1/auth/login', loginLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: {
    write: function(m) { logger.info(m.trim()); }
  }
}));

// Rotas
var v1 = express.Router();
v1.use('/auth',          require('./routes/auth'));
v1.use('/provincias',    require('./routes/provincias'));
v1.use('/distritos',     require('./routes/distritos'));
v1.use('/escolas',       require('./routes/escolas'));
v1.use('/alunos',        require('./routes/alunos'));
v1.use('/professores',   require('./routes/professores'));
v1.use('/turmas',        require('./routes/turmas'));
v1.use('/notas',         require('./routes/notas'));
v1.use('/matriculas',    require('./routes/matriculas'));
v1.use('/estatisticas',  require('./routes/estatisticas'));
v1.use('/exportar',      require('./routes/exportar'));
v1.use('/relatorios',    require('./routes/relatorios'));
app.use('/api/v1', v1);

// Health check
app.get('/health', function(req, res) {
  res.json({ status: 'ok', sistema: 'SIGE MEC Mocambique' });
});

// Raiz
app.get('/', function(req, res) {
  res.json({
    sistema: 'SIGE - Sistema de Gestao Educacional',
    ministerio: 'Ministerio da Educacao e Cultura de Mocambique',
    versao: '1.0.0',
    api: '/api/v1',
  });
});

// 404
app.use(function(req, res) {
  res.status(404).json({ error: 'Endpoint nao encontrado' });
});

// Erro global
app.use(function(err, req, res, next) {
  logger.error(err.stack);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Erro interno do servidor',
  });
});

module.exports = app;
