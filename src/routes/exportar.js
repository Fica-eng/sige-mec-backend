// ============================================
// SIGE — Rotas de Exportação (PDF + Excel)
// MEC Moçambique
// ============================================

const router  = require('express').Router();
const { autenticar } = require('../middleware/auth');
const prisma  = require('../config/prisma');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ============================================================
// UTILITÁRIOS
// ============================================================

// Cabeçalho oficial MEC em todos os PDFs
function cabecalhoPDF(doc, titulo, subtitulo) {
  // Faixa verde topo
  doc.rect(0, 0, doc.page.width, 8).fill('#009A44');

  doc.fillColor('#000000');

  // Logo / brasão textual
  doc.fontSize(22).font('Helvetica-Bold')
     .fillColor('#009A44')
     .text('★', 50, 30, { continued: false });

  doc.fontSize(14).font('Helvetica-Bold')
     .fillColor('#000000')
     .text('REPÚBLICA DE MOÇAMBIQUE', 80, 28);

  doc.fontSize(10).font('Helvetica')
     .fillColor('#333333')
     .text('Ministério da Educação e Cultura', 80, 46)
     .text('Sistema de Gestão Educacional — SIGE', 80, 60);

  // Linha separadora
  doc.moveTo(50, 85).lineTo(doc.page.width - 50, 85)
     .strokeColor('#009A44').lineWidth(2).stroke();

  // Título do documento
  doc.fontSize(16).font('Helvetica-Bold')
     .fillColor('#000000')
     .text(titulo, 50, 100, { align: 'center', width: doc.page.width - 100 });

  if (subtitulo) {
    doc.fontSize(11).font('Helvetica')
       .fillColor('#555555')
       .text(subtitulo, 50, 122, { align: 'center', width: doc.page.width - 100 });
  }

  // Data de emissão
  doc.fontSize(9).font('Helvetica')
     .fillColor('#777777')
     .text('Emitido em: ' + new Date().toLocaleDateString('pt-MZ', { day:'2-digit', month:'long', year:'numeric' }), 50, 142, { align: 'right', width: doc.page.width - 100 });

  doc.moveTo(50, 158).lineTo(doc.page.width - 50, 158)
     .strokeColor('#CCCCCC').lineWidth(0.5).stroke();

  return 175; // y de início do conteúdo
}

// Rodapé em todos os PDFs
function rodapePDF(doc) {
  var y = doc.page.height - 45;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y)
     .strokeColor('#009A44').lineWidth(1).stroke();
  doc.fontSize(8).font('Helvetica').fillColor('#777777')
     .text('SIGE — Sistema de Gestão Educacional | MEC Moçambique | Documento gerado automaticamente', 50, y + 6, { align: 'center', width: doc.page.width - 100 });
}

// Cabeçalho Excel com estilo MEC
function cabecalhoExcel(sheet, colunas, titulo) {
  // Linha 1: título
  sheet.mergeCells('A1:' + String.fromCharCode(64 + colunas.length) + '1');
  var t = sheet.getCell('A1');
  t.value = 'REPÚBLICA DE MOÇAMBIQUE — Ministério da Educação e Cultura';
  t.font  = { bold: true, size: 12, color: { argb: 'FF009A44' } };
  t.alignment = { horizontal: 'center' };

  // Linha 2: subtítulo
  sheet.mergeCells('A2:' + String.fromCharCode(64 + colunas.length) + '2');
  var s = sheet.getCell('A2');
  s.value = titulo + ' — Gerado em ' + new Date().toLocaleDateString('pt-MZ');
  s.font  = { bold: true, size: 11 };
  s.alignment = { horizontal: 'center' };

  // Linha 3: cabeçalhos das colunas
  colunas.forEach(function(col, i) {
    var cell = sheet.getCell(3, i + 1);
    cell.value = col.header;
    cell.font  = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF009A44' } };
    cell.alignment = { horizontal: 'center' };
    sheet.getColumn(i + 1).width = col.width || 20;
  });

  return 4; // linha de início de dados
}

