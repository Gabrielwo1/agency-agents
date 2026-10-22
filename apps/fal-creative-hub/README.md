# Creative Hub · fal.ai

Dashboard da agência para gerar imagens na [fal.ai](https://fal.ai) **a partir do design system de cada cliente**.
Você escolhe o cliente, descreve a peça em português, escolhe a linguagem visual e o modelo (ou deixa no automático),
e a imagem é salva direto na pasta daquele cliente.

## Rodando

Precisa só de Node 20+ (não há dependências para instalar).

```bash
cd apps/fal-creative-hub
cp .env.example .env        # cole sua FAL_KEY no .env
npm start                   # http://localhost:5173
```

Para testar a interface sem gastar créditos:

```bash
npm run demo                # simula a fila e gera placeholders com as cores do cliente
```

> A `FAL_KEY` fica **só no servidor** (`server.mjs`). O navegador conversa com `/api/*`
> e nunca recebe a chave. O `.env` está no `.gitignore`: não faça commit dele.

## O que tem

| Área | O que faz |
| --- | --- |
| **Hub de clientes** | Cards com paleta, tipografia, tom, nº de pastas e últimas criações. Busca e cadastro de novo cliente. |
| **Estúdio** | Interface de chat: briefing → resultado com status da fila em tempo real (na fila → gerando → salvo). |
| **Linguagem visual** | Foto · Ilustração · Vetor · 3D · Tipografia. Cada uma acrescenta instruções próprias ao prompt. |
| **Modelo automático** | Escolhe o modelo pelo pedido: texto na imagem → Ideogram V3; vetor/ilustração → Recraft V3; 3D → Nano Banana; foto → FLUX 1.1 Pro Ultra; rascunho → FLUX Schnell. O motivo aparece no seletor. |
| **Design system ao vivo** | Painel lateral com paleta, fontes, palavras-chave (liga e desliga), tom, "evitar" e o **prompt final editável**, que é exatamente o que vai para a fal.ai. |
| **Cores reais da marca** | No Recraft e no Ideogram a paleta é enviada como parâmetro do modelo (`colors` / `color_palette`), não só como texto. "Evitar" vira `negative_prompt` no Ideogram. |
| **Refinar com IA** | Reescreve o briefing em um prompt de direção de arte em inglês usando o design system (LLM via `fal-ai/any-llm`). |
| **Pastas e galeria** | Imagens baixadas para `outputs/<cliente>/<pasta>/`, histórico em `data/history.json`, galeria com filtro por pasta e "reusar briefing". |

## Clientes

Os clientes ficam em `data/clients.json` (os quatro que vêm no arquivo são exemplos fictícios). Formato:

```json
{
  "id": "brasa-burger",
  "name": "Brasa Burger",
  "segment": "Food service",
  "monogram": "Br",
  "folders": ["Geral", "Cardápio"],
  "designSystem": {
    "palette": ["#E63B2E", "#FFB627", "#1A1A1A", "#FFF8E7"],
    "fonts": ["Bebas Neue", "Poppins"],
    "keywords": ["juicy food photography", "dramatic side light"],
    "tone": "Ousado, divertido e com apetite",
    "avoid": ["pale food", "plastic look"],
    "defaultStyle": "photo",
    "defaultAspect": "1:1"
  },
  "suggestions": ["Smash burger duplo com queijo escorrendo e fumaça"]
}
```

Dica: escreva `keywords` e `avoid` em inglês, porque os modelos de imagem respondem melhor assim.

## Modelos

Definidos em `MODELS` no `server.mjs`. Cada um tem uma função `build` que converte a entrada do app para o schema
do endpoint. Para adicionar outro modelo da fal.ai, copie um bloco e ajuste os parâmetros conforme a página do modelo.

## API local

| Rota | Uso |
| --- | --- |
| `GET /api/config` | status da chave + lista de modelos |
| `GET/POST /api/clients` | listar / criar cliente |
| `POST /api/clients/:id/folders` | criar pasta |
| `GET /api/history?client=&folder=` | histórico |
| `POST /api/enhance` | refinar prompt com LLM |
| `POST /api/generate` | envia para a fila da fal.ai → `{ jobId }` |
| `GET /api/jobs/:jobId` | status / resultado (salva as imagens ao concluir) |

O mapa de UX e as próximas etapas estão em [UX-MAP.md](./UX-MAP.md).
