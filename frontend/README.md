# Rota151 — front-end

**No ar:** [https://rota151-9ykf.onrender.com](https://rota151-9ykf.onrender.com)

Interface web da Pokedex API, seguindo o kit de design Rota151 e o slogan dele, **Explorar · Descobrir · Completar**: uma Pokédex para explorar, com uma jornada que guarda o que você já descobriu.

## Experiência

- **Explorar**: busca por nome ou número (atalho `/`), filtros por tipo e geração, ordenação (número, nome, mais rápidos, maior total de atributos...) com o valor do atributo no card, e tudo na URL para compartilhar
- **Painel lateral no desktop** (a partir de 1280 px): o card abre a ficha ao lado da lista, com anterior/próximo da página e Escape para fechar; no celular, a ficha abre em página própria
- **Ficha completa**: arte oficial com versão **shiny**, **grito** do Pokémon, medidas em pt-BR, habilidades com a oculta destacada, atributos em barras animadas por faixa, **fraquezas e resistências** (×4, ×2, ×½, ×¼, imune) e linha evolutiva com ramificações (Eevee, Wurmple). Anterior/próximo da Pokédex pelas setas `←` `→`
- **Evoluir com pedras (easter egg)**: na ficha de quem evolui por pedra (Pikachu, Vulpix, Gloom, Kirlia...), a pedra certa flutua no canto inferior direito da tela, sem nenhum aviso. Arraste e solte sobre o Pokémon (ou clique, ou Enter no teclado): toca uma trilha chiptune, ele vira uma silhueta de luz, com faíscas em espiral, anel e explosão, e a ficha troca para o Pokémon evoluído, que surge da luz com uma fanfarra e o aviso "Parabéns!". São as 10 pedras de evolução, em 45 evoluções; o Gloom mostra as duas dele (Leaf e Sun). Só na ficha em página própria. O Eevee fica de fora por enquanto: terá uma experiência própria
- **Descobrir**: cada ficha aberta entra na sua Pokédex. O início mostra o progresso ("37 de 1.025 descobertos"), os cards ganham a marca de descoberto, cada geração mostra quantos faltam, e o botão **Descobrir um Pokémon novo** sorteia um que você ainda não viu
- **Favoritos**: coração nos cards e na ficha, contador no menu e página própria
- **Vistos recentemente**, para retomar a exploração
- Hero ilustrado (trilha, montanhas e a placa da Rota 151, em SVG próprio com as cores do kit), com animações leves que somem com movimento reduzido
- **Português e inglês**: botão `EN`/`PT` no header. Toda a interface muda, inclusive números (`1.025` / `1,025`), unidades (`0,4 m` / `0.4 m`), tipos (Fogo / Fire), atributos e as condições de evolução. Sem escolha salva, vale o idioma do navegador
- **Modo claro e escuro**: botão de sol/lua no header. Sem escolha salva, segue o tema do sistema. O escuro é uma "noite na trilha": fundos castanho-escuros, cards tingidos pela cor do tipo e a paisagem do hero mais escura

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
| `/`                    | Hero, jornada (progresso), vistos recentemente e catálogo       |
| `/pokedex`             | Catálogo: busca, filtros, contagem e cards paginados (24 por página) |
| `/pokemon/:idOrName`   | Ficha completa, pelo número ou pelo nome                        |
| `/tipos`               | Os tipos com a quantidade de Pokémon em cada                    |
| `/geracoes`            | As gerações com a quantidade de Pokémon e o seu progresso em cada |
| `/favoritos`           | Pokémon favoritados, do mais recente para o mais antigo         |
| `/sobre`               | Sobre o projeto, créditos e aviso de projeto de fã               |

Busca, filtros, ordenação, página e o Pokémon do painel ficam na URL (`/pokedex?search=char&type=fire&sort=-speed&page=2&selected=6`): o link pode ser compartilhado, o "Voltar" do navegador funciona, e o "Voltar para a lista" da ficha volta exatamente para a lista de onde o usuário veio.

## Estrutura

```
src/
├── assets/          # símbolo e padrão de mapa do kit
├── components/      # Header, SearchBar, FilterSelect, PokemonCard, TypeBadge,
│                    # EvolutionChain, StatBars, Pagination, StatusPanel, Catalog...
├── hooks/           # título da aba e aviso de API lenta
├── pages/           # uma por rota
├── services/        # tipos da API, chamadas HTTP e hooks do TanStack Query
├── i18n/            # textos em português e inglês (messages.ts) e a função t()
├── store/           # jornada (favoritos, descobertos, vistos) e preferências (idioma, tema)
├── styles/          # tokens do kit (sem alterações), base global e botões
├── test/            # setup do Vitest e helpers (app em memória, API falsa)
└── utils/           # formatação pt-BR, parâmetros da URL, paginação, cores e tabela de tipos
```

## Decisões

- **Dados só da nossa API**: o front nunca chama a PokéAPI. A ficha chega pronta numa requisição, e as opções dos filtros vêm de `GET /types` e `GET /generations`, sem listas fixas na interface
- **Sprite nos cards, artwork no detalhe**: como pede o guia. Sprites ganham `image-rendering: pixelated`; o artwork em alta resolução nunca. Se uma imagem falha, a próxima da lista é tentada e, no fim, aparece "Imagem indisponível" no mesmo tamanho
- **Unidades convertidas no front**: a API devolve decímetros e hectogramas, como a PokéAPI; a tela mostra `0,4 m` e `6,0 kg`
- **Textos que a API não traduz** (descrição, habilidades, itens) ficam no original. A descrição é marcada com `lang="en"` para o leitor de tela pronunciar em inglês
- **Logo em React**: o logo do kit usa `<text>` com Rubik dentro do SVG; como `<img>`, ele não usaria a fonte da página. O símbolo é a imagem e o nome é texto
- **Acessibilidade**: link "Pular para o conteúdo", foco visível com o anel do kit, `<select>` nativo nos filtros, menu mobile fechando com Escape e devolvendo o foco, contagem anunciada com `role="status"`, foco levado ao título dos resultados ao trocar de página, alvos de pelo menos 44 px e `prefers-reduced-motion` respeitado (regra do kit)
- **Jornada só no navegador**: favoritos, descobertos e vistos recentemente ficam no `localStorage` (sem conta nem servidor), sincronizados entre abas. Se o armazenamento estiver bloqueado (modo privado), tudo funciona durante a sessão. "Recomeçar" apaga tudo
- **Idiomas sem biblioteca**: um dicionário tipado em `src/i18n/messages.ts`. O TypeScript obriga o inglês a ter exatamente as mesmas chaves do português, então nenhum texto fica sem tradução. Trocar o idioma remonta as páginas (a URL e o cache das consultas continuam). A descrição da Pokédex continua em inglês nos dois idiomas, porque é a única que a PokéAPI tem
- **Tema por tokens**: o tema escuro só troca o valor de variáveis CSS (os tokens do kit e alguns semânticos da aplicação, como `--color-on-accent` e `--color-surface-raised`), sem CSS duplicado. O verde do kit continua nos botões com texto branco; onde o verde vira texto, o escuro usa um tom mais claro para manter o contraste. Tema e idioma são aplicados por um script curto no `index.html`, antes do primeiro desenho, para a página não piscar
- **Trilha sonora original**: a música de evolução dos jogos é protegida por direitos autorais, então a trilha é uma composição própria, sintetizada na hora com a Web Audio API (ondas quadradas, como nos consoles de 8 bits), sem arquivos de áudio. Só toca depois que o usuário arrasta ou clica na pedra
- **Arrastar sem biblioteca**: a pedra usa Pointer Events (mouse, caneta e toque do mesmo jeito) e não o drag-and-drop nativo do HTML, que não funciona no celular. Quem não consegue arrastar clica ou usa o teclado. Durante a animação, a ficha e a arte do evoluído já são baixadas, e a troca de página é instantânea
- **Dados derivados, não inventados**: a tabela de fraquezas é a oficial dos jogos (Geração VI em diante) e não considera habilidades, o que a tela avisa. A arte shiny e o grito vêm do repositório público da PokéAPI, no mesmo padrão de URL que ela usa; se não existirem, a arte normal volta e aparece "Grito indisponível". O botão de grito some em navegadores sem suporte a OGG
- **Sem conteúdo pulando**: a faixa de vistos recentemente é a de quando a página abriu, então abrir um Pokémon no painel não empurra a lista
- **Busca com debounce de 300 ms**: o Enter busca na hora, digitar não enche o histórico do navegador (a URL é substituída), e buscas antigas são canceladas pelo TanStack Query

## Deploy

Site estático no Render, descrito no [`render.yaml`](../render.yaml) da raiz (serviço `rota151`): build com `npm ci && npm run build`, publicação do `dist/` e `VITE_API_URL` apontando para a API publicada. O Render publica sozinho quando um push na `main` mexe em `frontend/` e os checks do CI passam. Como é uma SPA, qualquer caminho sem arquivo recebe o `index.html`.

O endereço do site precisa estar na `CORS_ORIGINS` da API, senão o navegador bloqueia as chamadas.
