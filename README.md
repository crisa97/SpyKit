# SpyKit

HTTP debugging, security analysis & REST client — todo en el panel DevTools de Chrome.

## Instalación

1. Abrí `chrome://extensions`
2. Activá **Modo desarrollador** (esquina superior derecha)
3. Click en **Cargar descomprimida**
4. Seleccioná esta carpeta

## Uso

1. Abrí **Chrome DevTools** (`F12` o `Ctrl+Shift+I`)
2. Andá al tab **Spy**
3. Todas las requests HTTP de la página aparecen en la tabla
4. Click en cualquier fila para ver detalle (URL, headers, body, respuesta)
5. Usá los botones de acción para fuzzear, repetir, decodificar, etc.

---

## Features

### 🔍 Request/Response Inspector
- Tabla con método, URL, status, tipo, tamaño, tiempo
- Search con regex (busca en headers, body, respuesta)
- Body search (solo en cuerpos request/response) con highlight y overlay
- Auto-scroll al primer match
- Filtros por status, método, tipo, tamaño, tiempo
- Paginación (200 requests por página)

### 🔐 Security Analysis
- **Security Headers**: HSTS, X-Content-Type-Options, X-Frame-Options, CSP, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **CORS Inspector**: Access-Control-Allow-Origin, Allow-Credentials, Allow-Methods, Allow-Headers
- **Cookie Inspector**: HttpOnly, Secure, SameSite
- **Secret Detection**: API keys, JWTs, Bearer tokens, AWS keys, GitHub tokens, passwords
- **JWT Inspector**: decode automático, análisis de algoritmo (none, HS256, etc.), expiración
- **Auth Analyzer**: Bearer, Basic, cookies flags, API keys en URL
- **Passive Reflection Scanner**: detecta SQLi/XSS/Path Traversal reflejados en respuestas

### 🌐 REST Client
- Métodos: GET, POST, PATCH, PUT, DELETE, HEAD, OPTIONS
- Headers y body editables
- Rate limiter (∞/500ms/1s/2s)
- Environment variables (`{{var}}`)
- Syntax highlighting (JSON/XML)
- Preview toggle

### ⚡ Fuzzer
- **Botón ⚡ Fuzz** en URL actions
- **Posiciones**: URL Parameter | JSON Body Key
- **Same value** checkbox (payload se concatena al valor existente)
- Payloads: SQL Injection (14), XSS (8), Path Traversal (5)
- Barra de progreso + resultados en tabla coloreada
- **Export CSV** de resultados
- Auto-detecta JSON body → usa JSON Body Key automáticamente
- Doble click en fila → carga URL en editor

### 🔁 Repeater
- **Botón 🔄 Repeat** en URL actions
- Repite N veces (1–50) el request actual
- Resultados: status, size, time, preview
- **Export CSV** de resultados
- **Clear** para limpiar resultados

### 🎯 Intruder
- **Botón 🎯 Intruder** en URL actions
- **Posiciones**: URL Parameter | URL Path | Request Body | JSON Body Key | Header Value
- **Payloads predefinidos**: SQLi, XSS, Path Traversal, Numbers 0-100, Common Usernames, Common Passwords, Blank/Null
- **Custom payloads**: guardar/cargar desde localStorage
- **Same value** checkbox (payload se concatena al valor existente)
- **Ejecución concurrente** (default 5 en paralelo)
- Barra de progreso con % y barra animada
- **Export CSV** de resultados
- Auto-detecta JSON body → usa JSON Body Key automáticamente

### 🔎 Decoder
- **Botón 🔍 Decode** en URL actions
- Auto-Detect: Base64, URL, HTML entities, Hex, JWT
- Botones manuales: JWT, Base64, URL, Hex
- Output redimensionable para valores grandes
- Mismo formato preservado

### 🌐 WebSocket Inspector
- **Botón 🌐 WS** en search bar
- Captura conexiones WebSocket (open, send, message, close, error)
- Muestra historial de mensajes con dirección (↑ sent / ↓ received)
- Conexiones activas/cerradas
- Atajo: `Ctrl+Shift+9`

