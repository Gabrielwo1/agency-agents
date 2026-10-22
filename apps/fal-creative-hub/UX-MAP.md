# Mapa de UX · Creative Hub

## Ideia central

O chat não fica solto: **ele sempre acontece dentro do ambiente de um cliente.**
Tudo que a IA gera herda o contexto (design system, pasta, histórico), e tudo que a IA usa fica visível e editável.
A referência visual (Echo AI) dá a base: sidebar com navegação e histórico, hero de boas-vindas,
cards de sugestão e um compositor com seletor de modelo. Aqui cada uma dessas peças passa a ser do cliente.

| Peça da referência | No Creative Hub |
| --- | --- |
| Histórico Pinned / Today | Clientes → pastas do cliente ativo (com contagem de criações) |
| "Welcome to Echo AI" + orb | Monograma do cliente com o brilho nas **cores da marca**. O tema do app muda com o cliente |
| Cards de sugestão | Sugestões de briefing cadastradas por cliente |
| Seletor "3.5 Sonnet" | Seletor de modelo com **Auto (recomendado)** e o motivo da escolha |
| Ícones chat / imagem / música | Linguagem visual: Foto · Ilustração · Vetor · 3D · Tipografia |
| Card "Upgrade to Pro" | Status da conexão com a fal.ai |

## Arquitetura de informação

```mermaid
flowchart LR
  HUB[Hub de clientes] -->|abrir card| STUDIO
  subgraph CLIENTE[Ambiente do cliente]
    STUDIO[Estúdio · chat] <--> DS[Painel Design System]
    STUDIO --> GAL[Galeria por pasta]
    GAL -->|reusar briefing| STUDIO
    PASTAS[Pastas] --- STUDIO
    PASTAS --- GAL
  end
  HUB -->|novo cliente| FORM[Cadastro: cores, fontes, linguagem, tom, evitar]
  FORM --> STUDIO
```

## Jornada principal

```mermaid
sequenceDiagram
  actor D as Designer
  participant UI as Estúdio
  participant DS as Design System
  participant S as Servidor local
  participant F as fal.ai
  D->>UI: escolhe cliente e pasta
  UI->>DS: carrega paleta, fontes, keywords, tom
  D->>UI: escreve o briefing em PT
  UI->>UI: recomenda linguagem e modelo (Auto)
  opt Refinar com IA
    UI->>S: /api/enhance
    S->>F: any-llm (briefing + DS)
    F-->>UI: prompt de direção de arte
  end
  D->>DS: revisa ou edita o prompt final
  D->>UI: Gerar
  UI->>S: /api/generate
  S->>F: queue.fal.run/{modelo} (prompt + cores + negative)
  loop status
    UI->>S: /api/jobs/:id
    S->>F: status_url
  end
  S->>S: baixa imagens para outputs/cliente/pasta
  S-->>UI: resultado + histórico
```

## Camadas de contexto (como IA e cliente conversam)

1. **Cliente**: define o tema da interface (glow, orb, botão de enviar) com as cores da marca. Você sempre sabe "onde está".
2. **Pasta**: destino da entrega, mostrado como chip no compositor e trocável no breadcrumb.
3. **Design system**: injetado no prompt. Cada keyword pode ser desligada. A paleta vira parâmetro real nos modelos que aceitam.
4. **Linguagem visual + modelo**: o modo Auto explica a escolha ("Pedido com texto na imagem → Ideogram").
5. **Prompt final**: transparência total. É o texto exato enviado, editável antes de gerar.
6. **Resultado**: cada geração guarda briefing, prompt final, modelo, seed e pasta. Dá para gerar de novo, editar ou reusar a partir da galeria.

## Estados de cada geração

`Na fila (posição N)` → `Gerando…` (skeleton no formato escolhido) → `Salvo em <pasta>` · ou `Falhou` com o motivo
(ex.: saldo esgotado, chave inválida) e o botão "Gerar de novo".

## Próximas etapas sugeridas

- **Referências do cliente**: upload de logo e fotos de produto (fal storage) e geração image-to-image / edição (ex.: `fal-ai/nano-banana/edit`).
- **Aprovação**: status por imagem (rascunho → aprovado → entregue) e link de revisão para o cliente.
- **Multiusuário**: mover `clients.json` e `history.json` para um banco (ex.: Supabase) com login da equipe.
- **Formatos de entrega**: presets por canal (Feed 4:5, Story 9:16, LinkedIn 1.91:1) e upscale antes de exportar.
- **Custo**: estimativa por geração e consumo por cliente no hub.
