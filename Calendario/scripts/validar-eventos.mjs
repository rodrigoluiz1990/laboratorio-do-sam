import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const objeto = valor => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const texto = valor => typeof valor === 'string' && valor.trim().length > 0;

// Datas locais do calendário. Não permite a normalização silenciosa de 31/02.
export function dataHoraValida(valor) {
  if (typeof valor !== 'string') return false;
  const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(valor);
  if (!partes) return false;
  const [ano, mes, dia, hora, minuto, segundo] = partes.slice(1).map(Number);
  if (ano < 1000 || mes < 1 || mes > 12 || dia < 1 || hora > 24 || minuto > 59 || segundo > 59) return false;
  if (hora === 24 && (minuto !== 0 || segundo !== 0)) return false;
  return dia <= new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function validarCalendario(diretorio) {
  const resultado = { anos: 0, registros: 0, modelos: 0, erros: [], avisos: [] };
  function registrar(tipo, arquivo, campo, mensagem) {
    resultado[tipo].push({ arquivo, campo, mensagem });
  }
  function ler(arquivo) {
    try {
      return JSON.parse(readFileSync(path.join(diretorio, arquivo), 'utf8').replace(/^\uFEFF/, ''));
    } catch (erro) {
      registrar('erros', arquivo, '$', `Não foi possível ler o JSON: ${erro.message}`);
      return null;
    }
  }
  function validarLink(link, arquivo, campo, tipo = 'erros') {
    if (link === undefined || link === '') return;
    try {
      if (typeof link !== 'string' || !['http:', 'https:'].includes(new URL(link).protocol)) throw new Error();
    } catch {
      registrar(tipo, arquivo, campo, 'O link deve ser uma URL HTTP ou HTTPS válida.');
    }
  }

  const indice = ler('anos.json');
  const meta = ler('meta.json');
  const raids = ler('raids.json');
  const categorias = new Set(['season', 'go_pass']);
  if (!objeto(meta?.meta?.categorias)) {
    registrar('erros', 'meta.json', '$.meta.categorias', 'Informe o objeto de categorias.');
  } else {
    Object.keys(meta.meta.categorias).forEach(categoria => categorias.add(categoria));
  }

  const catalogo = new Map();
  if (!objeto(raids)) {
    registrar('erros', 'raids.json', '$', 'O catálogo deve ser um objeto de categorias.');
  } else {
    for (const [categoria, lista] of Object.entries(raids)) {
      const referencias = new Map();
      catalogo.set(categoria, referencias);
      if (!Array.isArray(lista)) {
        registrar('erros', 'raids.json', `$.${categoria}`, 'A categoria deve ser uma lista.');
        continue;
      }
      lista.forEach((item, i) => {
        const campo = `$.${categoria}[${i}]`;
        if (!objeto(item) || Object.keys(item).length !== 1) {
          registrar('erros', 'raids.json', campo, 'Cada item deve conter exatamente uma referência.');
          return;
        }
        const [ref, dados] = Object.entries(item)[0];
        if (referencias.has(ref)) registrar('erros', 'raids.json', campo, `Referência duplicada: ${ref}.`);
        referencias.set(ref, dados);
        if (!texto(ref) || !objeto(dados) || !texto(dados.titulo)) {
          registrar('erros', 'raids.json', campo, 'A referência precisa de um nome e de um título válido.');
        }
        validarLink(dados?.link, 'raids.json', `${campo}.${ref}.link`);
      });
    }
  }

  if (!Array.isArray(indice?.anos)) {
    registrar('erros', 'anos.json', '$.anos', 'Informe uma lista de anos.');
    return resultado;
  }
  if (!indice.anos.length) registrar('erros', 'anos.json', '$.anos', 'A lista de anos está vazia.');
  const vistos = new Set();
  for (const ano of indice.anos) {
    if (!Number.isInteger(ano) || ano < 1000 || ano > 9999) {
      registrar('erros', 'anos.json', '$.anos', `Ano inválido: ${JSON.stringify(ano)}.`);
      continue;
    }
    if (vistos.has(ano)) {
      registrar('erros', 'anos.json', '$.anos', `Ano repetido: ${ano}.`);
      continue;
    }
    vistos.add(ano);
    const arquivo = `${ano}.json`;
    const dados = ler(arquivo);
    if (!objeto(dados) || !objeto(dados[ano]) || Object.keys(dados).length !== 1) {
      registrar('erros', arquivo, '$', `O arquivo deve conter apenas o objeto "${ano}".`);
      continue;
    }
    resultado.anos++;
    for (const [categoria, lista] of Object.entries(dados[ano])) {
      const campoCategoria = `$.${ano}.${categoria}`;
      if (!categorias.has(categoria)) registrar('erros', arquivo, campoCategoria, 'Categoria não reconhecida em meta.json.');
      if (!Array.isArray(lista)) {
        registrar('erros', arquivo, campoCategoria, 'A categoria deve ser uma lista.');
        continue;
      }
      lista.forEach((evento, i) => {
        resultado.registros++;
        const campo = `${campoCategoria}[${i}]`;
        if (!objeto(evento)) {
          registrar('erros', arquivo, campo, 'O evento deve ser um objeto.');
          return;
        }
        if (evento.modelo !== undefined && typeof evento.modelo !== 'boolean') {
          registrar('erros', arquivo, `${campo}.modelo`, 'Use true ou false para a marcação de modelo.');
        }
        const tipo = evento.modelo === true ? 'avisos' : 'erros';
        const inicioAvisos = resultado.avisos.length;
        if (evento.modelo === true) {
          resultado.modelos++;
        }
        let referencia;
        if (evento.ref !== undefined) {
          const categoriaRef = categoria === 'raid_hour' ? 'raid' : categoria;
          referencia = catalogo.get(categoriaRef)?.get(evento.ref);
          if (!texto(evento.ref) || !referencia) registrar(tipo, arquivo, `${campo}.ref`, `Referência não encontrada em ${categoriaRef}: ${JSON.stringify(evento.ref)}.`);
        }
        if (![evento.titulo_alt, evento.titulo, referencia?.titulo].some(texto)) {
          registrar(tipo, arquivo, `${campo}.titulo`, 'Informe um título ou uma referência com título.');
        }
        for (const chave of ['titulo', 'titulo_alt']) {
          if (evento[chave] !== undefined && typeof evento[chave] !== 'string') registrar(tipo, arquivo, `${campo}.${chave}`, 'O título deve ser texto.');
        }
        const inicioValido = dataHoraValida(evento.inicio);
        const fimValido = dataHoraValida(evento.fim);
        if (!inicioValido) registrar(tipo, arquivo, `${campo}.inicio`, 'Data inválida. Use AAAA-MM-DDTHH:mm:ss com dia e horário existentes.');
        if (!fimValido) registrar(tipo, arquivo, `${campo}.fim`, 'Data inválida. Use AAAA-MM-DDTHH:mm:ss com dia e horário existentes.');
        if (inicioValido && fimValido) {
          const inicio = Date.parse(`${evento.inicio}Z`);
          const fim = Date.parse(`${evento.fim}Z`);
          if (fim < inicio) registrar(tipo, arquivo, `${campo}.fim`, 'O término é anterior ao início.');
          if (fim < Date.UTC(ano, 0, 1) || inicio >= Date.UTC(ano + 1, 0, 1)) {
            registrar(tipo, arquivo, campo, `O intervalo do evento não alcança o ano ${ano}.`);
          }
        }
        validarLink(evento.link, arquivo, `${campo}.link`, tipo);
        if (evento.modelo === true) {
          const pendencias = resultado.avisos.splice(inicioAvisos);
          const detalhes = pendencias.map(item => `${item.campo}: ${item.mensagem}`).join(' ');
          registrar('avisos', arquivo, campo, `Modelo preservado.${detalhes ? ` ${detalhes}` : ' Remova "modelo": true quando confirmado.'}`);
        }
      });
    }
  }
  return resultado;
}

const executadoDiretamente = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDiretamente) {
  const diretorio = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const resultado = validarCalendario(diretorio);
  for (const [tipo, rotulo] of [['erros', 'ERRO'], ['avisos', 'AVISO']]) {
    for (const item of resultado[tipo]) console.log(`${rotulo} ${item.arquivo} ${item.campo}: ${item.mensagem}`);
  }
  console.log(`\n${resultado.anos} anos; ${resultado.registros} registros; ${resultado.modelos} modelos; ${resultado.erros.length} erros; ${resultado.avisos.length} avisos.`);
  process.exitCode = resultado.erros.length ? 1 : 0;
}
