# English Essential — Documento de Contexto do Projeto

## Visão Geral

Plataforma web de ensino de inglês para alunos individuais, inspirada no Rosetta Stone.
O conteúdo é baseado em vocabulário próprio já existente, organizado em cursos progressivos.

- **Frontend:** HTML + CSS + JavaScript (vanilla)
- **Backend / Banco de dados:** Supabase (PostgreSQL)
- **Autenticação:** Login via código de usuário + senha (bcrypt), gerenciado pelo Supabase Auth
- **Pasta do projeto:** `~/Desktop/English Essential`

---

## Perfis de Usuário

Há três roles definidos no enum `user_role` do banco:

| Role | Acesso |
|---|---|
| `student` | Painel do aluno — realiza exercícios, acompanha próprio progresso e XP |
| `teacher` | Painel do professor — visualiza e filtra todos os alunos, acompanha progresso individual |
| `admin` | Acesso total à plataforma |

Após o login, o sistema verifica o `role` e redireciona:
- `student` → painel do aluno
- `teacher` / `admin` → painel do professor/admin

**Não há formação de turmas.** O ensino é individual — cada professor acompanha alunos de forma independente, sem agrupamentos.

---

## Estrutura de Conteúdo

O conteúdo segue uma hierarquia de quatro níveis:

```
Course (nível: basic / intermediate / advanced)
  └── Module (agrupamento temático)
        └── Lesson (aula individual)
              └── Exercise (exercício da aula)
                    └── Exercise Option (opções de múltipla escolha)
```

### Tipos de exercício (`question_type`)
- `multiple_choice` — o aluno escolhe entre opções; as alternativas ficam em `exercise_options`
- `text` — o aluno digita a resposta; comparada com `correct_answer`
- `listening` — baseado em áudio; resposta comparada com `correct_answer`

---

## Schema do Banco de Dados (Supabase)

Projeto: **eng** | ID: `jhpqdxqsgnyqtzqvggvx` | Região: `us-east-2`

### Tabelas existentes

#### `users`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| code | varchar | Login único do usuário (4–50 chars) |
| password_hash | text | bcrypt — nunca armazenar em texto puro |
| full_name | varchar | |
| email | varchar | Opcional, único |
| phone | varchar | Opcional |
| status | enum | `active` \| `inactive` |
| role | enum | `student` \| `teacher` \| `admin` |
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
| video_url | text | Opcional, deve começar com http(s) |
| order_index | integer | Ordem dentro do módulo |

#### `exercises`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| lesson_id | uuid | FK → lessons |
| question | text | Enunciado |
| question_type | enum | `multiple_choice` \| `text` \| `listening` |
| correct_answer | text | Usado em `text` e `listening` |
| explanation | text | Explicação exibida após resposta |

#### `exercise_options`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| exercise_id | uuid | FK → exercises |
| option_text | text | Texto da alternativa |
| is_correct | boolean | Default false |

#### `user_progress`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users |
| lesson_id | uuid | FK → lessons |
| completed | boolean | Default false |
| completed_at | timestamptz | Opcional |
| score | numeric | 0–100 |

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
| user_id | uuid | FK → users (único por aluno) |
| total_xp | integer | Acumulado, mínimo 0 |
| streak_days | integer | Dias consecutivos de atividade |
| last_activity | date | Base para calcular/quebrar streak |
| created_at / updated_at | timestamptz | updated_at atualizado por trigger |

#### `xp_events`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users |
| source | text | `exercise_correct` \| `lesson_completed` \| `streak_bonus` \| `level_up` |
| xp_amount | integer | Mínimo 1 |
| reference_id | uuid | ID do exercício ou lição que gerou o XP |
| created_at | timestamptz | |

### RLS (Row Level Security)
Todas as tabelas têm RLS ativado:
- Aluno vê apenas os próprios dados
- Teacher e admin veem dados de todos os alunos
- Inserções/atualizações de XP feitas pelo service role (backend)

---

## Gamificação

| Evento | XP |
|---|---|
| Exercício correto | +10 XP |
| Lição concluída | +50 XP |
| Bônus de streak (7 dias seguidos) | +100 XP |

O streak é calculado com base em `last_activity` na tabela `student_xp`.
Se o aluno não acessar em um dia, o streak zera.

---

## Funcionalidades Planejadas

### Painel do aluno
- Exercícios progressivos por lição (lição seguinte bloqueada até nota mínima de 70%)
- Acompanhamento de XP, streak e progresso geral
- Teste de nivelamento inicial (define o nível: basic / intermediate / advanced)

### Painel do professor
- Lista de todos os alunos com filtro e busca
- Progresso individual por aluno (lições concluídas, score, XP)
- Identificação de exercícios com maior taxa de erro
- Alerta de alunos inativos (sem acesso há X dias)

### Tipos de exercício a implementar
- Múltipla escolha (pronto no schema)
- Digitação de resposta (pronto no schema)
- Associação imagem + palavra
- Ordenar palavras para formar frase
- Ditado / listening

---

## Ordem de Desenvolvimento Recomendada

1. **Banco de dados** — ✅ concluído
2. **Login + redirecionamento por role** — próximo passo
3. **Painel do aluno com primeiro exercício funcionando**
4. **Registro de progresso e XP**
5. **Painel do professor**
6. **Gamificação completa**
7. **Teste de nivelamento**
8. **Tipos adicionais de exercício**

---

## Observações Técnicas

- O arquivo `AGENTS.md` na raiz do projeto serve como contexto para o Codex
- Ao iniciar nova conversa, compartilhe este arquivo para retomar o contexto completo
- Migrações aplicadas ficam registradas no histórico do Supabase (aba Database → Migrations)
