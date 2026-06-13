# Libs

Diretorio reservado para configuracoes e bibliotecas compartilhadas.

## Arquivos

- `supabase.js`: define `window.SUPABASE_URL` com a URL publica do projeto Supabase.

## Estado atual

Este diretorio ainda nao centraliza toda a configuracao do Supabase.

Alguns HTMLs/JS ainda repetem:

- URL do Supabase;
- chave anon publica;
- criacao do client `window.supabase.createClient(...)`.

## Uso pretendido

A ideia deste diretorio e virar o ponto unico para configuracoes compartilhadas, evitando repeticao entre:

- login;
- dashboard do aluno;
- pagina de progresso;
- dashboard do professor/admin;
- configuracoes.

## Pendencia recomendada

Criar um helper compartilhado, por exemplo:

```text
libs/supabase-client.js
```

Esse helper poderia expor:

- `window.SUPABASE_URL`;
- `window.SUPABASE_ANON`;
- `window.eeSupabase`;
- funcoes comuns de sessao e redirecionamento.
