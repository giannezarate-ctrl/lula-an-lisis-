import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ociqqbebnaoeslcqyobe.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEnw1AFGDoy0Os4okquasA_IJLWjXqS'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getClient() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function calcularIMC(peso: number, altura: number): number {
  const alturaM = altura / 100
  return Math.round((peso / (alturaM * alturaM)) * 100) / 100
}

function clasificarIMC(imc: number): string {
  if (imc < 18.5) return 'Bajo peso'
  if (imc < 25) return 'Normal'
  if (imc < 30) return 'Sobrepeso'
  if (imc < 35) return 'Obesidad Grado I'
  if (imc < 40) return 'Obesidad Grado II'
  return 'Obesidad Grado III'
}

function calcularRiesgo(p: any): string {
  let score = 0
  if (p.edad > 60) score += 3
  else if (p.edad > 45) score += 2
  else if (p.edad > 30) score += 1

  const imc = calcularIMC(p.peso, p.altura)
  if (imc >= 40) score += 4
  else if (imc >= 35) score += 3
  else if (imc >= 30) score += 2
  else if (imc >= 25) score += 1

  if (p.presion_sistolica >= 180) score += 4
  else if (p.presion_sistolica >= 160) score += 3
  else if (p.presion_sistolica >= 140) score += 2
  else if (p.presion_sistolica >= 130) score += 1
  if (p.presion_diastolica >= 120) score += 3
  else if (p.presion_diastolica >= 90) score += 2
  else if (p.presion_diastolica >= 80) score += 1

  if (p.glucosa > 300) score += 4
  else if (p.glucosa > 200) score += 3
  else if (p.glucosa > 140) score += 2
  else if (p.glucosa > 100) score += 1

  if (p.colesterol > 300) score += 3
  else if (p.colesterol > 240) score += 2
  else if (p.colesterol > 200) score += 1

  if (p.frecuencia_cardiaca > 120 || p.frecuencia_cardiaca < 50) score += 3
  else if (p.frecuencia_cardiaca > 100 || p.frecuencia_cardiaca < 60) score += 1

  if (p.saturacion_oxigeno < 85) score += 4
  else if (p.saturacion_oxigeno < 90) score += 3
  else if (p.saturacion_oxigeno < 95) score += 1

  if (p.temperatura > 39 || p.temperatura < 35) score += 3
  else if (p.temperatura > 38) score += 1

  if (p.antecedentes_familiares) score += 2
  if (p.fumador) score += 3
  if (p.consumo_alcohol) score += 2
  if (p.actividad_fisica === 'sedentario') score += 2
  if (p.actividad_fisica === 'activa') score -= 1

  if (score >= 15) return 'Critico'
  if (score >= 10) return 'Alto'
  if (score >= 5) return 'Medio'
  return 'Bajo'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, paciente } = body

    if (!paciente) {
      return NextResponse.json({ ok: false, error: 'Datos de paciente inválidos' }, { status: 400 })
    }

    if (action !== 'update' && (!paciente.id_paciente || paciente.id_paciente <= 0)) {
      const client = getClient()
      const { data: maxRow } = await client
        .from('pacientes')
        .select('id_paciente')
        .order('id_paciente', { ascending: false })
        .limit(1)
      const nextId = (maxRow?.[0]?.id_paciente || 1000) + 1
      paciente.id_paciente = nextId
    }

    if (!paciente.id_paciente || paciente.id_paciente <= 0) {
      return NextResponse.json({ ok: false, error: 'ID de paciente requerido' }, { status: 400 })
    }

    const imc = calcularIMC(paciente.peso, paciente.altura)
    const record = {
      id_paciente: paciente.id_paciente,
      nombres: String(paciente.nombres || '').trim(),
      apellidos: String(paciente.apellidos || '').trim(),
      edad: parseInt(paciente.edad),
      sexo: paciente.sexo,
      peso: parseFloat(paciente.peso),
      altura: parseFloat(paciente.altura),
      imc,
      clasificacion_imc: clasificarIMC(imc),
      presion_sistolica: parseInt(paciente.presion_sistolica),
      presion_diastolica: parseInt(paciente.presion_diastolica),
      frecuencia_cardiaca: parseInt(paciente.frecuencia_cardiaca),
      glucosa: parseFloat(paciente.glucosa),
      colesterol: parseFloat(paciente.colesterol),
      saturacion_oxigeno: parseFloat(paciente.saturacion_oxigeno),
      temperatura: parseFloat(paciente.temperatura),
      antecedentes_familiares: !!paciente.antecedentes_familiares,
      fumador: !!paciente.fumador,
      consumo_alcohol: !!paciente.consumo_alcohol,
      actividad_fisica: paciente.actividad_fisica,
      diagnostico_preliminar: String(paciente.diagnostico_preliminar || 'Sin diagnóstico').trim(),
      riesgo_enfermedad: calcularRiesgo(paciente),
      fecha_consulta: paciente.fecha_consulta || new Date().toISOString().split('T')[0],
    }

    const supabase = getClient()

    if (action === 'update') {
      const { error } = await supabase.from('pacientes').update(record).eq('id_paciente', record.id_paciente)
      if (error) {
        if (error.message.includes('row-level security')) {
          return NextResponse.json({
            ok: false,
            error: 'RLS_BLOQUEANDO',
            mensaje: 'Las políticas de seguridad de Supabase están bloqueando la operación. Ejecuta el SQL de configuración.',
            sql: 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;',
          }, { status: 403 })
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, mensaje: 'Paciente actualizado correctamente' })
    }

    const { error } = await supabase.from('pacientes').upsert(record, { onConflict: 'id_paciente' })
    if (error) {
      if (error.message.includes('row-level security')) {
        return NextResponse.json({
          ok: false,
          error: 'RLS_BLOQUEANDO',
          mensaje: 'Las políticas de seguridad de Supabase están bloqueando la operación. Ejecuta el SQL de configuración.',
          sql: 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;',
        }, { status: 403 })
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, mensaje: 'Paciente guardado correctamente' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const scope = searchParams.get('scope')
    const supabase = getClient()

    if (scope === 'test' || scope === 'all') {
      const filter = scope === 'all'
        ? `id_paciente.gt.0`
        : `nombres.eq.Sin nombre,apellidos.eq.Sin apellido,id_paciente.gte.9000`
      const { data: testRows, error: selErr } = await supabase
        .from('pacientes')
        .select('id_paciente')
        .or(filter)
      if (selErr) {
        if (selErr.message.includes('row-level security')) {
          return NextResponse.json({ ok: false, error: 'RLS_BLOQUEANDO', sql: 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;' }, { status: 403 })
        }
        return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 })
      }
      const ids = (testRows || []).map(r => r.id_paciente)
      if (ids.length === 0) return NextResponse.json({ ok: true, eliminados: 0, mensaje: 'No hay pacientes para limpiar' })

      const { error } = await supabase.from('pacientes').delete().in('id_paciente', ids)
      if (error) {
        if (error.message.includes('row-level security')) {
          return NextResponse.json({ ok: false, error: 'RLS_BLOQUEANDO', sql: 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;' }, { status: 403 })
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, eliminados: ids.length, mensaje: `${ids.length} pacientes eliminados` })
    }

    if (!id) return NextResponse.json({ ok: false, error: 'ID requerido' }, { status: 400 })

    const { error } = await supabase.from('pacientes').delete().eq('id_paciente', parseInt(id))
    if (error) {
      if (error.message.includes('row-level security')) {
        return NextResponse.json({ ok: false, error: 'RLS_BLOQUEANDO', sql: 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;' }, { status: 403 })
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, mensaje: 'Paciente eliminado' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getClient()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('pageSize') || '1000', 10)))
    const riesgo = searchParams.get('riesgo')
    const search = searchParams.get('search')?.toLowerCase().trim()
    const all = searchParams.get('all') === 'true'

    let query = supabase
      .from('pacientes')
      .select('*', { count: 'exact' })
      .order('fecha_consulta', { ascending: false })

    if (all) {
      const { count: totalCount } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
      const total = totalCount ?? 0
      if (total === 0) {
        return NextResponse.json({ ok: true, pacientes: [], total: 0, page: 1, pageSize: 0, totalPages: 1 })
      }
      const chunkSize = 1000
      const pages = Math.ceil(total / chunkSize)
      const allChunks: any[] = []
      for (let p = 0; p < pages; p++) {
        const from = p * chunkSize
        const to = from + chunkSize - 1
        let chunkQuery = supabase
          .from('pacientes')
          .select('*')
          .order('fecha_consulta', { ascending: false })
          .range(from, to)
        if (riesgo && riesgo !== 'todos') {
          chunkQuery = chunkQuery.eq('riesgo_enfermedad', riesgo.charAt(0).toUpperCase() + riesgo.slice(1))
        }
        const { data: chunk, error: chunkErr } = await chunkQuery
        if (chunkErr) {
          if (chunkErr.message.includes('row-level security')) {
            return NextResponse.json({ ok: false, error: 'RLS_BLOQUEANDO', sql: 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;' }, { status: 403 })
          }
          return NextResponse.json({ ok: false, error: chunkErr.message }, { status: 500 })
        }
        allChunks.push(...(chunk || []))
      }
      let pacientes = allChunks
      if (search) {
        pacientes = pacientes.filter((p: any) =>
          `${p.nombres} ${p.apellidos}`.toLowerCase().includes(search) ||
          String(p.id_paciente).includes(search)
        )
      }
      return NextResponse.json({
        ok: true,
        pacientes,
        total: pacientes.length,
        page: 1,
        pageSize: pacientes.length,
        totalPages: 1,
      })
    }

    if (riesgo && riesgo !== 'todos') {
      query = query.eq('riesgo_enfermedad', riesgo.charAt(0).toUpperCase() + riesgo.slice(1))
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) {
      if (error.message.includes('row-level security')) {
        return NextResponse.json({ ok: false, error: 'RLS_BLOQUEANDO', sql: 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;' }, { status: 403 })
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    let pacientes = data || []
    if (search) {
      pacientes = pacientes.filter((p: any) =>
        `${p.nombres} ${p.apellidos}`.toLowerCase().includes(search) ||
        String(p.id_paciente).includes(search)
      )
    }

    return NextResponse.json({
      ok: true,
      pacientes,
      total: count ?? pacientes.length,
      page,
      pageSize,
      totalPages: count ? Math.ceil(count / pageSize) : 1,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error interno' }, { status: 500 })
  }
}
