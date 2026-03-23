#!/bin/bash

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== BartNotes: Git Upload ===${NC}"

# 1. Verificar se há alterações
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Nada para commitar. O diretório está limpo.${NC}"
    exit 0
fi

# 2. Pedir a descrição do commit
echo -ne "${YELLOW}Digite a descrição do commit: ${NC}"
read commit_message

# Verificar se a mensagem não está vazia
if [ -z "$commit_message" ]; then
    echo -e "${RED}Erro: A descrição do commit não pode ser vazia!${NC}"
    exit 1
fi

# 3. Executar as etapas do Git
echo -e "\n${BLUE}Adicionando arquivos...${NC}"
git add .

echo -e "${BLUE}Criando commit...${NC}"
git commit -m "$commit_message"

echo -e "${BLUE}Enviando para o repositório remoto (push)...${NC}"
git push

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✔ Git Up concluído com sucesso!${NC}"
else
    echo -e "\n${RED}❌ Ocorreu um erro ao fazer o push.${NC}"
    exit 1
fi
