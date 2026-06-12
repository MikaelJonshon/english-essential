# Dashboard do Aluno

Area principal de aprendizado individual do estudante.

## Funcionalidades atuais

- valida a sessao local e permite acesso apenas ao perfil `student`;
- carrega dados do aluno pela RPC `get_student_home`;
- exibe XP, nivel, moedas e rank ativo no topo;
- exibe barra de XP e radar de habilidades na sidebar;
- mostra nome de exibicao e avatar personalizados quando salvos;
- possui navegacao para `Inicio`, `Meu progresso` e `Configuracoes`;
- abre `Meu progresso` em `../progresso/index.html`;
- abre `Configuracoes` como modal dentro do proprio dashboard;
- 
- restaura fullscreen quando `ee_fullscreen` esta ativo.

## Trilha de estudo

A tela renderiza a trilha inicial do aluno com estrutura de modulo, licoes principais e aulas.

No estado atual, o dashboard trabalha com o Modulo 1 e possui arrays internos para mapear as aulas aos IDs de licao do Supabase.

O comportamento atual inclui:

- expandir/fechar modulo com animacao;
- expandir/fechar licao principal com animacao;
- listar aulas dentro da licao principal;
- indicar aulas bloqueadas, disponiveis e concluidas;
- abrir aula selecionada dentro da area de exercicios.

## Exercicios

O fluxo de exercicios fica em `dashboard-aluno.js` e usa:

- `get_lesson_content`: carrega conteudo da licao;
- `submit_answer`: envia resposta individual;
- `complete_lesson`: finaliza a licao e registra score/recompensas.

Tipos atualmente suportados:

- `multiple_choice`;
- `text`;
- `listening`;
- `speaking`.

Recursos de experiencia:

- imagem por exercicio quando `image_url` existe;
- audio por exercicio quando `audio_url` existe;
- botao de reproducao de audio;
- reconhecimento de voz nativo do navegador para speaking;
- feedback visual de acerto/erro;
- popup de XP;
- popup de moedas quando houver recompensa;
- tela de conclusao com score e recompensa;
- cards de explicacao gramatical entre exercicios (LESSON_EXPLANATIONS).

## Gamificacao

O dashboard mostra:

- XP total;
- nivel calculado a cada 1000 XP;
- moedas vindas do backend;
- emblema/rank ativo;
- barra de progresso do nivel.

O rank ativo usa a chave local `ee_active_rank`, escolhida na pagina de progresso quando o aluno desbloqueia ranks por nivel.

## Configuracoes embutidas

O modal de configuracoes esta dentro de `index.html`, com logica no final de `dashboard-aluno.js` e estilos em `dashboard-aluno.css`.

Ele controla:

- som geral;
- volume geral;
- sons de feedback;
- narracao;
- volume de narracao;
- microfone;
- dispositivo de entrada;
- sensibilidade;
- teste de microfone;
- fullscreen;
- zoom;
- 
- animacoes;
- notificacoes;
- restauracao de padrao.

As preferencias ficam em `localStorage` na chave `ee_settings`.

## Arquivos

- `index.html`: markup principal, sidebar, area de exercicios e modal de configuracoes.
- `dashboard-aluno.css`: estilos especificos do dashboard, importando `../css/dashboard-aluno.css`.
- `dashboard-aluno.js`: logica principal do aluno, exercicios, gamificacao, radar, fullscreen e configuracoes.
- `assets/`: recursos estaticos do conteudo didatico.

## Assets

O conteudo inicial esta organizado em:

- `assets/m1/l1/images/`
- `assets/m1/l1/audio/`

Estado atual:

- 28 imagens `.jpg`;
- 31 audios `.mp3`;
- nomes descritivos em ingles para facilitar associacao com exercicios.

## Pendencias conhecidas

- confirmar se todos os IDs das aulas em `PATH_LESSONS` existem no banco;
- reduzir o uso de `onclick` e estilos inline;
- proteger ou remover o diagnostico visual global de erros antes de producao;
- revisar possivel problema de codificacao em textos com acentos;
- escapar dados vindos do banco antes de inserir via `innerHTML`;
- expandir o restante das aulas, licoes e modulos.
