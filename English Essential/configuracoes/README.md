# Configuracoes

Diretorio de apoio/legado para a tela de preferencias da plataforma.

## Estado atual

No estado atual do projeto, nao existe `configuracoes/index.html` nesta pasta. O fluxo ativo de configuracoes do aluno foi incorporado como modal dentro de:

```text
dashboard-aluno/index.html
```

A logica ativa do modal esta em:

```text
dashboard-aluno/dashboard-aluno.js
```

Os estilos ativos do modal estao em:

```text
dashboard-aluno/dashboard-aluno.css
```

## Arquivos ainda presentes

- `configuracoes.css`: arquivo de estilos separado para uma possivel tela dedicada.
- `configuracoes.js`: logica completa de uma tela de configuracoes separada, incluindo Supabase, sidebar, perfil, audio, microfone, fullscreen, zoom, notificacoes e personalizacao do aluno.

Esses arquivos podem servir como referencia, mas a rota separada de configuracoes nao esta ativa porque o HTML correspondente nao existe na pasta.

## Funcionalidades do fluxo ativo no dashboard do aluno

O modal ativo permite:

- configurar som geral;
- configurar volume geral;
- configurar sons de feedback;
- configurar narracao e volume;
- ativar, selecionar e testar microfone;
- acompanhar nivel de entrada do microfone;
- alternar fullscreen;
- ajustar zoom;
- alternar tema `dark blue`;
- desativar animacoes;
- solicitar notificacoes do navegador;
- restaurar preferencias padrao.

As preferencias sao salvas no navegador em:

```text
localStorage.ee_settings
```

O estado de fullscreen usa:

```text
localStorage.ee_fullscreen
```

## Personalizacao do aluno

O arquivo `configuracoes.js` ainda contem logica para atualizar nome de exibicao e avatar via RPC `update_student_profile`.

No fluxo ativo atual, o dashboard do aluno ja exibe `display_name` e `avatar_url` vindos da sessao/dados do Supabase. Antes de reativar uma pagina separada de configuracoes, e importante decidir se a personalizacao continuara no modal ou voltara a ter uma tela propria.

## Pendencias conhecidas

- decidir se esta pasta sera reativada como pagina separada ou removida;
- evitar manter duas implementacoes concorrentes de configuracoes;
- se a pagina separada voltar, recriar `index.html` e revisar links;
- se o modal for definitivo, migrar apenas o que for util de `configuracoes.js` e remover duplicidade futura.
