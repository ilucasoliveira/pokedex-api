# Rota151 — front-end

**No ar:** [https://rota151-9ykf.onrender.com](https://rota151-9ykf.onrender.com)

Interface web da Pokedex API, seguindo o kit de design Rota151: busca por nome ou número, filtros por tipo e geração, cards paginados e ficha completa de cada Pokémon com atributos, habilidades e linha evolutiva (inclusive com ramificações, como a do Eevee).

## Stack

| Camada      | Tecnologia                                          |
| ----------- | --------------------------------------------------- |
| Build       | Vite                                                |
| Interface   | React 19 + TypeScript                               |
| Rotas       | React Router                                        |
| Dados       | TanStack Query (cache, cancelamento e novas tentativas) |
| Estilo      | CSS Modules com os tokens do kit (`src/styles/tokens.css`) |
| Ícones      | Lucide                                              |
| Fontes      | Rubik, Nunito Sans e Press Start 2P, servidas pelo próprio site (Fontsource) |
| Testes      | Vitest + Testing Library (jsdom)                    |
| Lint        | oxlint                                              |

## Como rodar

Pré-requisito: Node 24.

```bash
cd frontend
npm install
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173). Sem configuração, o front usa a API publicada no Render, que já libera essa origem no CORS. A primeira requisição pode levar até um minuto se a API estiver "dormindo" (plano gratuito); a tela avisa quando isso acontece.

Para usar a API local (`docker compose up` na raiz), crie um `.env.local` a partir do `.env.example`:

```bash
VITE_API_URL=http://localhost:8000
```

## Scripts

| Comando           | O que faz                                  |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Servidor de desenvolvimento com recarga    |
| `npm test`        | Roda os testes uma vez                     |
| `npm run test:watch` | Testes em modo observação               |
| `npm run lint`    | oxlint                                     |
| `npm run build`   | Checa os tipos e gera o build em `dist/`   |
| `npm run preview` | Serve o build localmente                   |

## Páginas

| Rota                   | Conteúdo                                                        |
| ---------------------- | --------------------------------------------------------------- |
| `/`                    | Hero e catálogo                                                 |
| `/pokedex`             | Catálogo: busca, filtros, contagem e cards paginados (24 por página) |
| `/pokemon/:idOrName`   | Ficha completa, pelo número ou pelo nome                        |
| `/tipos`               | Os tipos com a quantidade de Pokémon em cada                    |
| `/geracoes`            | As gerações com a quantidade de Pokémon em cada                 |
| `/sobre`               | Sobre o projeto, créditos e aviso de projeto de fã               |

Busca, filtros e página ficam na URL (`/pokedex?search=char&type=fire&generation=1&page=2`): o link pode ser compartilhado, o "Voltar" do navegador funciona, e o "Voltar para a lista" da ficha volta exatamente para a lista de onde o usuário veio.

## Estrutura

```
src/
├── assets/          # símbolo e padrão de mapa do kit
├── components/      # Header, SearchBar, FilterSelect, PokemonCard, TypeBadge,
│                    # EvolutionChain, StatBars, Pagination, StatusPanel, Catalog...
├── hooks/           # título da aba e aviso de API lenta
├── pages/           # uma por rota
├── services/        # tipos da API, chamadas HTTP e hooks do TanStack Query
├── styles/          # tokens do kit (sem alterações), base global e botões
├── test/            # setup do Vitest e helpers (app em memória, API falsa)
└── utils/           # formatação pt-BR, parâmetros da URL, paginação e cores dos tipos
```

## Decisões

- **Dados só da nossa API**: o front nunca chama a PokéAPI. A ficha chega pronta numa requisição, e as opções dos filtros vêm de `GET /types` e `GET /generations`, sem listas fixas na interface
- **Sprite nos cards, artwork no detalhe**: como pede o guia. Sprites ganham `image-rendering: pixelated`; o artwork em alta resolução nunca. Se uma imagem falha, a próxima da lista é tentada e, no fim, aparece "Imagem indisponível" no mesmo tamanho
- **Unidades convertidas no front**: a API devolve decímetros e hectogramas, como a PokéAPI; a tela mostra `0,4 m` e `6,0 kg`
- **Textos que a API não traduz** (descrição, habilidades, itens) ficam no original. A descrição é marcada com `lang="en"` para o leitor de tela pronunciar em inglês
- **Logo em React**: o logo do kit usa `<text>` com Rubik dentro do SVG; como `<img>`, ele não usaria a fonte da página. O símbolo é a imagem e o nome é texto
- **Acessibilidade**: link "Pular para o conteúdo", foco visível com o anel do kit, `<select>` nativo nos filtros, menu mobile fechando com Escape e devolvendo o foco, contagem anunciada com `role="status"`, foco levado ao título dos resultados ao trocar de página, alvos de pelo menos 44 px e `prefers-reduced-motion` respeitado (regra do kit)
- **Busca com debounce de 300 ms**: o Enter busca na hora, digitar não enche o histórico do navegador (a URL é substituída), e buscas antigas são canceladas pelo TanStack Query

## Deploy

Site estático no Render, descrito no [`render.yaml`](../render.yaml) da raiz (serviço `rota151`): build com `npm ci && npm run build`, publicação do `dist/` e `VITE_API_URL` apontando para a API publicada. O Render publica sozinho quando um push na `main` mexe em `frontend/` e os checks do CI passam. Como é uma SPA, qualquer caminho sem arquivo recebe o `index.html`.

O endereço do site precisa estar na `CORS_ORIGINS` da API, senão o navegador bloqueia as chamadas.

## Ainda não feito

- Favoritos (opcional no guia)
- Painel lateral de detalhe no desktop (o guia sugere; hoje o detalhe abre em página própria)
- Ordenação além do número
