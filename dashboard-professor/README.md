# Dashboard do Professor

Area de acompanhamento dos alunos e administracao da plataforma. Professores e administradores compartilham o painel, com recursos adicionais exibidos apenas para `admin`.

## Funcionalidades atuais

- valida a sessao local e permite acesso aos perfis `teacher` e `admin`;
- exibe metricas gerais pela RPC `get_teacher_metrics`;
- lista alunos pela RPC `get_all_students_for_teacher`;
- permite busca, filtro por status e ordenacao;
- destaca alunos inativos ha mais de 14 dias;
- lista exercicios com maior taxa de erro pela RPC `get_error_rate_exercises`;
- cria alunos pela RPC `create_student`;
- permite redefinir senha de alunos;
- permite desativar alunos.

## Recursos exclusivos de administrador

- listar professores e administradores pela RPC `get_all_staff`;
- criar professores pela RPC `create_teacher`;
- redefinir senha de membros da equipe pela RPC `update_staff_password`;
- desativar usuarios pela RPC `delete_staff`.

## Arquivos

- `index.html`: markup e grande parte da logica atual do painel.
- `dashboard-professor.css`: estilos especificos do painel, importando `../css/dashboard-professor.css`.
- `dashboard-professor.js`: ponto reservado para futura extracao da logica do painel.
- `assets/`: diretorios preparados para imagens e audios futuros da area administrativa.

## Observacoes tecnicas

- o painel ainda concentra JavaScript inline em `index.html`;
- a chave anon e a inicializacao do Supabase ainda ficam diretamente no HTML;
- o CSS foi separado em arquivo local que importa a base compartilhada;
- o tema `dark blue` e fullscreen sao aplicados a partir das preferencias locais.

## Pendencias conhecidas

- mover a logica inline para `dashboard-professor.js`;
- adicionar uma visao detalhada do progresso individual do aluno;
- implementar a acao de lembrete para alunos inativos;
- aprimorar estados de erro e carregamento;
- revisar seguranca visual dos dados renderizados via `innerHTML` antes de producao.