### 📊 Session Compare
- **Botón ≠ Sessions** en search bar
- Toma snapshots del estado actual de requests
- Compara dos sesiones: Added (verde), Removed (rojo), Changed (diff línea por línea)
- Atajo: `Ctrl+Shift+S`

### 📤 Export
| Formato | Botón | Archivo |
|---|---|---|
| CURL | Copy > CURL | — (clipboard) |
| Python (requests) | Copy > Python | — |
| JavaScript (fetch) | Copy > JS | — |
| Go | Copy > Go | — |
| Rust | Copy > Rust | — |
| PHP | Copy > PHP | — |
| HAR | Export > HAR | spykit.har |
| Postman Collection | Export > Postman | spykit-collection.json |
| CSV | Export > CSV | spykit.csv |
| HTTP (.http) | Export > HTTP | spykit.http |
| Snippet generator | Panel Snippets | — |
| Fuzzer CSV | Fuzzer > Export CSV | fuzzer-results.csv |
| Repeater CSV | Repeater > Export CSV | repeater-results.csv |
| Intruder CSV | Intruder > Export CSV | intruder-results.csv |

### ⭐ Pinned / Bookmarks
- Click en ☆ de una fila para marcarla
- Click en ☆ del header para filtrar solo marcadas
- Persiste entre sesiones (localStorage)
- Doble click en × para pin/unpin

### 💾 Collections
- `Ctrl+Shift+S`: guardá requests seleccionadas (click en × para seleccionar)
- Persisten en chrome.storage.local

### 📦 Workspaces
- `Ctrl+Shift+W`: panel de workspaces
- Guardá/cargá sets de requests

### 📋 Snippets
- `Ctrl+Shift+K`: panel de snippets
- Guardá presets de URL + headers + body

### 🎭 Mock Responses
- `Ctrl+Shift+M`: panel de mocks
- Interceptá URLs con status y body falsos

### 🚫 Domain Blocking
- Click derecho > **Block domain**
- Las requests de ese dominio se ocultan

### ⏺ Recording
- Botón ⏺ en search bar, `Ctrl+Shift+R`
- Captura requests mientras está activo
- Al detener, copia resumen al clipboard

### 📐 Viewport Breakpoints
- `Ctrl+Shift+V`: barra de viewports
- Mobile (375px), Tablet (768px), Desktop

### ↔️ Diff View
- `Ctrl+Click` en dos requests
- Diff palabra por palabra entre respuestas

### 🔲 Hex View
- Botón "Hex" en respuesta body
- Modo hexadecimal + ASCII

### 🎨 Light/Dark Theme
- Botón ☀/☾ en toolbar
- Persiste en localStorage

---

## Atajos de Teclado

| Atajo | Acción |
|---|---|
| `Ctrl+F` | Focus search bar |
| `Ctrl+Shift+F` | Focus body search |
| `Ctrl+Enter` | Send REST request |
| `Esc` | Cerrar panels/modal |
| `Ctrl+Click` | Seleccionar para Diff |
| `Ctrl+Shift+S` | Save collection **/ Session compare** |
| `Ctrl+Shift+E` | Toggle env vars panel |
| `Ctrl+Shift+H` | Toggle history panel |
| `Ctrl+Shift+W` | Toggle workspaces |
| `Ctrl+Shift+K` | Toggle snippets |
| `Ctrl+Shift+M` | Toggle mocks |
| `Ctrl+Shift+R` | Toggle recording |
| `Ctrl+Shift+V` | Toggle viewport bar |
| `Ctrl+Shift+9` | Toggle WebSocket inspector |
| `?` | Toggle shortcuts modal |

---

## Tests

```bash
npm test
```

41 tests unitarios en 5 archivos: utils, jwt, auth, scanner, websocket.

---

## Tech Stack

- TypeScript (~35 módulos)
- Vite (IIFE bundle)
- jQuery 1.11 + Bootstrap
- Split.js, autosize.js, pretty-data.js
- Chrome DevTools API (`chrome.devtools.network`, `chrome.devtools.inspectedWindow`)
- Manifest V3
