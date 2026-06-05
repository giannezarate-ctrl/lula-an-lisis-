import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ociqqbebnaoeslcqyobe.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEnw1AFGDoy0Os4okquasA_IJLWjXqS'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getClient() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getClient()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)

    const { data, error } = await supabase
      .from('etl_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ ok: false, error: error.message, logs: [] }, { status: 500 })
    }

    return NextResponse.json({ ok: true, logs: data || [], total: data?.length || 0 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error desconocido', logs: [] }, { status: 500 })
  }
}

