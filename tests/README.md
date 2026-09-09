# Testes de regressão

Na raiz do projeto, execute no terminal:

```powershell
node tests/executar.cjs
```

O comando encontra todos os arquivos `*.test.cjs` desta pasta e retorna código 1 se algum teste falhar. Usa apenas recursos do Node.js, sem instalar dependências e sem fazer requisições externas. O ambiente utilizado na validação foi Node.js 22.18.0.

## Cobertura

| Arquivo | Comportamentos protegidos |
| --- | --- |
| `calendario-estado.test.cjs` | Navegação após busca, botão Hoje, dias 29–31, ano bissexto e virada do ano. |
| `calendario-filtros.test.cjs` | Filtros após renderização, meses vazios e categorias desmarcadas. |
| `calendario-integracao.test.cjs` | Carregamento, busca, sugestões, controles, renderização, filtros e layouts funcionando juntos. Padrão por dispositivo e escolha manual. |
| `calendario-dados.test.cjs` | Correções de dados do Passe GO e das horas lendárias de Mega Latias/Latios. |
| `componentes.test.cjs` | Carregamento independente de menu e rodapé, recuperação de falhas, caminhos, modal e teclado. |
| `notificacoes.test.cjs` | Permissões, fila de alertas, cancelamento, eventos simultâneos, falhas e carregamento independente da busca. |
| `news.test.cjs` | Notícias válidas, conteúdo HTML tratado como texto, links permitidos e falhas de carregamento. |
| `quem-e-esse-pokemon.test.cjs` | Uma consulta inicial, cache, falhas, limites de espera, cliques repetidos e respostas. |
| `validar-eventos.test.cjs` | Datas reais, referências, estrutura, modelos e códigos de saída do validador. |

Os testes usam os scripts reais do projeto com DOM, rede e relógio simulados quando necessário. Os testes de integração executam também o bloco de renderização existente em `calendario.html`. Dados fictícios tornam esses fluxos independentes de mudanças nos eventos reais.

Para executar somente a integração do calendário:

```powershell
node --test tests/calendario-integracao.test.cjs
```

Para verificar os dados atuais antes de publicar, execute também:

```powershell
node Calendario/scripts/validar-eventos.mjs
```

## Conferência visual

Os testes em Node não medem CSS, dimensões, gestos de toque nem a entrega de notificações pelo sistema operacional. Depois de alterar a interface, confira no navegador:

1. Computador abre em colunas; celular em linhas. Os ícones alternam o modo e destacam apenas o escolhido.
2. Os filtros continuam aplicados após buscar, trocar mês/ano e usar Hoje.
3. No modo linhas, os blocos de cada dia acompanham a altura do maior bloco sem cortar texto.
4. No celular, menus e busca cabem na tela e a rolagem horizontal fica dentro do calendário ou da linha do dia.
5. Após alterações nas notificações, faça um teste real com permissão concedida e outro desligando a opção antes do alerta.

Os testes do validador criam e removem somente suas próprias pastas temporárias. Os arquivos do projeto não são modificados pela execução da suíte.
