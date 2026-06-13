# Assets do Dashboard do Aluno

Diretorio de recursos estaticos do conteudo didatico usado pelo aluno.

## Estrutura atual

```text
assets/
  m1/
    l1/
      images/
      audio/
```

Padrao usado:

- `m1`: Modulo 1;
- `l1`: Licao Principal 1;
- `images`: imagens da licao;
- `audio`: audios da licao.

## Conteudo atual

O primeiro lote real ja esta incluido:

- 28 imagens `.jpg`;
- 31 audios `.mp3`;
- READMEs internos nas pastas de imagem e audio.

## Nomeacao

Os arquivos usam nomes descritivos em ingles e separados por `_`, por exemplo:

- `boy_reading.jpg`
- `girl_swimming.jpg`
- `they_are_running.jpg`
- `the_boy_is_reading.mp3`
- `they_are_cooking.mp3`

Essa convencao facilita mapear assets com exercicios no Supabase.

## Recomendacao para expansao

Manter a mesma estrutura para novos conteudos:

```text
assets/m1/l2/images/
assets/m1/l2/audio/
assets/m2/l1/images/
assets/m2/l1/audio/
```

Evitar misturar arquivos de varias licoes na mesma pasta quando o volume crescer, para preservar manutencao e clareza.
