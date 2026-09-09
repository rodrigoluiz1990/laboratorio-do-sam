# Laboratório do Sam

Site de Pokémon GO feito com HTML, CSS e JavaScript, com calendário de eventos, histórico de raids, avaliação de conta e minijogos. A página `index.html` redireciona para o calendário.

## Executar localmente

Abra a pasta inteira do projeto no VS Code. Se a extensão Live Server estiver instalada, abra `index.html` com **Open with Live Server**. A configuração em `.vscode/settings.json` define a porta `5502`; nesse caso, o endereço é `http://127.0.0.1:5502/`.

Também é possível usar outro servidor HTTP estático, servindo a raiz do projeto. O site não exige compilação. Abrir o HTML diretamente por `file://` pode impedir o carregamento dos JSONs, do menu e do rodapé.

Os scripts de validação e testes precisam de Node.js e não exigem instalação de dependências. O ambiente usado nos testes foi Node.js 22.18.0. Confira sua instalação com:

```bash
node --version
```

Notícias, consultas do jogo Quem é esse Pokémon e alguns recursos externos dependem de internet.

## Organização

| Caminho | Conteúdo |
| --- | --- |
| [Calendario/](Calendario/) | Página do calendário, scripts e dados anuais. |
| [Calendario/anos.json](Calendario/anos.json) | Lista dos anos usados na busca global e na validação. |
| [Calendario/meta.json](Calendario/meta.json) | Nomes e ícones das categorias. |
| [Calendario/raids.json](Calendario/raids.json) | Catálogo de referências reutilizadas nos eventos. |
| [Raids/](Raids/) | Histórico de raids. |
| [Avaliacao/](Avaliacao/) | Calculadora de avaliação de conta. |
| [puzzle/](puzzle/), [memory_game/](memory_game/), [quem_e_esse_pokemon/](quem_e_esse_pokemon/) | Minijogos. |
| [Assets/](Assets/), [css/](css/) | Imagens e estilos. |
| [componentes.js](componentes.js), [menu.html](menu.html), [footer.html](footer.html) | Carregamento e conteúdo do menu e rodapé compartilhados. |
| [tests/](tests/) | Testes automatizados e instruções de conferência visual. |

## Atualizar eventos

O cadastro é manual nos arquivos JSON. O calendário no navegador carrega o arquivo do ano selecionado, como `Calendario/2026.json`. O arquivo antigo `Calendario/calendario_eventos_pokemongo.json` não é a fonte desse carregamento anual.

1. Confirme título, datas, horários e link na publicação do evento.
2. Abra o JSON do ano e encontre a categoria correspondente.
3. Edite o registro existente ou acrescente um novo objeto à lista. Separe os objetos com vírgulas, sem deixar vírgula depois do último item. Salve em UTF-8.
4. Execute o validador e corrija os erros.
5. Recarregue a página local e confira o mês, a busca, o filtro da categoria e os detalhes do evento.
6. Após a conferência, publique os arquivos alterados pelo processo de publicação do projeto. Salvar localmente não atualiza o site publicado.

As categorias incluem `events` (eventos gerais), `research`, `community_day`, `raid`, `raid_hour`, `raid_mega`, `raid_mega_super`, `raid_shadow`, `dynamax`, `gigantamax`, `max_monday` e `spotlights`. Temporadas ficam em `season` e Passes GO em `go_pass`.

### Evento com título próprio

Exemplo fictício de estrutura de um arquivo anual. Ao atualizar um arquivo existente, acrescente somente o evento à lista adequada, preservando os outros registros:

```json
{
  "2026": {
    "events": [
      {
        "titulo": "Evento de exemplo",
        "inicio": "2026-09-20T10:00:00",
        "fim": "2026-09-25T20:00:00"
      }
    ]
  }
}
```

As datas usam `AAAA-MM-DDTHH:mm:ss`, no horário local do evento. Nos JSONs, os meses vão de `01` a `12`: `09` é setembro. O término deve ser igual ou posterior ao início. Para meia-noite, prefira `00:00:00` na data seguinte; o validador também aceita `24:00:00` ao final do dia.

