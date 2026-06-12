# English Essential

Plataforma web de ensino individual de ingles, inspirada em uma experiencia interativa de pratica diaria. O frontend usa HTML, CSS e JavaScript vanilla, e o backend/banco de dados principal fica no Supabase.

## Visao geral

O projeto atualmente contem:

- login por codigo de usuario e senha;
- redirecionamento por role (`student`, `teacher`, `admin`, `secretaria`);
- dashboard do aluno com trilha de estudo, exercicios, XP, moedas e ranks;
- sistema de organizacoes com branding por org (logo, settings);
- explicacoes gramaticais entre exercicios (cards com animacao, configuradas em LESSON_EXPLANATIONS);
- modal de configuracoes embutido no dashboard do aluno;
- pagina separada de progresso com radar, insights, historico e painel de ranks;
- dashboard do professor/admin com metricas, busca, filtros e gestao de usuarios;
- personalizacao de nome de exibicao e avatar do aluno;
- fullscreen, zoom, audio, microfone e notificacoes locais;
- primeiro lote real de assets didaticos em imagem e audio para o Modulo 1 / Licao Principal 1.

## Estrutura atual

- `index.html`: entrada principal e login.
- `login.js`: ponto reservado para futura separacao da logica do login.
- `login.css` e `css/login.css`: estilos do login.
- `dashboard-aluno/`: experiencia principal do aluno.
- `dashboard-aluno/assets/`: imagens e audios do conteudo didatico.
- `progresso/`: pagina de analise de progresso do aluno.
- `dashboard-professor/`: painel do professor e do admin.
- `configuracoes/`: arquivos legados/apoio da tela de configuracoes; hoje o fluxo ativo do aluno esta como modal dentro de `dashboard-aluno/index.html`.
- `css/`: estilos compartilhados/base.
- `libs/`: helpers compartilhados, incluindo URL publica do Supabase.
- `iniciar-servidor.bat`: atalho para subir servidor local no Windows.
- `AGENTS.md` / `CLAUDE.md`: contexto operacional do projeto.

## Estado do produto

### Login

- autentica por `code` + senha;
- usa a RPC `verify_login`;
- armazena a sessao em `localStorage` na chave `ee_session`;
- bloqueia acesso se a conta estiver `inactive`;
- envia `student` para `dashboard-aluno/index.html`;
- envia `teacher` e `admin` para `dashboard-professor/index.html`.

### Dashboard do aluno

- valida a sessao local e permite acesso apenas ao perfil `student`;
- carrega a home pela RPC `get_student_home`;
- exibe XP total, nivel, moedas, rank ativo e barra de progresso;
- mostra radar de habilidades com `speaking`, `listening`, `writing` e `reading`;
- renderiza a trilha inicial do Modulo 1;
- permite expandir modulo, licoes principais e aulas com animacao;
- abre exercicios sem sair do dashboard;
- suporta `multiple_choice`, `text`, `listening`, `image_choice`, `word_order`, `is_or_are` e `speaking`;
- toca audio, mostra imagem quando disponivel e usa reconhecimento de voz nativo no `speaking`;
- envia respostas pela RPC `submit_answer`;
- conclui licoes pela RPC `complete_lesson`;
- mostra feedback de resposta, XP recebido, moedas recebidas e tela de conclusao;
- mostra nome de exibicao e avatar personalizados na sidebar.

### Configuracoes do aluno

O fluxo ativo de configuracoes do aluno esta embutido como modal em `dashboard-aluno/index.html`, com logica em `dashboard-aluno/dashboard-aluno.js` e estilos em `dashboard-aluno/dashboard-aluno.css`.

Ele permite:

- controlar som geral, feedback e narracao;
- ajustar volumes;
- ativar, selecionar e testar microfone;
- acompanhar medidor visual de entrada do microfone;
- alternar tema `dark blue`;
- alternar fullscreen;
- ajustar zoom;
- solicitar notificacoes do navegador;
- desativar animacoes;
- restaurar preferencias padrao.

As preferencias ficam no `localStorage`, principalmente na chave `ee_settings`.

### Pagina de progresso

