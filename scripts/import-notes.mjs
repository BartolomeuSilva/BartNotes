#!/usr/bin/env node
/**
 * Import notes from notes/source/notes.json into Supabase
 * Uses email/password auth (no service role key needed)
 *
 * Usage:
 *   EMAIL=seu@email.com PASSWORD=suasenha node scripts/import-notes.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://kligonzoyueaksitwymt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaWdvbnpveXVlYWtzaXR3eW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODk2MjcsImV4cCI6MjA4ODY2NTYyN30.iz7Y_hj6DKZG0MKUmR1j3RM8XEEBCcKIgYMohTJQ-TA'

const EMAIL = process.env.EMAIL
const PASSWORD = process.env.PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('Uso: EMAIL=seu@email.com PASSWORD=suasenha node scripts/import-notes.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function extractTitle(content) {
  if (!content) return 'Nota sem título'
  const lines = content.split('\n')
  for (const line of lines) {
    const text = line.replace(/^[#\s\r]+/, '').trim()
    if (text) return text.substring(0, 200)
  }
  return 'Nota sem título'
}

function countWords(content) {
  if (!content) return 0
  return content.split(/\s+/).filter(w => w.length > 0).length
}

// Convert hex id to UUID format if needed
function toUuid(id) {
  if (!id) return undefined
  if (id.includes('-')) return id // already UUID
  // Convert 32-char hex to UUID format
  if (/^[0-9a-f]{32}$/i.test(id)) {
    return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`
  }
  return undefined // let DB generate
}

async function run() {
  // Authenticate (try login first, register if not found)
  console.log(`Autenticando como ${EMAIL}...`)
  let authData
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (loginErr) {
    console.log(`Conta não encontrada, criando conta...`)
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: EMAIL,
      password: PASSWORD,
      options: { data: { username: 'bartolomeu', full_name: 'Bartolomeu Silva' } }
    })
    if (signUpErr) { console.error('Erro ao criar conta:', signUpErr.message); process.exit(1) }
    if (!signUpData.session) {
      console.error('Confirme o e-mail primeiro e rode novamente.')
      process.exit(1)
    }
    authData = signUpData
    console.log('Conta criada com sucesso!')
  } else {
    authData = loginData
  }
  const userId = authData.user.id
  console.log(`Autenticado! User ID: ${userId}`)

  // Load notes
  const jsonPath = join(__dir, '../notes/source/notes.json')
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const activeNotes = raw.activeNotes || []
  const trashedNotes = raw.trashedNotes || []

  console.log(`\nCarregando ${activeNotes.length} notas ativas e ${trashedNotes.length} na lixeira...`)

  // Check existing notes count
  const { count: existing } = await supabase
    .from('notes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  console.log(`Notas já existentes no Supabase: ${existing}`)

  let inserted = 0
  let skipped = 0
  let errors = 0

  async function insertNote(n, isDeleted) {
    const uuid = toUuid(n.id)
    const row = {
      user_id: userId,
      title: extractTitle(n.content),
      content: n.content || '',
      is_pinned: false,
      is_archived: false,
      is_deleted: isDeleted,
      deleted_at: isDeleted ? (n.lastModified || new Date().toISOString()) : null,
      word_count: countWords(n.content),
      created_at: n.creationDate || new Date().toISOString(),
      updated_at: n.lastModified || new Date().toISOString(),
    }
    if (uuid) row.id = uuid

    const { error } = await supabase.from('notes').insert(row)
    if (error) {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        skipped++
      } else {
        errors++
        console.error(`  Erro (${n.id}): ${error.message}`)
      }
    } else {
      inserted++
    }
  }

  // Insert in batches of 50
  const BATCH = 50
  const allNotes = [
    ...activeNotes.map(n => ({ n, isDeleted: false })),
    ...trashedNotes.map(n => ({ n, isDeleted: true })),
  ]

  for (let i = 0; i < allNotes.length; i += BATCH) {
    const batch = allNotes.slice(i, i + BATCH)
    await Promise.all(batch.map(({ n, isDeleted }) => insertNote(n, isDeleted)))
    process.stdout.write(`\r  Progresso: ${Math.min(i + BATCH, allNotes.length)}/${allNotes.length}`)
  }

  console.log(`\n\nConcluído!`)
  console.log(`  Inseridas: ${inserted}`)
  console.log(`  Já existiam (ignoradas): ${skipped}`)
  console.log(`  Erros: ${errors}`)
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