O campo opcional `link` recebe uma URL HTTP/HTTPS. Para uma imagem própria, adicione o arquivo em `Assets/` e use `img` com um caminho como `../Assets/nome-da-imagem.png`. Sem imagem própria, o calendário pode usar o ícone da categoria.

### Evento com referência

Para reutilizar um Pokémon do catálogo, use `ref` na categoria correspondente do arquivo anual. Exemplo com datas fictícias, dentro de `raid`:

```json
{
  "ref": "raid_articuno",
  "inicio": "2026-09-20T10:00:00",
  "fim": "2026-09-25T10:00:00"
}
```

A referência precisa existir na lista da categoria em `Calendario/raids.json`. Por exemplo, a lista `raid` contém objetos neste formato:

```json
{
  "raid_articuno": {
    "titulo": "Raid: Articuno",
    "link": "https://www.pokebattler.com/raids/ARTICUNO"
  }
}
```

Se a referência já existir, reutilize-a. Para um novo cadastro, acrescente uma chave única ao catálogo, seguindo a estrutura existente. Eventos de `raid_hour` consultam as referências da categoria `raid`.

### Modelos e datas provisórias

Os modelos permanecem nos arquivos do calendário. Use `"modelo": true` em registros que ainda aguardam confirmação ou preenchimento. O validador apresenta esses registros como avisos; essa marcação não oculta o evento nem acrescenta um aviso visual no site.

Quando as informações forem confirmadas, atualize os campos e remova `"modelo": true` ou altere para `false`. Um evento incompleto sem essa marcação gera erro na validação.

### Novo ano e eventos entre anos

Crie `Calendario/AAAA.json` com a chave do ano e suas categorias, e inclua o número do ano em `Calendario/anos.json`. Copie a estrutura com cuidado para não manter datas antigas como se fossem confirmadas. O seletor de anos vai de 2016 até o ano atual mais um.

Para um evento que começa em dezembro e termina em janeiro, mantenha o intervalo completo e inclua o registro nos dois arquivos anuais para que apareça ao consultar ambos os anos.

## Validar e testar

Execute os comandos a partir da raiz do projeto, no PowerShell ou Git Bash:

```bash
node Calendario/scripts/validar-eventos.mjs
node tests/executar.cjs
```

O primeiro verifica os dados atuais: JSON, estrutura, categorias, referências, títulos, datas e formato dos links. `ERRO` reprova a validação; `AVISO` identifica modelos preservados e não reprova sozinho. O comando não confirma datas oficiais, funcionamento de links ou existência de imagens, e não altera os arquivos.

O segundo executa os testes de regressão, sem requisições externas. Os testes usam simulações de navegador, rede e relógio quando necessário; a aparência e a entrega de notificações precisam de conferência no navegador.

Consulte os detalhes em [Validação dos eventos](Calendario/scripts/VALIDACAO.md) e [Testes de regressão](tests/README.md).

## Comportamentos do calendário

- O layout inicial é em colunas no computador e em linhas em dispositivos identificados como de toque, como celulares. Os dois ícones permitem trocar o modo. A escolha manual dura até recarregar a página.
- Os filtros permanecem aplicados ao buscar, trocar mês ou ano e usar Hoje.
- No modo linhas, os blocos de um mesmo dia acompanham a altura do maior bloco daquele dia.
- As notificações precisam da permissão do navegador e da página aberta. A disponibilidade depende do navegador e do sistema, especialmente no celular.

## Menu e rodapé

Edite `menu.html` e `footer.html` para alterar o conteúdo compartilhado. Os caminhos desses fragmentos são relativos à raiz do projeto; `componentes.js` os resolve ao carregar cada página. As páginas incluem esse script com `defer`.

O menu de jogos aceita fechamento pelo botão, por Escape e por clique fora da janela. Se um componente falhar ao carregar, a opção **Tentar novamente** repete seu carregamento.
