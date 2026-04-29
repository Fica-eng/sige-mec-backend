const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Todos os distritos de Moçambique por província
const PROVINCIAS_DISTRITOS = [
  {
    nome: 'Maputo Cidade', codigo: 'MC',
    distritos: ['KaMpfumu','KaMaxakeni','KaMavota','KaMubukwana','KaNyaka','KaTembe']
  },
  {
    nome: 'Maputo Província', codigo: 'MP',
    distritos: ['Boane','Magude','Manhiça','Marracuene','Matutuíne','Moamba','Namaacha','Matola']
  },
  {
    nome: 'Gaza', codigo: 'GZ',
    distritos: ['Bilene','Chibuto','Chicualacuala','Chigubo','Chokwé','Chongoene','Guijá','Limpopo','Mabalane','Mandlakazi','Massangena','Massingir','Xai-Xai']
  },
  {
    nome: 'Inhambane', codigo: 'IH',
    distritos: ['Funhalouro','Govuro','Homoíne','Inharrime','Inhassoro','Inhambane','Jangamo','Mabote','Massinga','Maxixe','Morrumbene','Panda','Vilankulo','Zavala']
  },
  {
    nome: 'Sofala', codigo: 'SF',
    distritos: ['Beira','Búzi','Chibabava','Chimanimani','Dondo','Gorongosa','Machanga','Maringué','Muanza','Nhamatanda']
  },
  {
    nome: 'Manica', codigo: 'MN',
    distritos: ['Báruè','Chimoio','Gondola','Guro','Machaze','Macossa','Mossurize','Sussundenga','Tambara','Vanduzi']
  },
  {
    nome: 'Tete', codigo: 'TE',
    distritos: ['Angónia','Cahora-Bassa','Changara','Chifunde','Chiuta','Dôa','Macanga','Marávia','Moatize','Mutarara','Tete','Tsangano','Zumbo']
  },
  {
    nome: 'Zambézia', codigo: 'ZB',
    distritos: ['Alto Molócuè','Chinde','Gilé','Guruè','Ile','Inhassunge','Luabo','Lugela','Maganja da Costa','Milange','Mocuba','Mopeia','Morrumbala','Namacurra','Namarrói','Nicoadala','Pebane','Quelimane']
  },
  {
    nome: 'Nampula', codigo: 'NP',
    distritos: ['Angoche','Eráti','Lalaua','Larde','Liúpo','Malema','Meconta','Mecubúri','Memba','Mogincual','Mogovolas','Moma','Monapo','Mossuril','Murrupula','Nacala','Nacala-a-Velha','Nacarôa','Nampula','Rapale','Ribáuè']
  },
  {
    nome: 'Niassa', codigo: 'NS',
    distritos: ['Chimbunila','Cuamba','Lago','Lichinga','Majune','Mandimba','Marrupa','Maúa','Mavago','Mecanhelas','Mecula','Metarica','Muembe','Ngauma','Nipepe','Sanga']
  },
  {
    nome: 'Cabo Delgado', codigo: 'CD',
    distritos: ['Ancuabe','Balama','Chiúre','Ibo','Macomia','Mecúfi','Meluco','Metuge','Mocímboa da Praia','Montepuez','Mueda','Muidumbe','Namuno','Nangade','Palma','Pemba','Quissanga']
  },
];

