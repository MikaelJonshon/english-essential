# English Essential — Documento de Contexto do Projeto

## Visão Geral

Plataforma web de ensino de inglês para alunos individuais, inspirada no Rosetta Stone.
O conteúdo é baseado em vocabulário próprio já existente, organizado em cursos progressivos.

- **Frontend:** HTML + CSS + JavaScript (vanilla)
- **Backend / Banco de dados:** Supabase (PostgreSQL)
- **Autenticação:** Login via código de usuário + senha (bcrypt), via RPC `verify_login`
- **Pasta do projeto:** `~/Desktop/English Essential`

---

## Perfis de Usuário

O enum `user_role` tem os seguintes valores:

| Role | Acesso |
|---|---|
| `student` | Painel do aluno — exercícios, progresso, XP e moedas |
| `teacher` | Painel do professor — visualiza todos os alunos da org |
| `admin` | Acesso total |
| `secretaria` | Mesmo acesso do professor — redireciona para dashboard-professor |

Após login, o sistema verifica o `role` e redireciona:
- `student` → `dashboard-aluno/index.html`
- `teacher` / `admin` / `secretaria` → `dashboard-professor/index.html`

**Sem turmas.** Ensino individual — cada professor acompanha alunos de forma independente.

---

## Organizações

Cada instalação da plataforma pertence a uma `organization`. Usuários são vinculados a uma org via `organization_id`.

#### `organizations`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| name | varchar | Nome da escola/org |
| slug | varchar | Identificador único |
| settings | jsonb | Configurações: `logo_url`, cores, etc. |
| created_at | timestamptz | |

- RPCs `get_org_branding` e `update_org_branding` gerenciam logo e visual da org.
- Logo é aplicada nos 3 dashboards (aluno, professor, configurações).
- Storage bucket `org-assets` armazena logos.

---

## Estrutura de Conteúdo

```
Course (nível: basic / intermediate / advanced)
  └── Module (agrupamento temático)
        └── Lesson (aula individual)
              └── Exercise (exercício)
                    └── Exercise Option (opções de múltipla escolha / imagem)
```

### Tipos de exercício (`question_type`) — todos implementados

| Tipo | Descrição |
|---|---|
| `multiple_choice` | Escolha entre opções de texto |
| `text` | Aluno digita a resposta (comparada com `correct_answer`) |
| `listening` | Baseado em áudio; resposta comparada com `correct_answer` |
| `image_choice` | Escolha tocando na imagem correta; com ou sem áudio |
| `word_order` | Ordena palavras para formar uma frase; com ou sem áudio |
| `is_or_are` | Escolhe IS ou ARE (botões grandes) |
| `speaking` | Aluno fala a resposta — gravada via Web Speech API |

---

## Schema do Banco de Dados (Supabase)

Projeto: **eng** | ID: `jhpqdxqsgnyqtzqvggvx` | Região: `us-east-2`

### Tabelas

#### `users`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| code | varchar | Login único (4–50 chars) |
| password_hash | text | bcrypt |
| full_name | varchar | |
| display_name | varchar | Nome exibido (fallback: full_name) |
| avatar_url | text | URL do avatar |
| email | varchar | Opcional, único |
| phone | varchar | Opcional |
| status | enum | `active` \| `inactive` |
| role | enum | `student` \| `teacher` \| `admin` \| `secretaria` |
| organization_id | uuid | FK → organizations |
| created_at / updated_at | timestamptz | |

#### `courses`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| title | varchar | |
| description | text | Opcional |
| level | enum | `basic` \| `intermediate` \| `advanced` |
| active | boolean | Default true |

#### `modules`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| course_id | uuid | FK → courses |
| title | varchar | |
| order_index | integer | Ordem dentro do curso |

#### `lessons`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| module_id | uuid | FK → modules |
| title | varchar | |
| content | text | Opcional |
| video_url | text | Opcional |
| order_index | integer | **Deve estar alinhado com PATH_LESSONS no frontend** |

> ⚠️ **Importante:** O `order_index` das lições do Módulo 1 segue a ordem do `PATH_LESSONS[0]` definido em `dashboard-aluno/dashboard-aluno.js`. O RPC `get_lesson_content` usa `order_index - 1` para verificar a lição anterior — os dois devem estar sincronizados.

**Ordem atual do Módulo 1 (Lição Principal 1):**

| order_index | Lição |
|---|---|
| 0 | Lição Principal 1 |
| 1 | Pronúncia 1 |
| 2 | Vocabulário 1 |
| 3 | Gramática 1 |
| 4 | Escutar e Ler 1 |
| 5 | Ler 1 |
| 6 | Escrever 1 |
| 7 | Escutar 1 |
| 8 | Falar 1 |
| 9 | Revisão 1 |

#### `exercises`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| lesson_id | uuid | FK → lessons |
| question | text | Enunciado |
| question_type | enum | Ver tabela acima |
| correct_answer | text | Usado em `text`, `listening`, `speaking` |
| explanation | text | Exibida após resposta |
| phonetic | text | Transcrição fonética (speaking) |
| speaking_hint | text | Dica exibida antes de falar |
| audio_url | text | URL do áudio (listening, image_choice, word_order) |
| image_url | text | URL da imagem principal |
| order_index | integer | Ordem dentro da lição |

#### `exercise_options`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| exercise_id | uuid | FK → exercises |
| option_text | text | Texto da alternativa |
| image_url | text | Imagem da opção (image_choice) |
| is_correct | boolean | Default false |

#### `user_progress`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users |
| lesson_id | uuid | FK → lessons |
| completed | boolean | `true` apenas quando `score >= 70` |
| completed_at | timestamptz | Opcional |
| score | numeric | 0–100 — sempre o maior score atingido (`GREATEST`) |

