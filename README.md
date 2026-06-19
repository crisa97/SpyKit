# SpyKit

HTTP debugging, security analysis & REST client — todo en el panel DevTools de Chrome/Edge.

## Instalación

1. Abrí `chrome://extensions`
2. Activá **Modo desarrollador**
3. Click en **Cargar descomprimida**
4. Seleccioná esta carpeta

## Uso

1. Abrí **DevTools** (`F12` o `Ctrl+Shift+I`)
2. Andá al tab **Spy**
3. Todas las requests HTTP aparecen en la tabla
4. Click en cualquier fila para ver detalle
5. Usá los botones de acción para fuzzear, repetir, decodificar, etc.

---

## Features

### 🔍 Request/Response Inspector
- Captura automática via `chrome.devtools.network`
- Tabla con columnas: Clear (×), Pin (☆), Findings (🔍), Method, Time, Size, Type, Status, URL
- Panel de detalle: método, URL, headers request/response, body request/response
- Preview de imágenes inline
- Máximo 1000 requests (LRU)

### 🔎 Search & Filters
- Search con regex en toda la request (URL, headers, body, respuesta)
- Body search con highlight overlay y navegación entre matches
- Filtros por status, método, tipo MIME, dominio, tamaño, tiempo
- Paginación (200 por página)
- Atajos: `Ctrl+F` (search), `Ctrl+Shift+F` (body search)

### 🌐 REST Client
- Métodos: GET, POST, PATCH, PUT, DELETE, OPTIONS, TRACE, CONNECT, HEAD
- Headers y body editables
- Rate limiter: ∞ / 500ms / 1s / 2s
- Environment variables (`{{var}}`)
- Syntax highlighting (JSON/XML/CSS)
- Import cURL
- Editor de query params
- Cancelar request en vuelo
- Indicador de cambios sin guardar
- Atajo: `Ctrl+Enter` (enviar)

### 🔐 Security Analysis
- **Security Headers**: HSTS, XCTO, XFO, CSP, XSS, Referrer-Policy, Permissions-Policy (badges)
- **Info Disclosure**: Server, X-Powered-By, Via, X-Cache, X-Amz-*, X-Varnish, etc.
- **CORS Inspector**: ACAO, Allow-Credentials, Allow-Methods, Allow-Headers
- **Cookie Inspector**: HttpOnly, Secure, SameSite por cookie
- **Secret Detection**: API keys, JWTs, Bearer tokens, AWS keys, GitHub tokens, passwords, OAuth tokens
- **JWT Inspector**: decode automático, algoritmo, expiración, issues
- **Auth Analyzer**: Bearer, Basic, API keys en URL, cookie flags
- **Passive Scanner**: detecta SQLi/XSS/Path Traversal reflejados
- **GraphQL Detection**: badge "GQL" en respuestas GraphQL

### 🔍 Findings
- **Por request**: botón `🔍 Hallazgos` en toolbar — modal con todos los hallazgos agrupados por severidad
- **Global**: botón `🔍 Global` en search bar — escanea todos los requests (hasta 500), agrupa por tipo de hallazgo, muestra ubicaciones únicas, exportable a CSV

### ⚡ Fuzzer
- Posiciones: URL Parameter, JSON Body Key, URL Path
- Payloads: SQLi (14), XSS (8), Path Traversal (5), Directory Search (88+), Subdomain Discovery (110+)
- Same value (concatena al existente)
- Progreso, Stop, Hide 0/404
- Resultados en tabla coloreada
- Doble click en resultado → carga URL en editor
- Export CSV
- Auto-detecta JSON body

### 🎯 Intruder
- Posiciones: URL Parameter, URL Path, Request Body, JSON Body Key, Header Value
- Payloads: SQLi, XSS, Path Traversal, Numbers 0-100, Common Usernames, Common Passwords, Blank/Null, Custom
- Custom payloads: guardar/cargar desde localStorage
- Same value (concatena)
- Ejecución concurrente (1-20 en paralelo)
- Progreso, Stop, Hide 0/404
- Export CSV
- Auto-detecta JSON body y URL param

### 🔁 Repeater
- Repite el request actual N veces (1-50)
- Resultados en vivo: status, size, time, body preview
- Doble click en resultado → carga URL
- Export CSV

### 🔎 Decoder
- Auto-Detect: JWT, Base64, URL, HTML entities, Hex
- Botones manuales: JWT, Base64, URL, Hex
- Output redimensionable
- Auto-fill con el body de la respuesta actual

### 🌐 WebSocket Inspector
- Captura conexiones WebSocket (open, send, message, close, error)
- Historial de mensajes con dirección (↑ sent / ↓ received)
- Conexiones activas/cerradas
- Atajo: `Ctrl+Shift+9`

### 📊 Session Compare
- Snapshots del estado actual de requests
- Compara dos sesiones: Added, Removed, Changed (diff línea por línea)
- Atajo: `Ctrl+Shift+S`

