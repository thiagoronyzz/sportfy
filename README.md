# SOUNDBOX

Player de prévias de 30 segundos no estilo Spotify, em **um único arquivo HTML** (CSS e JavaScript embutidos), instalável como PWA. Busca real na API pública do Deezer, favoritos e playlists salvas no `localStorage`.

> Abra o `index.html` por HTTP/HTTPS para o PWA funcionar. Abrir direto do disco (`file://`) mostra a interface, mas o navegador bloqueia a busca por CORS e a instalação.

## Como rodar

```bash
# qualquer servidor estático serve
python3 -m http.server 8000
# depois abra http://localhost:8000
```

Ou publique o `index.html` em qualquer host estático com HTTPS (GitHub Pages, Netlify, Vercel, Cloudflare Pages…).

## O que está implementado

| Requisito | Como foi feito |
| --- | --- |
| PWA | `manifest.json` gerado em runtime e servido por **blob URL**, com ícones PNG desenhados em canvas (192/512 px + maskable). Metas de mobile, tema escuro, standalone e `apple-touch-icon`. |
| Service worker | Código-fonte **inline**, registrado a partir de uma **blob URL**, com estratégia cache-first para o shell e network-first para a API. |
| Instalar app | Botão fixo no topo, dispara `beforeinstallprompt` (`prompt()` + `userChoice`). Sem prompt disponível, abre instruções de instalação por plataforma. Após instalar, fica “Instalado”. |
| Busca | `fetch` real em `api.deezer.com/search` via `corsproxy.io`, disputado em paralelo com proxies alternativos e com o **fallback JSONP** (a API do Deezer suporta `output=jsonp`, que contorna o CORS). |
| Resultado | Capa quadrada, título em 600, artista em cinza, play/pause da prévia (`new Audio()`), barra de progresso, coração para salvar e botão “+ Playlist” com dropdown. |
| Playlists | Criação com nome personalizado, adição, remoção, “tocar tudo” (fila com avanço automático) e exclusão. Tudo persistido em `localStorage` (título, artista, capa, URL da prévia). |
| Navegação | Abas inferiores **Início · Buscar · Biblioteca**; tela inicial com a busca centralizada e o texto “Busque suas músicas”. |
| Mini player | Fixo acima da barra inferior enquanto houver faixa carregada: capa, título, artista, play/pause e progresso clicável (seek). |

## Detalhes técnicos

- **Sem dependências** além do Google Fonts (Inter). Ícones são caracteres unicode ou desenhados em CSS puro.
- **Paleta estrita:** `#121212` (fundo), `#181818` (cards), `#242424` (inputs), `#FFFFFF`, `#A0A0A0`, `#1DB954` (destaque) e `#1ED760` (hover). Sem gradientes, sem sombras coloridas, sem roxo.
- **Segurança:** todo texto vindo da API entra via `textContent`; capas e prévias passam por validação de URL (`http`/`https`).
- **Acessibilidade:** botões nativos, `aria-label`/`aria-pressed`/`aria-expanded`, `aria-live` no status da busca e nos toasts, foco visível em verde e `prefers-reduced-motion`.
- **Preview do Deezer:** apenas os 30 s de prévia são reproduzidos; nenhum arquivo é baixado para o dispositivo.

### Sobre o service worker em blob URL

O código do service worker é realmente criado inline e registrado via `URL.createObjectURL(...)`, como pedido. Navegadores Chromium/Firefox **recusam** registrar um worker cujo script venha de `blob:` (ou `data:`) — a especificação exige um script do mesmo origin em HTTP(S). O app trata isso silenciosamente (log informativo no console) e continua funcionando 100% online. Para ganhar offline real seria necessário um `sw.js` ao lado do HTML, e o requisito era arquivo único.

A instalação **não depende** do service worker: o manifesto em blob URL passa na checagem de instalabilidade do Chromium (HTTPS/localhost + manifesto válido, ícones 192/512, `start_url`, `display: standalone`).

### Configuração da busca

O `corsproxy.io` passou a exigir uma API key (existe plano gratuito para apps no navegador). O app já tenta a URL no formato do enunciado, mas ela só responde com chave.

Para usar sua chave, edite a constante no início do bloco de busca:

```js
const CORSPROXY_KEY = ''; // https://console.corsproxy.io/
```

Sem chave, o app não fica sem busca: ele dispara os proxies alternativos (AllOrigins, CodeTabs) **e** o fallback JSONP em paralelo, e usa a primeira resposta válida. Se absolutamente todas as rotas falharem (rede bloqueando os domínios), a interface mostra um estado de erro com “Tentar novamente”.

## Estrutura

```
index.html   # aplicação completa (HTML + CSS + JS + PWA)
```