- carrega dados pela RPC `get_student_progress`;
- mostra XP total, moedas, licoes concluidas e aproveitamento;
- exibe radar ampliado de habilidades;
- mostra insights de pontos fortes e pontos de melhoria;
- exibe grafico de XP dos ultimos 30 dias;
- lista historico de licoes concluidas;
- possui painel de ranks com emblemas desbloqueados por nivel;
- permite ativar um emblema ja desbloqueado e salva a escolha em `localStorage` na chave `ee_active_rank`.

### Dashboard do professor e admin

- valida a sessao local e permite acesso aos perfis `teacher` e `admin`;
- carrega metricas pela RPC `get_teacher_metrics`;
- lista alunos pela RPC `get_all_students_for_teacher`;
- permite busca, filtro por status e ordenacao;
- destaca alunos inativos;
- exibe exercicios com maior taxa de erro pela RPC `get_error_rate_exercises`;
- cria alunos pela RPC `create_student`;
- permite redefinir senha e desativar alunos;
- para `admin`, lista professores e administradores pela RPC `get_all_staff`;
- para `admin`, cria professores pela RPC `create_teacher`;
- para `admin`, redefine senha de membros da equipe pela RPC `update_staff_password`;
- para `admin`, desativa usuarios pela RPC `delete_staff`.

## Integracao com Supabase

O frontend usa a chave anon publica do projeto e depende de RPCs para as operacoes principais. A autorizacao real deve continuar no backend/RLS/RPCs; o `localStorage` serve apenas para sessao local, preferencias e exibicao.

RPCs atualmente referenciadas:

- `verify_login`
- `get_student_home`
- `get_student_progress`
- `get_skill_stats`
- `get_lesson_content`
- `submit_answer`
- `complete_lesson`
- `get_teacher_metrics`
- `get_all_students_for_teacher`
- `get_error_rate_exercises`
- `create_student`
- `create_teacher`
- `get_all_staff`
- `update_staff_password`
- `delete_staff`
- `update_student_profile`

## Dados locais no navegador

- `ee_session`: dados basicos da sessao do usuario;
- `ee_settings`: preferencias locais de audio, microfone, tema, zoom e animacoes;
- `ee_fullscreen`: estado de tela cheia;
- `ee_active_rank`: emblema/rank escolhido pelo aluno entre os ja desbloqueados.

## Assets didaticos

O primeiro lote real de conteudo esta em:

- `dashboard-aluno/assets/m1/l1/images/`
- `dashboard-aluno/assets/m1/l1/audio/`

Estado atual aproximado:

- 28 imagens `.jpg`;
- 31 audios `.mp3`;
- READMEs internos para orientar a organizacao.

O padrao atual usa nomes descritivos em ingles, como `boy_reading.jpg`, `the_boy_is_reading.mp3`, `they_are_running.mp3`.

## Execucao local

Na raiz do projeto:

```powershell
python -m http.server 3000
```

Depois acesse:

```text
http://localhost:3000/
```

Tambem existe o arquivo `iniciar-servidor.bat`, que tenta iniciar o servidor com Python, `py` ou `npx serve`.

## Observacoes tecnicas

- o dashboard do aluno ja esta parcialmente separado em `index.html`, `dashboard-aluno.css` e `dashboard-aluno.js`;
- ainda existem alguns handlers e estilos inline, principalmente no modal e em templates gerados via JavaScript;
- o dashboard do professor ainda concentra boa parte da logica em `index.html`;
- a configuracao ativa do aluno hoje e modal, nao uma pagina separada;
- a chave anon do Supabase ainda aparece repetida em alguns arquivos; `libs/supabase.js` e um ponto de consolidacao futura;
- ha textos com sinais de codificacao quebrada em alguns HTML/JS exibidos pelo terminal; vale conferir visualmente no navegador.

## Proximos passos sugeridos

- corrigir/normalizar codificacao dos arquivos para UTF-8 quando necessario;
- remover ou proteger o debug visual de erro JavaScript antes de producao;
- consolidar a chave/cliente Supabase em um helper compartilhado;
- reduzir handlers inline e mover eventos para `addEventListener`;
- conectar todas as aulas planejadas a IDs reais do banco;
- expandir os assets para os demais modulos/licoes;
- criar uma estrategia de seguranca antes de publicar em dominio real.
