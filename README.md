# ☁️ BartNotes - Premium Note-taking App
BartNotes is a high-performance, aesthetically pleasing note-taking application...

## Stack

- **React 18** + Vite
- **React Router v6** — roteamento
- **Zustand** — estado global
- **Axios** — HTTP client com interceptor de refresh token automático
- **Tailwind CSS** — estilização utility-first
- **date-fns** — formatação de datas em pt-BR
- **lucide-react** — ícones

## Setup rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar VITE_API_URL para apontar para sua API

# 3. Iniciar em desenvolvimento
npm run dev

# 4. Build para produção
npm run build
npm run preview
```

## Estrutura

```
src/
  pages/          → Uma página por rota
  components/
    editor/       → NoteEditor (editor principal)
    layout/       → AppLayout, Sidebar, NoteList
    ui/           → Toast, ConfirmModal
  store/          → Zustand (auth, notes, tags, ui)
  services/       → api.js (axios + interceptors)
  lib/            → utils.js (helpers, markdown parser)
```

## Funcionalidades

- ✅ Autenticação JWT com refresh token automático
- ✅ Editor Markdown com auto-save (debounce 1.5s)
- ✅ Preview Markdown e modo split
- ✅ Busca full-text em tempo real
- ✅ Tags com cores personalizadas
- ✅ Fixar, arquivar, mover para lixeira
- ✅ Histórico de versões (últimas 50)
- ✅ Duplicar notas
- ✅ Tema claro / escuro
- ✅ Layout responsivo (mobile, tablet, desktop)
- ✅ Instalável como PWA

## Deploy (Nginx)

```nginx
server {
  listen 80;
  server_name notes.seudominio.com;
  root /var/www/cloudnotes/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://localhost:3001;
  }
}
```
