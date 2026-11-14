# SOUNDBOX

Player de música no estilo Spotify em **um único arquivo HTML** (CSS e JavaScript embutidos), instalável como PWA. Busca real na API pública do Deezer, favoritos e playlists no `localStorage` — e, para ouvir a **música inteira offline**, importação dos seus próprios arquivos de áudio, guardados no `IndexedDB` do navegador.

> Abra o `index.html` por HTTP/HTTPS para o PWA e o modo offline funcionarem. Abrir direto do disco (`file://`) mostra a interface, mas o navegador bloqueia a busca por CORS, a instalação e o service worker.

## Como rodar

```bash
# qualquer servidor estático serve (o sw.js precisa ser servido junto do index.html)
python3 -m http.server 8000
# depois abra http://localhost:8000
```

Ou publique os dois arquivos em qualquer host estático com HTTPS (GitHub Pages, Netlify, Vercel, Cloudflare Pages…).

## Como ouvir a música inteira

A busca do Deezer entrega apenas a **prévia de 30 s** liberada pela API pública — é o máximo que a API permite, e o SOUNDBOX continua exatamente assim na aba **Buscar**. Para ouvir faixas completas (e sem internet), o app toca **arquivos seus**:

1. Abra **Biblioteca → Minhas músicas → Importar arquivos** (ou **+ Adicionar**).
2. Escolha um ou vários arquivos (MP3, M4A, AAC, OGG, Opus, WAV, FLAC, WebM).
3. A música entra na lista com nome e artista lidos do arquivo (`Artista - Música.mp3`) e a duração real. Toque para ouvir **do começo ao fim**, com barra de progresso e seek.
4. Os arquivos ficam no `IndexedDB` do próprio aparelho: continuam lá ao fechar o app e tocam **offline**. O botão **×** remove a música e apaga o arquivo.

O app foi feito para arquivos que você já possui (CDs digitalizados, downloads legais, gravações próprias). Ele não baixa faixas de serviços de streaming nem contorna DRMs: arquivos protegidos (como `.m4p` da Apple) simplesmente não tocam.

## O que está implementado

| Requisito | Como foi feito |
| --- | --- |
| PWA | `manifest.json` gerado em runtime e servido por **blob URL**, com ícones PNG desenhados em canvas (192/512 px + maskable). Metas de mobile, tema escuro, standalone e `apple-touch-icon`. |
| Offline | `sw.js` real (o único arquivo além do HTML) guarda o app shell em cache: o app **abre sem internet** e as músicas importadas tocam do `IndexedDB`. |
| Instalar app | Botão fixo no topo, dispara `beforeinstallprompt` (`prompt()` + `userChoice`). Sem prompt disponível, abre instruções de instalação por plataforma. Após instalar, fica “Instalado”. |
| Busca | `fetch` real em `api.deezer.com/search` via `corsproxy.io`, disputado em paralelo com proxies alternativos e com o **fallback JSONP** (a API do Deezer suporta `output=jsonp`, que contorna o CORS). |
| Resultado | Capa quadrada, título em 600, artista em cinza, play/pause da prévia de 30 s (`new Audio()`), barra de progresso, coração para salvar e botão “+ Playlist” com dropdown. |
| Playlists | Criação com nome personalizado, adição, remoção, “tocar tudo” (fila com avanço automático) e exclusão. Tudo persistido em `localStorage`. |
| Músicas do dispositivo | Importação de vários arquivos, metadados e duração lidos no aparelho, áudio completo no `IndexedDB`, reprodução com seek, capa padrão, remoção com limpeza do arquivo. |
| Navegação | Abas inferiores **Início · Buscar · Biblioteca**; tela inicial com a busca centralizada e o texto “Busque suas músicas”. |
| Mini player | Fixo acima da barra inferior enquanto houver faixa carregada: capa, título, artista, play/pause e progresso clicável (seek). |

## Detalhes técnicos

- **Sem dependências** além do Google Fonts (Inter). Ícones são caracteres unicode ou desenhados em CSS puro.
- **Paleta estrita:** `#121212` (fundo), `#181818` (cards), `#242424` (inputs), `#FFFFFF`, `#A0A0A0`, `#1DB954` (destaque) e `#1ED760` (hover). Sem gradientes, sem sombras coloridas, sem roxo.
- **Segurança:** todo texto vindo da API entra via `textContent`; capas e prévias passam por validação de URL (`http`/`https`).
- **Acessibilidade:** botões nativos, `aria-label`/`aria-pressed`/`aria-expanded`, `aria-live` no status da busca e nos toasts, foco visível em verde e `prefers-reduced-motion`.
- **Prévias do Deezer:** apenas os 30 s liberados pela API; nenhum arquivo de terceiros é baixado.
- **Uma única `<audio>`** para tudo (prévia remota ou `blob:` local), com fila, avanço automático e Media Session.

### Storage

| O quê | Onde | Por quê |
| --- | --- | --- |
| Salvos e playlists (metadados) | `localStorage`, chave `soundbox.library.v1` | leve e síncrono |
| Arquivos de áudio completos | `IndexedDB` → `soundbox-audio` / `files` | aguenta arquivos grandes e binários |
| App shell (HTML/CSS/JS/manifesto) | Cache API → `soundbox-shell-v2` | abrir o app offline |

Os metadados das músicas locais ficam em `library.local` (só título, artista e duração); o áudio em si nunca vai para o `localStorage`. O espaço disponível é o do navegador — em geral alguns GB. Em navegadores que limpam dados de sites pouco usados (iOS principalmente), o sistema pode apagar os arquivos; o app não tem como impedir isso.

### Sobre o service worker

O service worker é o **único arquivo extra** (`sw.js`), porque a especificação exige um script de mesma origem servido por HTTP(S) — navegadores recusam workers criados a partir de `blob:`/`data:`. Ele usa *cache-first* para o app shell e *network-first* para navegação, com `skipWaiting`/`clients.claim`, e ignora requisições de outras origens (Deezer, Google Fonts). Sem `sw.js` (por exemplo abrindo via `file://`), o app continua funcionando normalmente online — só perde o modo offline.

A instalação **não depende** do service worker: o manifesto em blob URL passa na checagem de instalabilidade do Chromium (HTTPS/localhost + manifesto válido, ícones 192/512, `start_url`, `display: standalone`).

### Configuração da busca

O `corsproxy.io` passou a exigir uma API key (existe plano gratuito para apps no navegador). O app já tenta a URL no formato do enunciado, mas ela só responde com chave.

Para usar sua chave, edite a constante no início do bloco de busca:

```js
const CORSPROXY_KEY = ''; // https://console.corsproxy.io/
```

Sem chave, o app não fica sem busca: ele dispara os proxies alternativos (AllOrigins, CodeTabs) **e** o fallback JSONP em paralelo, e usa a primeira resposta válida. Se todas as rotas falharem (ou se estiver offline), a interface mostra um estado de erro com “Tentar novamente” — e a Biblioteca continua tocando normalmente.

## Estrutura

```
index.html   # aplicação completa (HTML + CSS + JS + PWA)
sw.js        # service worker: app shell offline
```
