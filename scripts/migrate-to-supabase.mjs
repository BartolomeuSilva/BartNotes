#!/usr/bin/env node
/**
 * Migrate BartNotes data from PostgreSQL + MinIO to Supabase
 *
 * Requires:
 *   - DATABASE_URL: source PostgreSQL connection string
 *   - SUPABASE_URL: https://xxx.supabase.co
 *   - SUPABASE_SERVICE_ROLE_KEY: service role key (for admin operations)
 *   - Optional: MINIO_* for attachment migration
 *
 * Run: node scripts/migrate-to-supabase.mjs
 */

import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import * as dotenv from 'dotenv'

dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const tempPasswords = []

function tempPassword() {
  return randomBytes(16).toString('hex')
}

async function migrate() {
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  console.log('Migrating users to Supabase Auth...')
  const usersRes = await client.query('SELECT id, email, username, password_hash, avatar_url FROM users WHERE is_active = true')
  const users = usersRes.rows

  for (const u of users) {
    try {
      const tempPw = tempPassword()
      const { data, error } = await supabase.auth.admin.createUser({
        id: u.id,
        email: u.email,
        password: tempPw,
        email_confirm: true
      })
      if (error) {
        if (error.message?.includes('already been registered')) {
          console.log(`  User ${u.email} already exists in Supabase, skipping`)
        } else {
          console.error(`  Error creating user ${u.email}:`, error.message)
        }
        continue
      }
      tempPasswords.push({ email: u.email, username: u.username, password: tempPw })
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: u.id,
        username: u.username,
        avatar_url: u.avatar_url,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      if (profErr) console.warn(`  Profile upsert for ${u.email}:`, profErr.message)
    } catch (e) {
      console.error(`  Failed ${u.email}:`, e.message)
    }
  }

  console.log('Migrating tags...')
  const tagsRes = await client.query('SELECT id, user_id, name, color, created_at FROM tags')
  for (const t of tagsRes.rows) {
    const { error } = await supabase.from('tags').insert({
      id: t.id,
      user_id: t.user_id,
      name: t.name,
      color: t.color,
      created_at: t.created_at
    })
    if (error && !error.message?.includes('duplicate')) {
      console.error('  Tag error:', t.id, error.message)
    }
  }

  console.log('Migrating notes...')
  const notesRes = await client.query(`
    SELECT id, user_id, title, content, is_pinned, is_archived, is_deleted, deleted_at, word_count, created_at, updated_at
    FROM notes
  `)
  for (const n of notesRes.rows) {
    const { error } = await supabase.from('notes').insert({
      id: n.id,
      user_id: n.user_id,
      title: n.title,
      content: n.content,
      is_pinned: n.is_pinned,
      is_archived: n.is_archived,
      is_deleted: n.is_deleted,
      deleted_at: n.deleted_at,
      word_count: n.word_count,
      created_at: n.created_at,
      updated_at: n.updated_at
    })
    if (error && !error.message?.includes('duplicate')) {
      console.error('  Note error:', n.id, error.message)
    }
  }

  console.log('Migrating note_tags (junction)...')
  const junctionTable = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND (table_name = '_NoteToTag' OR table_name = 'note_tags')
  `)
  let noteTagsRows = []
  if (junctionTable.rows.length) {
    const tname = junctionTable.rows[0].table_name
    if (tname === '_NoteToTag') {
      const r = await client.query('SELECT "A" as note_id, "B" as tag_id FROM "_NoteToTag"')
      noteTagsRows = r.rows
    } else {
      const r = await client.query('SELECT note_id, tag_id FROM note_tags')
      noteTagsRows = r.rows
    }
  }
  for (const nt of noteTagsRows) {
    const { error } = await supabase.from('note_tags').insert({
      note_id: nt.note_id,
      tag_id: nt.tag_id
    })
    if (error && !error.message?.includes('duplicate')) {
      console.error('  note_tags error:', error.message)
    }
  }

  console.log('Migrating note_versions...')
  const versionsRes = await client.query('SELECT id, note_id, content, version_number, created_at FROM note_versions')
  for (const v of versionsRes.rows) {
    const { error } = await supabase.from('note_versions').insert({
      id: v.id,
      note_id: v.note_id,
      content: v.content,
      version_number: v.version_number,
      created_at: v.created_at
    })
    if (error && !error.message?.includes('duplicate')) {
      console.error('  Version error:', error.message)
    }
  }

  console.log('Attachments: skipping file migration (requires MinIO config). Run manual sync if needed.')

  await client.end()

  if (tempPasswords.length) {
    console.log('\n--- New users created with temporary passwords (change on first login) ---')
    tempPasswords.forEach(({ email, username, password }) => {
      console.log(`${email} (${username}): ${password}`)
    })
    console.log('Save these and share securely with users.')
  }

  console.log('\nMigration complete.')
}

migrate().catch(e => {
  console.error(e)
  process.exit(1)
})
