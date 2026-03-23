#!/bin/bash

# Configurações
IMAGE_NAME="bartolomeusilva/bartnotes"
TAG="v1"

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Iniciando Processo de Deploy: BartNotes ===${NC}"

# 1. Verificar se o arquivo .env existe (necessário para o build do Vite)
if [ ! -f .env ]; then
    echo -e "${RED}Erro: Arquivo .env não encontrado!${NC}"
    echo "O Vite precisa das variáveis de ambiente durante o 'npm run build'."
    exit 1
fi

# 2. Construir a imagem Docker
echo -e "\n${YELLOW}1/3 Construindo imagem Docker...${NC}"
docker build -t ${IMAGE_NAME}:${TAG} .

if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao construir a imagem!${NC}"
    exit 1
fi

# 3. Enviar para o Docker Hub
echo -e "\n${YELLOW}2/3 Enviando para o Docker Hub...${NC}"
docker push ${IMAGE_NAME}:${TAG}

if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao enviar para o Docker Hub!${NC}"
    echo "Certifique-se de estar logado com 'docker login'."
    exit 1
fi

echo -e "\n${GREEN}✔ Imagem enviada com sucesso!${NC}"

# 4. Aviso do Portainer
echo -e "\n${BLUE}==============================================${NC}"
echo -e "${GREEN}3/3 PRONTO PARA ATUALIZAÇÃO NO PORTAINER!${NC}"
echo -e "Agora, siga estes passos no Portainer:"
echo -e "1. Acesse o stack do ${YELLOW}BartNotes${NC}."
echo -e "2. Vá em ${YELLOW}'Editor'${NC}."
echo -e "3. Clique em ${YELLOW}'Update the stack'${NC}."
echo -e "4. Certifique-se de marcar a opção ${YELLOW}'Prune unused services'${NC}"
echo -e "   e ${YELLOW}'Pull latest image'${NC} se estiver usando webhooks."
echo -e "${BLUE}==============================================${NC}"
