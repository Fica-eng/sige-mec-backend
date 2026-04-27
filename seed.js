const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 A iniciar seed...');

  // PROVÍNCIAS
  const provs = await Promise.all([
    prisma.provincia.upsert({ where: { codigo: 'MC' }, update: {}, create: { nome: 'Maputo Cidade',    codigo: 'MC' } }),
    prisma.provincia.upsert({ where: { codigo: 'MP' }, update: {}, create: { nome: 'Maputo Província', codigo: 'MP' } }),
    prisma.provincia.upsert({ where: { codigo: 'GZ' }, update: {}, create: { nome: 'Gaza',             codigo: 'GZ' } }),
    prisma.provincia.upsert({ where: { codigo: 'IH' }, update: {}, create: { nome: 'Inhambane',        codigo: 'IH' } }),
    prisma.provincia.upsert({ where: { codigo: 'SF' }, update: {}, create: { nome: 'Sofala',           codigo: 'SF' } }),
    prisma.provincia.upsert({ where: { codigo: 'MN' }, update: {}, create: { nome: 'Manica',           codigo: 'MN' } }),
    prisma.provincia.upsert({ where: { codigo: 'TE' }, update: {}, create: { nome: 'Tete',             codigo: 'TE' } }),
    prisma.provincia.upsert({ where: { codigo: 'ZB' }, update: {}, create: { nome: 'Zambézia',         codigo: 'ZB' } }),
    prisma.provincia.upsert({ where: { codigo: 'NP' }, update: {}, create: { nome: 'Nampula',          codigo: 'NP' } }),
    prisma.provincia.upsert({ where: { codigo: 'NS' }, update: {}, create: { nome: 'Niassa',           codigo: 'NS' } }),
    prisma.provincia.upsert({ where: { codigo: 'CD' }, update: {}, create: { nome: 'Cabo Delgado',     codigo: 'CD' } }),
  ]);
  console.log('✅ ' + provs.length + ' províncias');
  const [mc, mp, gz, ih, sf, mn, te, zb, np, ns, cd] = provs;

  // DISTRITOS
  const dists = await Promise.all([
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'KaMpfumu',   provinciaId: mc.id } }, update: {}, create: { nome: 'KaMpfumu',   provinciaId: mc.id } }),
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'KaMaxakeni', provinciaId: mc.id } }, update: {}, create: { nome: 'KaMaxakeni', provinciaId: mc.id } }),
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'Xai-Xai',    provinciaId: gz.id } }, update: {}, create: { nome: 'Xai-Xai',    provinciaId: gz.id } }),
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'Inhambane',   provinciaId: ih.id } }, update: {}, create: { nome: 'Inhambane',   provinciaId: ih.id } }),
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'Beira',       provinciaId: sf.id } }, update: {}, create: { nome: 'Beira',       provinciaId: sf.id } }),
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'Chimoio',     provinciaId: mn.id } }, update: {}, create: { nome: 'Chimoio',     provinciaId: mn.id } }),
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'Tete',        provinciaId: te.id } }, update: {}, create: { nome: 'Tete',        provinciaId: te.id } }),
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'Quelimane',   provinciaId: zb.id } }, update: {}, create: { nome: 'Quelimane',   provinciaId: zb.id } }),
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'Nampula',     provinciaId: np.id } }, update: {}, create: { nome: 'Nampula',     provinciaId: np.id } }),
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'Lichinga',    provinciaId: ns.id } }, update: {}, create: { nome: 'Lichinga',    provinciaId: ns.id } }),
    prisma.distrito.upsert({ where: { nome_provinciaId: { nome: 'Pemba',       provinciaId: cd.id } }, update: {}, create: { nome: 'Pemba',       provinciaId: cd.id } }),
  ]);
  console.log('✅ ' + dists.length + ' distritos');
  const [kampf, kamax, xaixai, ihdist, beira, chimoio, tetedist, quelimane, nampuladist, lichinga, pemba] = dists;

  // DISCIPLINAS
  await Promise.all([
    prisma.disciplina.upsert({ where: { codigo: 'PORT' }, update: {}, create: { nome: 'Português',               codigo: 'PORT', nivel: 'EP1'  } }),
    prisma.disciplina.upsert({ where: { codigo: 'MAT'  }, update: {}, create: { nome: 'Matemática',              codigo: 'MAT',  nivel: 'EP1'  } }),
    prisma.disciplina.upsert({ where: { codigo: 'ING'  }, update: {}, create: { nome: 'Inglês',                  codigo: 'ING',  nivel: 'ESG1' } }),
    prisma.disciplina.upsert({ where: { codigo: 'HIS'  }, update: {}, create: { nome: 'História',                codigo: 'HIS',  nivel: 'ESG1' } }),
    prisma.disciplina.upsert({ where: { codigo: 'GEO'  }, update: {}, create: { nome: 'Geografia',               codigo: 'GEO',  nivel: 'ESG1' } }),
    prisma.disciplina.upsert({ where: { codigo: 'BIO'  }, update: {}, create: { nome: 'Biologia',                codigo: 'BIO',  nivel: 'ESG1' } }),
    prisma.disciplina.upsert({ where: { codigo: 'FIS'  }, update: {}, create: { nome: 'Física',                  codigo: 'FIS',  nivel: 'ESG2' } }),
    prisma.disciplina.upsert({ where: { codigo: 'QUI'  }, update: {}, create: { nome: 'Química',                 codigo: 'QUI',  nivel: 'ESG2' } }),
    prisma.disciplina.upsert({ where: { codigo: 'EDF'  }, update: {}, create: { nome: 'Educação Física',         codigo: 'EDF',  nivel: 'EP1'  } }),
    prisma.disciplina.upsert({ where: { codigo: 'TIC'  }, update: {}, create: { nome: 'Tecnologias de Informação', codigo: 'TIC', nivel: 'ESG1' } }),
  ]);
  console.log('✅ 10 disciplinas');

  // ESCOLAS
  const escolasData = [
    { codigo: 'MC-001', nome: 'EPC 25 de Setembro',          tipo: 'PRIMARIA',   provinciaId: mc.id, distritoId: kampf.id    },
    { codigo: 'MC-002', nome: 'Escola Secundária Josina Machel', tipo: 'SECUNDARIA', provinciaId: mc.id, distritoId: kamax.id },
    { codigo: 'MC-003', nome: 'EB Acordos de Lusaka',         tipo: 'BASICA',     provinciaId: mc.id, distritoId: kampf.id    },
    { codigo: 'GZ-001', nome: 'EB Eduardo Mondlane',          tipo: 'BASICA',     provinciaId: gz.id, distritoId: xaixai.id   },
    { codigo: 'NP-001', nome: 'EPC Samora Machel',            tipo: 'PRIMARIA',   provinciaId: np.id, distritoId: nampuladist.id },
    { codigo: 'NP-002', nome: 'Escola Secundária de Nacala',  tipo: 'SECUNDARIA', provinciaId: np.id, distritoId: nampuladist.id },
    { codigo: 'ZB-001', nome: 'EB Frelimo',                   tipo: 'BASICA',     provinciaId: zb.id, distritoId: quelimane.id },
    { codigo: 'SF-001', nome: 'Escola Secundária da Beira',   tipo: 'SECUNDARIA', provinciaId: sf.id, distritoId: beira.id    },
    { codigo: 'TE-001', nome: 'EB Kwame Nkrumah',             tipo: 'BASICA',     provinciaId: te.id, distritoId: tetedist.id },
    { codigo: 'MN-001', nome: 'Escola Secundária de Chimoio', tipo: 'SECUNDARIA', provinciaId: mn.id, distritoId: chimoio.id  },
    { codigo: 'IH-001', nome: 'EPC Agosto de 1975',           tipo: 'PRIMARIA',   provinciaId: ih.id, distritoId: ihdist.id   },
    { codigo: 'NS-001', nome: 'EB Julius Nyerere',            tipo: 'BASICA',     provinciaId: ns.id, distritoId: lichinga.id },
    { codigo: 'CD-001', nome: 'Escola Secundária de Pemba',   tipo: 'SECUNDARIA', provinciaId: cd.id, distritoId: pemba.id    },
  ];
  const escolas = [];
  for (const e of escolasData) {
    const escola = await prisma.escola.upsert({ where: { codigo: e.codigo }, update: {}, create: e });
    escolas.push(escola);
  }
  console.log('✅ ' + escolas.length + ' escolas');
  const [epc25, esJosina, ebAcordos, ebMondlane, epcSamora, esNacala, ebFrelimo, esBeira, ebKwame, esChimoio, epcAgosto, ebJulius, esPemba] = escolas;

  // UTILIZADORES
  const hash = (p) => bcrypt.hashSync(p, 10);
  const utilizadores = [
    { email: 'admin@mec.gov.mz',          passwordHash: hash('Admin@2024!'), role: 'ADMIN_MEC',           nome: 'Administrador MEC' },
    { email: 'coord.norte@mec.gov.mz',    passwordHash: hash('Coord@2024!'), role: 'COORDENADOR_REGIONAL', nome: 'Coordenador Norte',  provinciaId: np.id },
    { email: 'coord.centro@mec.gov.mz',   passwordHash: hash('Coord@2024!'), role: 'COORDENADOR_REGIONAL', nome: 'Coordenador Centro', provinciaId: sf.id },
    { email: 'coord.sul@mec.gov.mz',      passwordHash: hash('Coord@2024!'), role: 'COORDENADOR_REGIONAL', nome: 'Coordenador Sul',    provinciaId: mc.id },
    { email: 'diretor.epc25@mec.gov.mz',  passwordHash: hash('Dir@2024!'),   role: 'DIRETOR_ESCOLA',       nome: 'Diretor EPC 25 Setembro', escolaId: epc25.id },
    { email: 'diretor.josina@mec.gov.mz', passwordHash: hash('Dir@2024!'),   role: 'DIRETOR_ESCOLA',       nome: 'Diretor ES Josina Machel', escolaId: esJosina.id },
  ];
  for (const u of utilizadores) {
    await prisma.utilizador.upsert({ where: { email: u.email }, update: {}, create: u });
  }
  console.log('✅ ' + utilizadores.length + ' utilizadores');

  // PROFESSORES
  const profsData = [
    { numeroFuncionario: 'FUNC-001', nome: 'António',  apelido: 'Mabunda',  genero: 'M', dataNascimento: new Date('1980-03-15'), habilitacao: 'LICENCIATURA', escolaId: esJosina.id },
    { numeroFuncionario: 'FUNC-002', nome: 'Celeste',  apelido: 'Chaúque',  genero: 'F', dataNascimento: new Date('1985-07-22'), habilitacao: 'BACHAREL',     escolaId: epc25.id    },
    { numeroFuncionario: 'FUNC-003', nome: 'David',    apelido: 'Cumbe',    genero: 'M', dataNascimento: new Date('1978-11-08'), habilitacao: 'LICENCIATURA', escolaId: esBeira.id   },
    { numeroFuncionario: 'FUNC-004', nome: 'Helena',   apelido: 'Uaiene',   genero: 'F', dataNascimento: new Date('1975-04-30'), habilitacao: 'MESTRADO',     escolaId: epcSamora.id },
    { numeroFuncionario: 'FUNC-005', nome: 'Lurdes',   apelido: 'Nguenha',  genero: 'F', dataNascimento: new Date('1983-02-18'), habilitacao: 'LICENCIATURA', escolaId: esChimoio.id },
  ];
  for (const p of profsData) {
    const { escolaId, ...dados } = p;
    const prof = await prisma.professor.upsert({ where: { numeroFuncionario: p.numeroFuncionario }, update: {}, create: dados });
    await prisma.professorEscola.upsert({
      where: { professorId_escolaId_anoLetivo: { professorId: prof.id, escolaId, anoLetivo: 2024 } },
      update: {}, create: { professorId: prof.id, escolaId, anoLetivo: 2024 }
    });
  }
  console.log('✅ ' + profsData.length + ' professores');

  // ALUNOS
  const alunosData = [
    { nome: 'Ana Beatriz',    apelido: 'Machava',   dataNascimento: new Date('2008-04-12'), genero: 'F', escolaId: epc25.id,    bi: 'BI000000001MZ' },
    { nome: 'Carlos',         apelido: 'Nhantumbo', dataNascimento: new Date('2007-08-23'), genero: 'M', escolaId: ebMondlane.id,bi: 'BI000000002MZ' },
    { nome: 'Fátima',         apelido: 'Sitoe',     dataNascimento: new Date('2006-01-15'), genero: 'F', escolaId: esJosina.id, bi: 'BI000000003MZ' },
    { nome: 'João',           apelido: 'Munguambe', dataNascimento: new Date('2010-06-30'), genero: 'M', escolaId: ebMondlane.id,bi: 'BI000000004MZ' },
    { nome: 'Rosa',           apelido: 'Chissano',  dataNascimento: new Date('2009-09-05'), genero: 'F', escolaId: ebFrelimo.id,bi: 'BI000000005MZ' },
    { nome: 'Pedro',          apelido: 'Cossa',     dataNascimento: new Date('2007-03-17'), genero: 'M', escolaId: esBeira.id,  bi: 'BI000000006MZ' },
    { nome: 'Lurdes',         apelido: 'Mondlane',  dataNascimento: new Date('2004-07-14'), genero: 'F', escolaId: esChimoio.id,bi: 'BI000000007MZ' },
    { nome: 'Eugénio',        apelido: 'Tembe',     dataNascimento: new Date('2011-02-28'), genero: 'M', escolaId: epcAgosto.id,bi: 'BI000000008MZ' },
  ];
  for (const a of alunosData) {
    const { bi, ...dados } = a;
    await prisma.aluno.upsert({ where: { numeroBI: bi }, update: {}, create: { ...dados, numeroBI: bi } });
  }
  console.log('✅ ' + alunosData.length + ' alunos');

  console.log('\n✅ Seed concluído!\n');
  console.log('📋 Credenciais:');
  console.log('   admin@mec.gov.mz          → Admin@2024!');
  console.log('   coord.norte@mec.gov.mz    → Coord@2024!');
  console.log('   diretor.epc25@mec.gov.mz  → Dir@2024!');
}

main()
  .catch(e => { console.warn('⚠ Seed ignorado:', e.message); })
  .finally(() => prisma.$disconnect());
