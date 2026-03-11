# Deploy do BartNotes — Docker Hub + Portainer Swarm

## Pré-requisitos

- Docker instalado na máquina local
- Conta no [Docker Hub](https://hub.docker.com) (`bartolomeusilva`)
- Portainer com acesso ao Swarm
- Traefik rodando na rede `public_network`

---

## 1. Build e push da imagem

### 1.1 Login no Docker Hub
```bash
docker login
```

### 1.2 Build da imagem
```bash
cd /caminho/para/BartNotes
docker build -t bartolomeusilva/bartnotes:latest .
```

### 1.3 (Opcional) Tag com versão
```bash
docker tag bartolomeusilva/bartnotes:latest bartolomeusilva/bartnotes:1.0.0
```

### 1.4 Push para o Docker Hub

> **Importante:** o login (passo 1.1) deve ser feito antes do push. Sem ele o comando será rejeitado.

```bash
docker push bartolomeusilva/bartnotes:latest
# se tiver tag de versão:
docker push bartolomeusilva/bartnotes:1.0.0
```

---

## 2. Deploy no Portainer

### 2.1 Acesse o Portainer
Abra o Portainer no browser e vá em:
**Stacks → Add stack**

### 2.2 Cole o conteúdo da stack
Copie o conteúdo do arquivo `docker-compose.yml` e cole no editor do Portainer.

> **Atenção:** Ajuste o domínio na label do Traefik se necessário:
> ```
> traefik.http.routers.bartnotes.rule=Host(`bartnotes.bartolomeusilva.com`)
> ```

### 2.3 Deploy
Clique em **Deploy the stack**.

---

## 3. Atualizar para nova versão

Quando fizer alterações no app, repita o build e push:

```bash
docker build -t bartolomeusilva/bartnotes:latest .
docker push bartolomeusilva/bartnotes:latest
```

No Portainer, vá em **Stacks → bartnotes → Update the stack** e marque **Re-pull image**.

---

## 4. Estrutura dos arquivos Docker

| Arquivo | Função |
|---|---|
| `Dockerfile` | Build multi-stage (Node build → Nginx serve) |
| `nginx.conf` | Config do Nginx com suporte a SPA e cache de assets |
| `docker-compose.yml` | Stack para Docker Swarm com labels do Traefik |
| `.dockerignore` | Exclui arquivos desnecessários da imagem |

---

## Observações

- As variáveis `VITE_*` são embutidas no build. Se mudar o Supabase URL/key, é necessário **rebuild da imagem**.
- A rede `public_network` deve existir no Swarm antes do deploy:
  ```bash
  docker network create --driver overlay --attachable public_network
  ```