### ↔️ Diff View
- `Ctrl+Click` en dos requests
- Diff palabra por palabra entre cuerpos de respuesta
- Labels con método+URL para A y B

### 🔲 Hex View
- Botón "Hex" en respuesta body (solo para MIME no-texto)
- Modo hexadecimal + ASCII (16 bytes por línea)

### ⛔ Interceptor
- Attach debugger → intercepta requests antes de enviarlas
- Forward/Drop individual o todos
- Edit + Forward: modificar URL, método, headers, body antes de reenviar
- Queue visual con método, URL, tiempo

### 📤 Export
| Formato | Desde | Archivo |
|---------|-------|---------|
| CURL | Copy > CURL | clipboard |
| Python (requests) | Copy > Python | clipboard |
| JavaScript (fetch) | Copy > JS / Export | clipboard / spykit.js |
| Go | Copy > Go | clipboard |
| Rust | Copy > Rust | clipboard |
| PHP | Copy > PHP | clipboard |
| Postman Collection | Export / Botón / Context menu | spykit-collection.json |
| HAR | Export | spykit.har |
| CSV | Export | spykit.csv |
| HTTP (.http) | Export | spykit.http |
| Fuzzer CSV | Fuzzer > Export CSV | fuzzer-results.csv |
| Repeater CSV | Repeater > Export CSV | repeater-results.csv |
| Intruder CSV | Intruder > Export CSV | intruder-results.csv |
| Findings Global | Findings Global > Export CSV | hallazgos-globales.csv |

### ⭐ Pinned / Bookmarks
- Click en ☆ de una fila para marcarla como pinned
- Click en ☆ del header para filtrar solo pinned
- Persiste entre sesiones

### 💾 Collections
- `Ctrl+Shift+S`: guarda requests seleccionadas (click en × para seleccionar)
- Persiste en chrome.storage.local

### 📦 Workspaces
- Guardá/cargá sets completos de requests
- Atajo: `Ctrl+Shift+W`

### 📋 Snippets
- Guardá presets de method + URL + headers + body
- Atajo: `Ctrl+Shift+K`

### 🎭 Mock Responses
- Interceptá URLs con status y body falsos
- Atajo: `Ctrl+Shift+M`

### 🚫 Domain Blocking
- Click derecho > **Block domain**
- Las requests de ese dominio se ocultan

### ⏺ Recording
- Botón ⏺ en search bar
- Captura requests mientras está activo
- Al detener, copia resumen al clipboard
- Atajo: `Ctrl+Shift+R`

### 📐 Viewport Breakpoints
- Mobile (375px), Tablet (768px), Desktop (1024px), Reset
- Atajo: `Ctrl+Shift+V`

### 🎨 Light/Dark Theme
- Botón ☀/☾ en search bar
- Persiste en localStorage

### ↔️ Split Pane
- Layout redimensionable entre tabla de requests y panel de detalle
- Auto-orientación: horizontal (ancho) / vertical (angosto)

### 🔼 Scroll-to-Top
- Flecha flotante al scrollear hacia abajo
- Muestra cantidad de filas scrolleadas

### 🎹 Keyboard Shortcuts

| Atajo | Acción |
|-------|--------|
| `Ctrl+F` | Focus search bar |
| `Ctrl+Shift+F` | Focus body search |
| `Ctrl+Enter` | Send request |
| `Esc` | Cancel / cerrar panels |
| `Ctrl+Click` | Seleccionar para Diff |
| `Ctrl+Shift+S` | Save collection / Session compare |
| `Ctrl+Shift+E` | Toggle env vars |
| `Ctrl+Shift+H` | Toggle history |
| `Ctrl+Shift+K` | Toggle snippets |
| `Ctrl+Shift+M` | Toggle mocks |
| `Ctrl+Shift+W` | Toggle workspaces |
| `Ctrl+Shift+V` | Toggle viewport bar |
| `Ctrl+Shift+R` | Toggle recording |
| `Ctrl+Shift+9` | Toggle WebSocket inspector |
| `?` / `Ctrl+/` | Toggle shortcuts modal |

---

## Tests

```bash
npm test
```

41 tests unitarios en 5 archivos: utils, jwt, auth, scanner, websocket.

---

## Tech Stack

- TypeScript (~43 módulos)
- Vite (IIFE bundle)
- jQuery 1.11 + Bootstrap 3
- Split.js, autosize.js, pretty-data.js
- Chrome DevTools API (`chrome.devtools.network`, `chrome.devtools.inspectedWindow`, `chrome.debugger`)
- Manifest V3

## Estructura del proyecto

```
src/
├── core/        # Utilidades, storage, state
├── ui/          # Panel, filters, body-search, theme, diff, hex, splitter, etc.
├── rest/        # REST client, fuzzer, intruder, repeater, decoder, findings-dialog, export
├── network/     # Captura HTTP, WebSocket
├── security/    # Findings, secrets, jwt, auth, headers, cors, cookies, scanner, graphql
├── interceptor/ # Request interception vía chrome.debugger
└── types/       # TypeScript definitions
```
