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

---

## Features

### 🔍 Request/Response Inspector
- Tabla con método, URL, status, tipo, tamaño, tiempo
- Search con regex (busca en headers, body, respuesta)
- Body search (solo en cuerpos request/response)
- Highlight de matches con overlay visual
- Auto-scroll al primer match
- Filtros por status, método, tipo, tamaño, tiempo
- Sort por columnas
- Paginación (200 requests por página)

### 🔐 Security Analysis
- **Security Headers**: detecta HSTS, X-Content-Type-Options, X-Frame-Options, CSP, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **CORS Inspector**: analiza Access-Control-Allow-Origin, Allow-Credentials, Allow-Methods, Allow-Headers
- **Cookie Inspector**: tabla con HttpOnly, Secure, SameSite
- **Secret Detection**: encuentra API keys, JWTs, Bearer tokens, AWS keys, GitHub tokens, passwords
- **GraphQL Detection**: detecta queries/mutations en respuestas

### 🌐 REST Client
- Métodos: GET, POST, PATCH, PUT, DELETE, HEAD, OPTIONS
- Headers y body editables
- Editor visual de query params (tabla key=value)
- Rate limiter (∞/500ms/1s/2s) al lado del botón Send
- Environment variables (`{{var}}` reemplazadas automáticamente)
- Syntax highlighting (JSON/XML) en respuesta
- Preview toggle para respuesta

### 📤 Export
| Formato | Botón | Archivo |
|---|---|---|
| cURL | Copy > cURL | — (clipboard) |
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

### ⭐ Pinned / Bookmarks
- Click en ☆ de una fila para marcarla
- Click en ☆ del header para filtrar solo marcadas
- Persiste entre sesiones (localStorage)
- Doble click en × para pin/unpin también

### 💾 Collections
- `Ctrl+Shift+S`: guardá requests seleccionadas (click en × para seleccionar)
- Se guardan en chrome.storage.local
- Persisten entre sesiones

### 📦 Workspaces
- `Ctrl+Shift+W`: abrí el panel de workspaces
- Guardá/cargá sets de requests
- Útil para organizar proyectos

### 📋 Snippets
- `Ctrl+Shift+K`: panel de snippets para REST Client
- Guardá presets de URL + headers + body
- Reutilizables con un click

### 🎭 Mock Responses
- `Ctrl+Shift+M`: panel de mocks
- Interceptá URLs con status y body falsos
- Ideal para testing sin backend

### 🚫 Domain Blocking
- Click derecho en una fila > **Block domain**
- Las requests de ese dominio se ocultan
- Configurable desde localStorage

### ⏺ Recording
- Botón ⏺ en la search bar
- `Ctrl+Shift+R` para toggle
- Captura todas las requests mientras está activo
- Al detener, copia el resumen al clipboard

### 📐 Viewport Breakpoints
- `Ctrl+Shift+V`: muestra barra de viewports
- Mobile (375px), Tablet (768px), Desktop (100%)
- Cambia el tamaño del panel al toque

### ↔️ Diff View
- `Ctrl+Click` en dos requests
- Muestra diff palabra por palabra entre respuestas
- Resaltado de líneas agregadas/eliminadas

### 🔲 Hex View
- Botón "Hex" en respuesta body
- Muestra el contenido en hexadecimal + ASCII

### 🎨 Light/Dark Theme
- Botón ☀/☾ en la toolbar
- Persiste en localStorage
- Cubre todos los elementos UI

### 🎯 Otros
- **Unsaved changes indicator**: punto naranja si cambiás algo en REST Client
- **Collapsible sections**: headers y body labels colapsables con ±
- **Tooltips**: en badges de seguridad, CORS, cookies
- **Context menu**: click derecho en fila → Reenviar, Copy cURL, Copy URL, Open in browser, Block domain, Export to Postman
- **Pin column**: doble click en × para pin, persiste
- **Import cURL**: botón para pegar un curl y llenar URL/headers/body
- **Waterfall timings** ~~eliminado~~

---

## Atajos de Teclado

| Atajo | Acción |
|---|---|
| `Ctrl+F` | Focus search bar |
| `Ctrl+Shift+F` | Focus body search |
| `Ctrl+Enter` | Send REST request |
| `Esc` | Cerrar panels/modal |
| `Ctrl+Click` | Seleccionar para Diff |
| `Ctrl+Shift+S` | Save collection |
| `Ctrl+Shift+E` | Toggle env vars panel |
| `Ctrl+Shift+H` | Toggle history panel |
| `Ctrl+Shift+W` | Toggle workspaces |
| `Ctrl+Shift+K` | Toggle snippets |
| `Ctrl+Shift+M` | Toggle mocks |
| `Ctrl+Shift+R` | Toggle recording |
| `Ctrl+Shift+V` | Toggle viewport bar |

---

## Tests

```bash
node tests/main.js
```

14 tests unitarios: parseCurl, formatSize, scanForSecrets, toHexDump, escapeHtml.


