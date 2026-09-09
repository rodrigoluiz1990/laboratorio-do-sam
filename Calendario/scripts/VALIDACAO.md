# Validação dos eventos

Na raiz do projeto, execute com Node.js:

```powershell
node Calendario/scripts/validar-eventos.mjs
```

O comando lê `anos.json`, `meta.json`, `raids.json` e os arquivos anuais listados. Não altera arquivos nem acessa a internet. Funciona também fora da raiz, usando o caminho completo do script.

Verifica JSON malformado, arquivos ausentes, estrutura dos anos e categorias, títulos, datas reais, término anterior ao início, eventos fora do ano, referências de raids e links HTTP/HTTPS. Horas lendárias consultam a categoria `raid` do catálogo, como no calendário.

As datas usam `AAAA-MM-DDTHH:mm:ss`, no horário local do evento. `24:00:00` é aceito como meia-noite ao final do dia; `24:01:00` não é válido. Eventos que atravessam a virada do ano são permitidos nos anos que seu intervalo alcança.

- `ERRO`: problema em evento preenchido ou na estrutura dos arquivos; o processo termina com código 1.
- `AVISO`: registro marcado explicitamente com `"modelo": true`; suas pendências são informadas sem reprovar a validação.
- Sem erros, o processo termina com código 0, mesmo que existam avisos de modelos.

Os modelos mantidos de 2025 e 2027 e o Passe GO provisório de dezembro/2026 receberam essa marcação. Ela serve ao validador e não altera a exibição atual no site. Ao confirmar e preencher um modelo, remova `"modelo": true` ou altere para `false`. Novos eventos incompletos sem a marcação são erros.

Exemplo de localização: `2025.json $.2025.events[2].fim` indica o campo `fim` do terceiro evento da categoria `events` (a contagem começa em zero).

Para validar uma cópia dos dados, passe o diretório que contém os JSONs:

```powershell
node Calendario/scripts/validar-eventos.mjs caminho/da/copia
```

Para executar os testes do validador:

```powershell
node --test tests/validar-eventos.test.cjs
```

A validação verifica consistência dos dados; não confirma datas oficiais dos eventos, preços, funcionamento de links ou existência de imagens. Execute o comando após editar os JSONs e antes de publicar.
