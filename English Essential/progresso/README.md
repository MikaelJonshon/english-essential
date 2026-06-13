# Meu Progresso

Pagina dedicada ao acompanhamento do desempenho do aluno dentro do English Essential.

## Objetivo

Esta tela transforma os dados do aluno em uma leitura visual de evolucao:

- XP acumulado;
- moedas;
- licoes concluidas;
- aproveitamento geral;
- habilidades por eixo;
- pontos fortes e pontos de melhoria;
- evolucao de XP nos ultimos 30 dias;
- historico de licoes finalizadas;
- rank atual e ranks desbloqueaveis.

## Estrutura atual

- `index.html`: markup principal da pagina.
- `progresso.css`: estilos especificos da tela de progresso.
- `progresso.js`: logica de carregamento, renderizacao, graficos e ranks.

## Comportamento da pagina

- valida a sessao local em `ee_session`;
- permite acesso apenas para o perfil `student`;
- carrega os dados pela RPC `get_student_progress`;
- reaproveita a linguagem visual do dashboard do aluno;
- mostra link de retorno ao dashboard principal;
- usa tema `dark blue` quando a preferencia esta salva em `ee_settings`;
- restaura fullscreen quando `ee_fullscreen` esta ativo.

## Dados exibidos

### Resumo rapido

- XP total;
- moedas;
- licoes concluidas;
- aproveitamento geral.

### Habilidades

- radar ampliado com `speaking`, `listening`, `writing` e `reading`;
- legenda com porcentagem de cada habilidade;
- animacao progressiva no desenho do radar.

### Analise

- identifica valores acima de 70% como ponto forte;
- identifica valores entre 40% e 69% como area em desenvolvimento;
- identifica valores abaixo de 40% como area que precisa de atencao;
- mostra barras de intensidade por habilidade.

### Evolucao

- grafico de barras com o XP dos ultimos 30 dias;
- tooltips com ganho diario;
- adaptacao visual ao tema claro ou `dark blue`.

### Historico de licoes

- lista licoes concluidas;
- exibe modulo, titulo, data e score;
- so mostra o bloco quando houver dados.

## Sistema de ranks

A pagina possui um painel de ranks desbloqueados por nivel. O aluno pode ativar um emblema ja conquistado, e essa escolha fica salva em:

```text
localStorage.ee_active_rank
```

O dashboard do aluno le essa mesma chave para mostrar o emblema ativo no topo.

Ranks atuais:

- Bronze;
- Prata;
- Ouro;
- Platina;
- Diamante;
- Mestre;
- Grao-Mestre.

## Dependencias externas

- Supabase JS: acesso aos dados do aluno;
- Chart.js: grafico de XP;
- Google Fonts: fontes compartilhadas com o restante do projeto.

## Variaveis e chaves usadas

- `ee_session`: sessao do usuario;
- `ee_settings`: preferencias visuais compartilhadas;
- `ee_fullscreen`: estado de tela cheia;
- `ee_active_rank`: rank/emblema ativo.

## RPC usada

- `get_student_progress`

## Observacoes tecnicas

- o radar e o grafico de XP sao desenhados em canvas;
- a logica de renderizacao esta concentrada em `progresso.js`;
- a pagina possui logica propria de ranks parecida com a do dashboard do aluno;
- o estado de rank ativo e local, nao persistido no Supabase no momento.

## Proximos ajustes possiveis

- persistir o rank ativo no banco;
- incluir metas personalizadas do aluno;
- destacar tendencia de melhora ou queda por habilidade;
- adicionar conquistas e marcos;
- comparar semanas ou meses;
- integrar recomendacoes de estudo baseadas no perfil do aluno.