> **UNIQUE constraint:** `(user_id, lesson_id)` — sem duplicatas.
> `completed = (score >= 70)` — reprovação mantém `completed = false` mas salva o score.
> Score `null` = nunca tentou. Score `0` com `completed = false` = tentou e zerou.

#### `user_exercise_answers`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users |
| exercise_id | uuid | FK → exercises |
| answer | text | Resposta do aluno |
| is_correct | boolean | |
| answered_at | timestamptz | |

#### `student_xp`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users (único) |
| total_xp | integer | Acumulado |
| streak_days | integer | Dias consecutivos |
| last_activity | date | Base do streak |
| coins | integer | Moedas acumuladas |
| created_at / updated_at | timestamptz | |

#### `xp_events`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users |
| source | text | `lesson_completed` \| `streak_bonus` \| `level_up` |
| xp_amount | integer | |
| reference_id | uuid | ID da lição/exercício |
| created_at | timestamptz | |

### RPCs implementadas

| RPC | Descrição |
|---|---|
| `verify_login` | Autentica usuário por code + senha |
| `get_student_home` | Retorna cursos, lições e progresso do aluno |
| `get_lesson_content` | Retorna exercícios de uma lição + lock check |
| `complete_lesson` | Salva score, atualiza XP, moedas e streak |
| `get_lesson_progress_state` | Estado salvo de uma lição em andamento |
| `get_student_profile` | Perfil completo do aluno (XP, nível, streak, etc.) |
| `get_org_branding` | Logo e configurações visuais da org |
| `update_org_branding` | Atualiza logo/branding da org |
| `get_students_list` | Lista de alunos para o professor (filtrado por org) |

---

## Gamificação

| Evento | Recompensa |
|---|---|
| Lição concluída (novo melhor score) | +50 XP |
| Bônus de streak (a cada 7 dias) | +100 XP |
| Lição aprovada (score ≥ 70%) | +20 moedas |
| Level up (a cada 1000 XP) | +100 moedas por nível |

- **Nível** = `FLOOR(total_xp / 1000) + 1`
- Streak zera se o aluno não acessar por um dia.
- Score sempre mantém o melhor resultado (`GREATEST`).

---

## Funcionalidades Implementadas

### Painel do Aluno (`dashboard-aluno/`)
- ✅ Login com redirecionamento por role
- ✅ Lições progressivas: próxima bloqueada até 70% na anterior
- ✅ Score reprovado (<70%) exibido em vermelho; próxima continua bloqueada
- ✅ Acompanhamento de XP, nível, streak e moedas no HUD do topbar
- ✅ Todos os tipos de exercício implementados (multiple_choice, text, listening, image_choice, word_order, is_or_are, speaking)
- ✅ Draft de lição salvo localmente e no banco (retoma do ponto onde parou)
- ✅ Tela de conclusão com score, XP e moedas ganhos
- ✅ **Explicações gramaticais** entre exercícios (`LESSON_EXPLANATIONS` em `dashboard-aluno.js`) — aparece após o 3º exercício de cada lição
- ✅ Branding da org aplicado (logo no header)
- ✅ Tela de configurações (avatar, display name, senha)
- ✅ Modal de perfil do aluno

### Explicações Gramaticais (feature)
Cards de explicação aparecem entre exercícios (após o índice configurado em `LESSON_EXPLANATIONS`):

| Lição | Conteúdo |
|---|---|
| Pronúncia | Present Continuous (-ING) |
| Vocabulário | Noun / Substantivo (singular e plural) |
| Gramática | Verb To Be (IS / ARE) |
| Escutar e Ler | Pronomes (HE, SHE, THEY) |
| Ler | Artigos (THE / A) |
| Escrever | Revisão: Present Continuous |
| Escutar | Revisão: Noun / Plural |
| Falar | Revisão: IS e ARE |
| Revisão | Revisão: Pronomes (após ex.3) + Artigos (após ex.7) |

### Painel do Professor (`dashboard-professor/`)
- ✅ Lista de alunos filtrada por organização
- ✅ Progresso individual por aluno
- ✅ Branding da org aplicado

---

## Ordem de Desenvolvimento

1. ✅ Banco de dados
2. ✅ Login + redirecionamento por role
3. ✅ Painel do aluno com exercícios funcionando
4. ✅ Registro de progresso e XP
5. ✅ Painel do professor
6. ✅ Gamificação (XP + moedas + nível + streak)
7. ✅ Organizações + branding
8. ✅ Tipos adicionais de exercício (image_choice, word_order, is_or_are, speaking)
9. ✅ Explicações gramaticais entre exercícios
10. ⬜ Teste de nivelamento inicial
11. ⬜ Alertas de alunos inativos
12. ⬜ Identificação de exercícios com alta taxa de erro
13. ⬜ LP 2, 3, 4 (conteúdo das próximas Lições Principais)

---

## Observações Técnicas

- `AGENTS.md` na raiz serve como contexto para agentes — compartilhe ao iniciar nova conversa.
- `CLAUDE.md` é cópia idêntica para uso com o Claude.
- Migrações ficam registradas no histórico do Supabase (Database → Migrations).
- O `order_index` das lições **deve** seguir a mesma ordem de `PATH_LESSONS` no JS — qualquer nova lição adicionada ao PATH precisa ter seu `order_index` atualizado no banco.
- CSS do dashboard do aluno tem dois arquivos: `css/dashboard-aluno.css` (base global) e `dashboard-aluno/dashboard-aluno.css` (overrides e componentes específicos).