async function main() {
  console.log('🌱 A iniciar seed completo...\n');

  // ======= PROVÍNCIAS E DISTRITOS =======
  console.log('📍 A criar províncias e distritos...');
  var provMap = {};

  for (var pd of PROVINCIAS_DISTRITOS) {
    var prov = await prisma.provincia.upsert({
      where: { codigo: pd.codigo },
      update: { nome: pd.nome },
      create: { nome: pd.nome, codigo: pd.codigo }
    });
    provMap[pd.codigo] = prov;

    for (var dnome of pd.distritos) {
      await prisma.distrito.upsert({
        where: { nome_provinciaId: { nome: dnome, provinciaId: prov.id } },
        update: {},
        create: { nome: dnome, provinciaId: prov.id }
      });
    }
    console.log('   ✅ ' + pd.nome + ' (' + pd.distritos.length + ' distritos)');
  }

  var mc = provMap['MC'];
  var mp = provMap['MP'];
  var gz = provMap['GZ'];
  var ih = provMap['IH'];
  var sf = provMap['SF'];
  var mn = provMap['MN'];
  var te = provMap['TE'];
  var zb = provMap['ZB'];
  var np = provMap['NP'];
  var ns = provMap['NS'];
  var cd = provMap['CD'];

  // Helper para buscar distrito por nome e província
  async function getDist(nome, provId) {
    return prisma.distrito.findFirst({ where: { nome: nome, provinciaId: provId } });
  }

  // ======= DISCIPLINAS =======
  console.log('\n📚 A criar disciplinas...');
  var disciplinas = await Promise.all([
    prisma.disciplina.upsert({ where: { codigo: 'PORT' }, update: {}, create: { nome: 'Português',                  codigo: 'PORT', nivel: 'EP1'  } }),
    prisma.disciplina.upsert({ where: { codigo: 'MAT'  }, update: {}, create: { nome: 'Matemática',                 codigo: 'MAT',  nivel: 'EP1'  } }),
    prisma.disciplina.upsert({ where: { codigo: 'ING'  }, update: {}, create: { nome: 'Inglês',                     codigo: 'ING',  nivel: 'ESG1' } }),
    prisma.disciplina.upsert({ where: { codigo: 'HIS'  }, update: {}, create: { nome: 'História',                   codigo: 'HIS',  nivel: 'ESG1' } }),
    prisma.disciplina.upsert({ where: { codigo: 'GEO'  }, update: {}, create: { nome: 'Geografia',                  codigo: 'GEO',  nivel: 'ESG1' } }),
    prisma.disciplina.upsert({ where: { codigo: 'BIO'  }, update: {}, create: { nome: 'Biologia',                   codigo: 'BIO',  nivel: 'ESG1' } }),
    prisma.disciplina.upsert({ where: { codigo: 'FIS'  }, update: {}, create: { nome: 'Física',                     codigo: 'FIS',  nivel: 'ESG2' } }),
    prisma.disciplina.upsert({ where: { codigo: 'QUI'  }, update: {}, create: { nome: 'Química',                    codigo: 'QUI',  nivel: 'ESG2' } }),
    prisma.disciplina.upsert({ where: { codigo: 'EDF'  }, update: {}, create: { nome: 'Educação Física',            codigo: 'EDF',  nivel: 'EP1'  } }),
    prisma.disciplina.upsert({ where: { codigo: 'TIC'  }, update: {}, create: { nome: 'Tecnologias de Informação',  codigo: 'TIC',  nivel: 'ESG1' } }),
  ]);
  console.log('   ✅ ' + disciplinas.length + ' disciplinas');

  // ======= ESCOLAS =======
  console.log('\n🏫 A criar escolas de amostra...');
  var dKampf    = await getDist('KaMpfumu', mc.id);
  var dKamax    = await getDist('KaMaxakeni', mc.id);
  var dXaixai   = await getDist('Xai-Xai', gz.id);
  var dInh      = await getDist('Inhambane', ih.id);
  var dBeira    = await getDist('Beira', sf.id);
  var dChimoio  = await getDist('Chimoio', mn.id);
  var dTete     = await getDist('Tete', te.id);
  var dQuel     = await getDist('Quelimane', zb.id);
  var dNamp     = await getDist('Nampula', np.id);
  var dLich     = await getDist('Lichinga', ns.id);
  var dPemba    = await getDist('Pemba', cd.id);

  var escolasData = [
    { codigo:'MC-001', nome:'EPC 25 de Setembro',           tipo:'PRIMARIA',   provinciaId:mc.id, distritoId:dKampf.id   },
    { codigo:'MC-002', nome:'Escola Secundária Josina Machel',tipo:'SECUNDARIA', provinciaId:mc.id, distritoId:dKamax.id  },
    { codigo:'MC-003', nome:'EB Acordos de Lusaka',          tipo:'BASICA',     provinciaId:mc.id, distritoId:dKampf.id   },
    { codigo:'GZ-001', nome:'EB Eduardo Mondlane',           tipo:'BASICA',     provinciaId:gz.id, distritoId:dXaixai.id  },
    { codigo:'NP-001', nome:'EPC Samora Machel',             tipo:'PRIMARIA',   provinciaId:np.id, distritoId:dNamp.id    },
    { codigo:'NP-002', nome:'Escola Secundária de Nacala',   tipo:'SECUNDARIA', provinciaId:np.id, distritoId:dNamp.id    },
    { codigo:'ZB-001', nome:'EB Frelimo',                    tipo:'BASICA',     provinciaId:zb.id, distritoId:dQuel.id    },
    { codigo:'SF-001', nome:'Escola Secundária da Beira',    tipo:'SECUNDARIA', provinciaId:sf.id, distritoId:dBeira.id   },
    { codigo:'TE-001', nome:'EB Kwame Nkrumah',              tipo:'BASICA',     provinciaId:te.id, distritoId:dTete.id    },
    { codigo:'MN-001', nome:'Escola Secundária de Chimoio',  tipo:'SECUNDARIA', provinciaId:mn.id, distritoId:dChimoio.id },
    { codigo:'IH-001', nome:'EPC Agosto de 1975',            tipo:'PRIMARIA',   provinciaId:ih.id, distritoId:dInh.id     },
    { codigo:'NS-001', nome:'EB Julius Nyerere',             tipo:'BASICA',     provinciaId:ns.id, distritoId:dLich.id    },
    { codigo:'CD-001', nome:'Escola Secundária de Pemba',    tipo:'SECUNDARIA', provinciaId:cd.id, distritoId:dPemba.id   },
  ];

  var escolas = [];
  for (var e of escolasData) {
    var escola = await prisma.escola.upsert({ where: { codigo: e.codigo }, update: {}, create: e });
    escolas.push(escola);
  }
  console.log('   ✅ ' + escolas.length + ' escolas');

  var [epc25, esJosina, ebAcordos, ebMondlane, epcSamora, esNacala, ebFrelimo, esBeira, ebKwame, esChimoio, epcAgosto, ebJulius, esPemba] = escolas;

  // ======= UTILIZADORES =======
  console.log('\n👤 A criar utilizadores...');
  function hash(p) { return bcrypt.hashSync(p, 10); }

  var utilizadores = [
    { email:'admin@mec.gov.mz',          passwordHash:hash('Admin@2024!'), role:'ADMIN_MEC',           nome:'Administrador MEC' },
    { email:'coord.norte@mec.gov.mz',    passwordHash:hash('Coord@2024!'), role:'COORDENADOR_REGIONAL', nome:'Coordenador Norte',  provinciaId:np.id },
    { email:'coord.centro@mec.gov.mz',   passwordHash:hash('Coord@2024!'), role:'COORDENADOR_REGIONAL', nome:'Coordenador Centro', provinciaId:sf.id },
    { email:'coord.sul@mec.gov.mz',      passwordHash:hash('Coord@2024!'), role:'COORDENADOR_REGIONAL', nome:'Coordenador Sul',    provinciaId:mc.id },
    { email:'diretor.epc25@mec.gov.mz',  passwordHash:hash('Dir@2024!'),   role:'DIRETOR_ESCOLA',       nome:'Diretor EPC 25 Setembro',   escolaId:epc25.id    },
    { email:'diretor.josina@mec.gov.mz', passwordHash:hash('Dir@2024!'),   role:'DIRETOR_ESCOLA',       nome:'Diretor ES Josina Machel',  escolaId:esJosina.id },
  ];

  for (var u of utilizadores) {
    await prisma.utilizador.upsert({ where: { email: u.email }, update: {}, create: u });
  }
  console.log('   ✅ ' + utilizadores.length + ' utilizadores');

  // ======= PROFESSORES =======
  console.log('\n👩‍🏫 A criar professores...');
  var profsData = [
    { numeroFuncionario:'FUNC-001', nome:'António',  apelido:'Mabunda',  genero:'M', dataNascimento:new Date('1980-03-15'), habilitacao:'LICENCIATURA', escolaId:esJosina.id  },
    { numeroFuncionario:'FUNC-002', nome:'Celeste',  apelido:'Chaúque',  genero:'F', dataNascimento:new Date('1985-07-22'), habilitacao:'BACHAREL',     escolaId:epc25.id     },
    { numeroFuncionario:'FUNC-003', nome:'David',    apelido:'Cumbe',    genero:'M', dataNascimento:new Date('1978-11-08'), habilitacao:'LICENCIATURA', escolaId:esBeira.id   },
    { numeroFuncionario:'FUNC-004', nome:'Helena',   apelido:'Uaiene',   genero:'F', dataNascimento:new Date('1975-04-30'), habilitacao:'MESTRADO',     escolaId:epcSamora.id },
    { numeroFuncionario:'FUNC-005', nome:'Lurdes',   apelido:'Nguenha',  genero:'F', dataNascimento:new Date('1983-02-18'), habilitacao:'LICENCIATURA', escolaId:esChimoio.id },
  ];

  for (var p of profsData) {
    var { escolaId, ...dadosProf } = p;
    var prof = await prisma.professor.upsert({ where: { numeroFuncionario: p.numeroFuncionario }, update: {}, create: dadosProf });
    await prisma.professorEscola.upsert({
      where: { professorId_escolaId_anoLetivo: { professorId: prof.id, escolaId: escolaId, anoLetivo: 2024 } },
      update: {},
      create: { professorId: prof.id, escolaId: escolaId, anoLetivo: 2024 }
    });
  }
  console.log('   ✅ ' + profsData.length + ' professores');

  // ======= ALUNOS =======
  console.log('\n👨‍🎓 A criar alunos...');
  var alunosData = [
    { nome:'Ana Beatriz',  apelido:'Machava',   dataNascimento:new Date('2008-04-12'), genero:'F', escolaId:epc25.id,    bi:'BI000000001MZ' },
    { nome:'Carlos',       apelido:'Nhantumbo', dataNascimento:new Date('2007-08-23'), genero:'M', escolaId:ebMondlane.id,bi:'BI000000002MZ' },
    { nome:'Fátima',       apelido:'Sitoe',     dataNascimento:new Date('2006-01-15'), genero:'F', escolaId:esJosina.id,  bi:'BI000000003MZ' },
    { nome:'João',         apelido:'Munguambe', dataNascimento:new Date('2010-06-30'), genero:'M', escolaId:ebMondlane.id,bi:'BI000000004MZ' },
    { nome:'Rosa',         apelido:'Chissano',  dataNascimento:new Date('2009-09-05'), genero:'F', escolaId:ebFrelimo.id, bi:'BI000000005MZ' },
    { nome:'Pedro',        apelido:'Cossa',     dataNascimento:new Date('2007-03-17'), genero:'M', escolaId:esBeira.id,   bi:'BI000000006MZ' },
    { nome:'Lurdes',       apelido:'Mondlane',  dataNascimento:new Date('2004-07-14'), genero:'F', escolaId:esChimoio.id, bi:'BI000000007MZ' },
    { nome:'Eugénio',      apelido:'Tembe',     dataNascimento:new Date('2011-02-28'), genero:'M', escolaId:epcAgosto.id, bi:'BI000000008MZ' },
  ];

  for (var a of alunosData) {
    var { bi, ...dadosAluno } = a;
    await prisma.aluno.upsert({ where: { numeroBI: bi }, update: {}, create: { ...dadosAluno, numeroBI: bi } });
  }
  console.log('   ✅ ' + alunosData.length + ' alunos');

  console.log('\n✅ Seed completo concluído!\n');
  console.log('📋 Credenciais de acesso:');
  console.log('   admin@mec.gov.mz           → Admin@2024!');
  console.log('   coord.norte@mec.gov.mz     → Coord@2024!');
  console.log('   diretor.epc25@mec.gov.mz   → Dir@2024!');
  console.log('\n📍 Províncias e distritos inseridos:');
  PROVINCIAS_DISTRITOS.forEach(function(pd) {
    console.log('   ' + pd.nome + ': ' + pd.distritos.length + ' distritos');
  });
}

main()
  .catch(function(e) { console.warn('⚠ Seed ignorado:', e.message); })
  .finally(function() { prisma.$disconnect(); });
