
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

async function main() {
    const email = 'contato@bartolomeusilva.com'
    const notesDir = path.join(__dirname, '../notes')

    try {
        // 1. Localizar o usuário
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            console.error(`Status: Usuário não encontrado para o email: ${email}`)
            return
        }

        console.log(`Status: Usuário encontrado: ${user.username} (${user.id})`)

        // 2. Ler os arquivos da pasta notes
        if (!fs.existsSync(notesDir)) {
            console.error(`Status: Pasta 'notes' não encontrada em: ${notesDir}`)
            return
        }

        const files = fs.readdirSync(notesDir)
        console.log(`Status: Encontrados ${files.length} arquivos/diretórios em 'notes'`)

        let successCount = 0
        let errorCount = 0

        for (const file of files) {
            const filePath = path.join(notesDir, file)
            const stats = fs.statSync(filePath)

            if (stats.isFile() && file.endsWith('.txt')) {
                try {
                    const title = path.parse(file).name
                    const content = fs.readFileSync(filePath, 'utf-8')
                    const wordCount = content.trim().split(/\s+/).length

                    await prisma.note.create({
                        data: {
                            user_id: user.id,
                            title: title,
                            content: content,
                            word_count: wordCount,
                            is_pinned: false,
                            is_archived: false,
                            is_deleted: false,
                        }
                    })

                    successCount++
                    if (successCount % 50 === 0) {
                        console.log(`Progresso: ${successCount} notas importadas...`)
                    }
                } catch (err) {
                    console.error(`Erro ao importar arquivo ${file}:`, err.message)
                    errorCount++
                }
            }
        }

        console.log(`--- FIM DA IMPORTAÇÃO ---`)
        console.log(`Sucesso: ${successCount}`)
        console.log(`Erros: ${errorCount}`)

    } catch (err) {
        console.error('Erro fatal durante a migração:', err)
    } finally {
        await prisma.$disconnect()
    }
}

main()
