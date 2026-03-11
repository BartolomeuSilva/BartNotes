# Supabase Setup

## 1. Run the schema migration

Execute `migrations/001_initial_schema.sql` in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):

1. Open your project in Supabase Dashboard
2. Go to SQL Editor
3. Paste the contents of `001_initial_schema.sql`
4. Run the script

**Note:** If the trigger on `auth.users` fails (some projects restrict it), remove those lines. The app creates profiles on signup via `profiles.upsert`.

## 2. Configure environment variables

Copy `.env.example` to `.env` and set:

```
VITE_SUPABASE_URL=https://kligonzoyueaksitwymt.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Get the Anon Key from Supabase Dashboard → Settings → API.