// ============================================================
// EXCEL — Lista de Escolas
// ============================================================
router.get('/excel/escolas', autenticar, async (req, res) => {
  try {
    var escolas = await prisma.escola.findMany({
      where: { ativa: true },
      include: {
        provincia: { select: { nome: true } },
        distrito:  { select: { nome: true } },
        _count: { select: { alunos: true, professores: true } }
      },
      orderBy: [{ provincia: { nome: 'asc' } }, { nome: 'asc' }]
    });

    var wb = new ExcelJS.Workbook();
    wb.creator = 'SIGE MEC Moçambique';
    wb.created = new Date();

    var ws = wb.addWorksheet('Escolas', { pageSetup: { orientation: 'landscape' } });

    var colunas = [
      { header: 'Código',     width: 12 },
      { header: 'Nome da Escola', width: 35 },
      { header: 'Tipo',       width: 14 },
      { header: 'Província',  width: 18 },
      { header: 'Distrito',   width: 18 },
      { header: 'Localidade', width: 20 },
      { header: 'Telefone',   width: 15 },
      { header: 'Email',      width: 28 },
      { header: 'Alunos',     width: 10 },
      { header: 'Professores',width: 14 },
      { header: 'Estado',     width: 10 },
    ];

    var linhaInicio = cabecalhoExcel(ws, colunas, 'Lista de Escolas');

    escolas.forEach(function(e, i) {
      var row = ws.addRow([
        e.codigo,
        e.nome,
        e.tipo === 'PRIMARIA' ? 'EPC (Primária)' : e.tipo === 'BASICA' ? 'EB (Básica)' : 'Secundária',
        e.provincia ? e.provincia.nome : '',
        e.distrito  ? e.distrito.nome  : '',
        e.localidade || '',
        e.telefone   || '',
        e.email      || '',
        e._count ? e._count.alunos      : 0,
        e._count ? e._count.professores : 0,
        e.ativa ? 'Activa' : 'Inactiva',
      ]);
      // Linhas alternadas
      if (i % 2 === 0) {
        row.eachCell(function(cell) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FFF4' } };
        });
      }
    });

    // Totais
    ws.addRow([]);
    var tot = ws.addRow(['TOTAL:', escolas.length + ' escolas', '', '', '', '', '', '',
      escolas.reduce(function(s,e){ return s+(e._count?e._count.alunos:0); }, 0),
      escolas.reduce(function(s,e){ return s+(e._count?e._count.professores:0); }, 0), '']);
    tot.font = { bold: true };
    tot.getCell(1).fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFE066' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="SIGE_Escolas_' + new Date().getFullYear() + '.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// EXCEL — Lista de Alunos
// ============================================================
router.get('/excel/alunos', autenticar, async (req, res) => {
  try {
    var { escolaId, status } = req.query;
    var where = {};
    if (req.user.role === 'DIRETOR_ESCOLA') where.escolaId = req.user.escolaId;
    else if (escolaId) where.escolaId = parseInt(escolaId);
    if (status) where.status = status;

    var alunos = await prisma.aluno.findMany({
      where,
      include: {
        escola:    { select: { nome: true, tipo: true } },
        matriculas: { where: { anoLetivo: new Date().getFullYear() }, include: { turma: { select: { nome: true, classe: true } } } }
      },
      orderBy: [{ apelido: 'asc' }, { nome: 'asc' }]
    });

    var wb = new ExcelJS.Workbook();
    wb.creator = 'SIGE MEC Moçambique';

    var ws = wb.addWorksheet('Alunos');
    var colunas = [
      { header: 'Nº BI / Cédula', width: 18 },
      { header: 'Nome',           width: 20 },
      { header: 'Apelido',        width: 20 },
      { header: 'Data Nascimento',width: 16 },
      { header: 'Género',         width: 12 },
      { header: 'Escola',         width: 30 },
      { header: 'Turma',          width: 10 },
      { header: 'Classe',         width: 8  },
      { header: 'Estado',         width: 14 },
    ];
    cabecalhoExcel(ws, colunas, 'Lista de Alunos');

    alunos.forEach(function(a, i) {
      var mat   = a.matriculas && a.matriculas.length ? a.matriculas[0] : null;
      var row = ws.addRow([
        a.numeroBI || '',
        a.nome,
        a.apelido,
        a.dataNascimento ? new Date(a.dataNascimento).toLocaleDateString('pt-MZ') : '',
        a.genero === 'F' ? 'Feminino' : 'Masculino',
        a.escola ? a.escola.nome : '',
        mat ? mat.turma.nome   : '',
        mat ? mat.turma.classe : '',
        a.status,
      ]);
      if (i % 2 === 0) row.eachCell(function(c){ c.fill={ type:'pattern', pattern:'solid', fgColor:{ argb:'FFF0F4FF' } }; });
    });

    ws.addRow([]);
    var tot = ws.addRow(['TOTAL:', alunos.length + ' alunos']);
    tot.font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="SIGE_Alunos_' + new Date().getFullYear() + '.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// EXCEL — Lista de Professores
// ============================================================
router.get('/excel/professores', autenticar, async (req, res) => {
  try {
    var professores = await prisma.professor.findMany({
      where: { ativo: true },
      include: {
        escolas:    { include: { escola: { select: { nome: true } } }, where: { anoLetivo: new Date().getFullYear() } },
        disciplinas:{ include: { disciplina: { select: { nome: true } } } }
      },
      orderBy: [{ apelido: 'asc' }]
    });

    var wb = new ExcelJS.Workbook();
    var ws = wb.addWorksheet('Professores');
    var colunas = [
      { header: 'Nº Funcionário', width: 16 },
      { header: 'Nome',           width: 20 },
      { header: 'Apelido',        width: 20 },
      { header: 'Género',         width: 12 },
      { header: 'Data Nascimento',width: 16 },
      { header: 'Habilitação',    width: 16 },
      { header: 'Escola',         width: 30 },
      { header: 'Disciplinas',    width: 30 },
      { header: 'Email',          width: 28 },
      { header: 'Telefone',       width: 15 },
    ];
    cabecalhoExcel(ws, colunas, 'Lista de Professores');

    professores.forEach(function(p, i) {
      var escola = p.escolas && p.escolas.length ? p.escolas[0].escola.nome : '';
      var discs  = p.disciplinas.map(function(d){ return d.disciplina.nome; }).join(', ');
      var row = ws.addRow([
        p.numeroFuncionario,
        p.nome,
        p.apelido,
        p.genero === 'F' ? 'Feminino' : 'Masculino',
        p.dataNascimento ? new Date(p.dataNascimento).toLocaleDateString('pt-MZ') : '',
        p.habilitacao,
        escola,
        discs,
        p.email    || '',
        p.telefone || '',
      ]);
      if (i % 2 === 0) row.eachCell(function(c){ c.fill={ type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFF0F4' } }; });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="SIGE_Professores_' + new Date().getFullYear() + '.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// EXCEL — Notas por Turma
// ============================================================
router.get('/excel/notas', autenticar, async (req, res) => {
  try {
    var { turmaId, anoLetivo = new Date().getFullYear() } = req.query;
    var whereMatriculas = { anoLetivo: parseInt(anoLetivo) };
    if (turmaId) whereMatriculas.turmaId = parseInt(turmaId);

    var matriculas = await prisma.matricula.findMany({
      where: whereMatriculas,
      include: {
        aluno: {
          include: {
            notas: { where: { anoLetivo: parseInt(anoLetivo) }, include: { disciplina: { select: { nome: true, codigo: true } } } }
          }
        },
        turma: { select: { nome: true, classe: true, anoLetivo: true } }
      },
      orderBy: { aluno: { apelido: 'asc' } }
    });

    // Obter todas as disciplinas únicas
    var discMap = {};
    matriculas.forEach(function(m) {
      m.aluno.notas.forEach(function(n) {
        discMap[n.disciplinaId] = n.disciplina.nome;
      });
    });
    var disciplinas = Object.entries(discMap).map(function(e){ return { id: parseInt(e[0]), nome: e[1] }; });
    disciplinas.sort(function(a,b){ return a.nome.localeCompare(b.nome); });

    var wb = new ExcelJS.Workbook();
    var turmaInfo = matriculas.length ? matriculas[0].turma : null;
    var nomeSheet = turmaInfo ? 'Turma ' + turmaInfo.nome : 'Notas';
    var ws = wb.addWorksheet(nomeSheet);

    var colunas = [
      { header: 'Nº', width: 5 },
      { header: 'Nome Completo', width: 28 },
    ].concat(disciplinas.map(function(d){ return { header: d.nome, width: 14 }; }))
     .concat([
       { header: 'Média Geral', width: 14 },
       { header: 'Resultado',   width: 12 },
     ]);

    var titulo = 'Pauta de Notas' + (turmaInfo ? ' — Turma ' + turmaInfo.nome + ' (' + turmaInfo.anoLetivo + ')' : '');
    cabecalhoExcel(ws, colunas, titulo);

    matriculas.forEach(function(m, i) {
      var aluno = m.aluno;
      var notaMap = {};
      aluno.notas.forEach(function(n){ notaMap[n.disciplinaId] = n.valor; });

      var notasValores = disciplinas.map(function(d){ return notaMap[d.id] !== undefined ? notaMap[d.id] : null; });
      var notasComValor = notasValores.filter(function(v){ return v !== null; });
      var media = notasComValor.length ? (notasComValor.reduce(function(s,v){ return s+v; }, 0) / notasComValor.length) : null;

      var rowData = [i + 1, aluno.nome + ' ' + aluno.apelido]
        .concat(notasValores)
        .concat([
          media !== null ? Math.round(media * 10) / 10 : '',
          media !== null ? (media >= 10 ? 'APROVADO' : 'REPROVADO') : '',
        ]);

      var row = ws.addRow(rowData);

      // Colorir notas negativas
      notasValores.forEach(function(v, j) {
        if (v !== null && v < 10) {
          var cell = row.getCell(3 + j);
          cell.font = { color: { argb: 'FFD21034' }, bold: true };
        }
      });

      // Colorir resultado
      var resCell = row.getCell(rowData.length);
      if (media !== null) {
        resCell.font  = { bold: true, color: { argb: media >= 10 ? 'FF009A44' : 'FFD21034' } };
      }

      if (i % 2 === 0) {
        row.eachCell({ includeEmpty: true }, function(cell, colNum) {
          if (!cell.font || !cell.font.color || cell.font.color.argb === 'FF000000') {
            cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF8F8F8' } };
          }
        });
      }
    });

    // Linha de médias da turma
    ws.addRow([]);
    if (disciplinas.length) {
      var mediasCols = ['', 'MÉDIA DA TURMA'].concat(disciplinas.map(function(d) {
        var vals = matriculas.map(function(m) {
          var n = m.aluno.notas.find(function(n){ return n.disciplinaId === d.id; });
          return n ? n.valor : null;
        }).filter(function(v){ return v !== null; });
        return vals.length ? Math.round((vals.reduce(function(s,v){return s+v;},0)/vals.length)*10)/10 : '';
      })).concat(['','']);
      var medRow = ws.addRow(mediasCols);
      medRow.font = { bold: true };
      medRow.eachCell(function(c){ c.fill={ type:'pattern', pattern:'solid', fgColor:{ argb:'FFFCE4EC' } }; });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="SIGE_Notas_' + anoLetivo + '.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// PDF — Boletim Individual do Aluno
// ============================================================
router.get('/pdf/boletim/:alunoId', autenticar, async (req, res) => {
  try {
    var { anoLetivo = new Date().getFullYear() } = req.query;
    var aluno = await prisma.aluno.findUnique({
      where: { id: parseInt(req.params.alunoId) },
      include: {
        escola: { include: { provincia: true } },
        matriculas: {
          where: { anoLetivo: parseInt(anoLetivo) },
          include: { turma: { select: { nome: true, classe: true, turno: true } } }
        },
        notas: {
          where: { anoLetivo: parseInt(anoLetivo) },
          include: { disciplina: { select: { nome: true } } },
          orderBy: [{ disciplinaId: 'asc' }, { trimestre: 'asc' }]
        }
      }
    });

    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado.' });

    var doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Boletim_' + aluno.nome + '_' + aluno.apelido + '_' + anoLetivo + '.pdf"');
    doc.pipe(res);

    var y = cabecalhoPDF(doc, 'BOLETIM ESCOLAR', 'Ano Lectivo ' + anoLetivo);

    // Dados do aluno
    doc.roundedRect(50, y, doc.page.width - 100, 80, 4)
       .fillAndStroke('#F0FFF4', '#009A44');

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000')
       .text('DADOS DO ALUNO', 65, y + 8);

    var mat = aluno.matriculas && aluno.matriculas.length ? aluno.matriculas[0] : null;

    doc.fontSize(9).font('Helvetica').fillColor('#333333');
    doc.text('Nome Completo:',  65,  y + 24).font('Helvetica-Bold').text(aluno.nome + ' ' + aluno.apelido, 170, y + 24);
    doc.font('Helvetica')
       .text('Nº BI / Cédula:', 65,  y + 37).font('Helvetica-Bold').text(aluno.numeroBI || 'N/D', 170, y + 37);
    doc.font('Helvetica')
       .text('Escola:',         65,  y + 50).font('Helvetica-Bold').text(aluno.escola ? aluno.escola.nome : 'N/D', 170, y + 50);
    doc.font('Helvetica')
       .text('Turma:',         370,  y + 24).font('Helvetica-Bold').text(mat ? mat.turma.nome + ' (' + mat.turma.turno + ')' : 'N/D', 420, y + 24);
    doc.font('Helvetica')
       .text('Género:',        370,  y + 37).font('Helvetica-Bold').text(aluno.genero === 'F' ? 'Feminino' : 'Masculino', 420, y + 37);
    doc.font('Helvetica')
       .text('Nascimento:',    370,  y + 50).font('Helvetica-Bold').text(aluno.dataNascimento ? new Date(aluno.dataNascimento).toLocaleDateString('pt-MZ') : 'N/D', 420, y + 50);

    y += 95;

    // Tabela de notas
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000')
       .text('PAUTA DE AVALIAÇÕES', 50, y);
    y += 16;

    // Cabeçalho da tabela
    var colX   = [50, 210, 280, 350, 420, 490];
    var colW   = [160, 70, 70, 70, 70, 60];
    var heads  = ['Disciplina', '1º Trim.', '2º Trim.', '3º Trim.', 'Média', 'Result.'];

    // Fundo cabeçalho
    doc.rect(50, y, doc.page.width - 100, 18).fill('#009A44');
    heads.forEach(function(h, i) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF')
         .text(h, colX[i] + 2, y + 5, { width: colW[i] - 4, align: i === 0 ? 'left' : 'center' });
    });
    y += 18;

    // Agrupar notas por disciplina
    var discMap = {};
    aluno.notas.forEach(function(n) {
      var key = n.disciplinaId;
      if (!discMap[key]) discMap[key] = { nome: n.disciplina.nome, t1: null, t2: null, t3: null };
      if (n.trimestre === 1) discMap[key].t1 = n.valor;
      if (n.trimestre === 2) discMap[key].t2 = n.valor;
      if (n.trimestre === 3) discMap[key].t3 = n.valor;
    });

    var disciplinas = Object.values(discMap).sort(function(a,b){ return a.nome.localeCompare(b.nome); });
    var somaMedias  = 0;
    var countDiscs  = 0;

    disciplinas.forEach(function(d, i) {
      var vals = [d.t1, d.t2, d.t3].filter(function(v){ return v !== null; });
      var media = vals.length ? vals.reduce(function(s,v){return s+v;},0) / vals.length : null;
      if (media !== null) { somaMedias += media; countDiscs++; }

      var bg = i % 2 === 0 ? '#FFFFFF' : '#F5F5F5';
      doc.rect(50, y, doc.page.width - 100, 16).fill(bg);

      doc.fontSize(8).font('Helvetica').fillColor('#000000')
         .text(d.nome, colX[0] + 2, y + 4, { width: colW[0] - 4 });

      [d.t1, d.t2, d.t3].forEach(function(v, j) {
        var txt = v !== null ? v.toFixed(1) : '—';
        var cor = (v !== null && v < 10) ? '#D21034' : '#000000';
        doc.fontSize(8).font(v !== null && v < 10 ? 'Helvetica-Bold' : 'Helvetica')
           .fillColor(cor)
           .text(txt, colX[j + 1] + 2, y + 4, { width: colW[j + 1] - 4, align: 'center' });
      });

      if (media !== null) {
        doc.fontSize(8).font('Helvetica-Bold')
           .fillColor(media >= 10 ? '#009A44' : '#D21034')
           .text(media.toFixed(1), colX[4] + 2, y + 4, { width: colW[4] - 4, align: 'center' });
        doc.fontSize(7).font('Helvetica-Bold')
           .fillColor(media >= 10 ? '#009A44' : '#D21034')
           .text(media >= 10 ? 'APROV.' : 'REPROV.', colX[5] + 2, y + 5, { width: colW[5] - 4, align: 'center' });
      }

      // Linha separadora
      doc.moveTo(50, y + 16).lineTo(doc.page.width - 50, y + 16)
         .strokeColor('#EEEEEE').lineWidth(0.3).stroke();

      y += 16;
    });

    // Linha média geral
    var mediaGeral = countDiscs ? somaMedias / countDiscs : null;
    doc.rect(50, y, doc.page.width - 100, 20).fill('#1a2235');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF')
       .text('MÉDIA GERAL:', colX[0] + 2, y + 6, { width: colW[0] - 4 });
    if (mediaGeral !== null) {
      doc.fillColor(mediaGeral >= 10 ? '#4AE88A' : '#FF6B6B')
         .text(mediaGeral.toFixed(1), colX[4] + 2, y + 6, { width: colW[4] - 4, align: 'center' });
      doc.fontSize(8).font('Helvetica-Bold')
         .fillColor(mediaGeral >= 10 ? '#4AE88A' : '#FF6B6B')
         .text(mediaGeral >= 10 ? 'APROVADO' : 'REPROVADO', colX[5] - 10, y + 7, { width: 70, align: 'center' });
    }
    y += 30;

    // Assinaturas
    if (y + 80 > doc.page.height - 80) { doc.addPage(); y = 60; }

    doc.fontSize(9).font('Helvetica').fillColor('#333333');
    var sigY = y + 20;
    doc.moveTo(60,  sigY).lineTo(200, sigY).strokeColor('#000').lineWidth(0.5).stroke();
    doc.moveTo(220, sigY).lineTo(360, sigY).stroke();
    doc.moveTo(380, sigY).lineTo(520, sigY).stroke();
    doc.fontSize(8)
       .text('Director(a) de Turma',   60,  sigY + 4, { width: 140, align: 'center' })
       .text('Director(a) da Escola',  220, sigY + 4, { width: 140, align: 'center' })
       .text('Encarregado de Educação',380, sigY + 4, { width: 140, align: 'center' });

    rodapePDF(doc);
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PDF — Relatório Estatístico MEC
// ============================================================
router.get('/pdf/relatorio-mec', autenticar, async (req, res) => {
  try {
    var { anoLetivo = new Date().getFullYear() } = req.query;

    var [totalEscolas, totalAlunos, totalProfs, evadidos, porTipo, porProv] = await Promise.all([
      prisma.escola.count({ where: { ativa: true } }),
      prisma.aluno.count(),
      prisma.professorEscola.count({ where: { anoLetivo: parseInt(anoLetivo), ativo: true } }),
      prisma.aluno.count({ where: { status: 'EVADIDO' } }),
      prisma.escola.groupBy({ by: ['tipo'], where: { ativa: true }, _count: { tipo: true } }),
      prisma.provincia.findMany({ include: { escolas: { include: { _count: { select: { alunos: true, professores: true } } } } } })
    ]);

    var doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="SIGE_Relatorio_MEC_' + anoLetivo + '.pdf"');
    doc.pipe(res);

    var y = cabecalhoPDF(doc, 'RELATÓRIO ESTATÍSTICO DO SISTEMA EDUCATIVO', 'Ano Lectivo ' + anoLetivo + ' — República de Moçambique');

    // KPIs em caixas
    var kpis = [
      { label: 'Total de Escolas',   valor: totalEscolas.toLocaleString('pt-MZ'),  cor: '#009A44' },
      { label: 'Total de Alunos',    valor: totalAlunos.toLocaleString('pt-MZ'),   cor: '#4A90D9' },
      { label: 'Total Professores',  valor: totalProfs.toLocaleString('pt-MZ'),    cor: '#FCB017' },
      { label: 'Alunos Evadidos',    valor: evadidos.toLocaleString('pt-MZ'),      cor: '#D21034' },
    ];

    var kpiX = 50, kpiW = 115, kpiH = 55;
    kpis.forEach(function(k, i) {
      var kx = kpiX + i * (kpiW + 6);
      doc.roundedRect(kx, y, kpiW, kpiH, 4).fillAndStroke('#FAFAFA', k.cor);
      doc.fontSize(18).font('Helvetica-Bold').fillColor(k.cor)
         .text(k.valor, kx + 5, y + 10, { width: kpiW - 10, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('#555555')
         .text(k.label, kx + 5, y + 36, { width: kpiW - 10, align: 'center' });
    });
    y += kpiH + 20;

    // Tabela por tipo de escola
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
       .text('Distribuição por Tipo de Escola', 50, y);
    y += 15;

    var tipoNomes = { PRIMARIA: 'EPC (Primária)', BASICA: 'EB (Básica)', SECUNDARIA: 'Secundária' };
    doc.rect(50, y, 495, 18).fill('#009A44');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF')
       .text('Tipo de Escola', 55, y + 5, { width: 200 })
       .text('Quantidade', 260, y + 5, { width: 80, align: 'center' })
       .text('% do Total', 345, y + 5, { width: 80, align: 'center' });
    y += 18;

    porTipo.forEach(function(t, i) {
      var pct = totalEscolas ? ((t._count.tipo / totalEscolas) * 100).toFixed(1) : '0.0';
      doc.rect(50, y, 495, 16).fill(i % 2 === 0 ? '#FFFFFF' : '#F5F5F5');
      doc.fontSize(8).font('Helvetica').fillColor('#000000')
         .text(tipoNomes[t.tipo] || t.tipo, 55, y + 4, { width: 200 })
         .text(t._count.tipo.toString(), 260, y + 4, { width: 80, align: 'center' })
         .text(pct + '%', 345, y + 4, { width: 80, align: 'center' });
      y += 16;
    });
    y += 15;

    // Tabela por província
    if (y + 20 > doc.page.height - 100) { doc.addPage(); y = 60; }

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
       .text('Distribuição por Província', 50, y);
    y += 15;

    doc.rect(50, y, 495, 18).fill('#1a2235');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF')
       .text('Província',    55,  y + 5, { width: 120 })
       .text('Escolas',     180, y + 5, { width: 70, align: 'center' })
       .text('Alunos',      255, y + 5, { width: 80, align: 'center' })
       .text('Professores', 340, y + 5, { width: 80, align: 'center' })
       .text('Ratio P/A',   425, y + 5, { width: 80, align: 'center' });
    y += 18;

    porProv.sort(function(a,b){ return b.escolas.reduce(function(s,e){return s+e._count.alunos;},0) - a.escolas.reduce(function(s,e){return s+e._count.alunos;},0); })
    .forEach(function(p, i) {
      if (y + 16 > doc.page.height - 80) { rodapePDF(doc); doc.addPage(); y = 60; }
      var nEscolas = p.escolas.length;
      var nAlunos  = p.escolas.reduce(function(s,e){return s+e._count.alunos;},0);
      var nProfs   = p.escolas.reduce(function(s,e){return s+e._count.professores;},0);
      var ratio    = nProfs ? '1:' + Math.round(nAlunos/nProfs) : 'N/D';
      doc.rect(50, y, 495, 16).fill(i % 2 === 0 ? '#FFFFFF' : '#F5F5F5');
      doc.fontSize(8).font('Helvetica').fillColor('#000000')
         .text(p.nome,                55,  y + 4, { width: 120 })
         .text(nEscolas.toString(),  180, y + 4, { width: 70, align: 'center' })
         .text(nAlunos.toLocaleString('pt-MZ'), 255, y + 4, { width: 80, align: 'center' })
         .text(nProfs.toLocaleString('pt-MZ'),  340, y + 4, { width: 80, align: 'center' })
         .text(ratio,                425, y + 4, { width: 80, align: 'center' });
      y += 16;
    });

    rodapePDF(doc);
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
