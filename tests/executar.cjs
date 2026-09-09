const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Enumera os testes para funcionar igualmente no PowerShell, Git Bash e outros terminais.
const arquivos = fs.readdirSync(__dirname)
  .filter(nome => nome.endsWith('.test.cjs'))
  .sort()
  .map(nome => path.join(__dirname, nome));

if (!arquivos.length) {
  console.error('Nenhum teste encontrado.');
  process.exitCode = 1;
} else {
  const resultado = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...arquivos], { stdio: 'inherit' });
  if (resultado.error) console.error(resultado.error.message);
  process.exitCode = resultado.status ?? 1;
}
