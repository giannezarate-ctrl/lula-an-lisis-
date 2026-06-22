import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { generarDatasetSucio } from '@/lib/generate-dirty-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ociqqbebnaoeslcqyobe.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_xEnw1AFGDoy0Os4okquasA_IJLWjXqS'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ALIASES: Record<string, string> = {
  id_paciente: 'id_paciente', id: 'id_paciente', paciente_id: 'id_paciente', codigo: 'id_paciente',
  identificacion: 'id_paciente', identificación: 'id_paciente', documento: 'id_paciente',
  cedula: 'id_paciente', cédula: 'id_paciente', dni: 'id_paciente',
  nombres: 'nombres', nombre: 'nombres',
  apellidos: 'apellidos', apellido: 'apellidos',
  edad: 'edad', age: 'edad',
  sexo: 'sexo', genero: 'sexo', género: 'sexo', gender: 'sexo',
  peso: 'peso', weight: 'peso',
  altura: 'altura', height: 'altura', talla: 'altura', estatura: 'altura',
  presion_sistolica: 'presion_sistolica', sistolica: 'presion_sistolica', presión_sistólica: 'presion_sistolica',
  pa_sistolica: 'presion_sistolica', pa_sistólica: 'presion_sistolica', pas: 'presion_sistolica', systolic: 'presion_sistolica',
  presion_diastolica: 'presion_diastolica', diastolica: 'presion_diastolica', presión_diastólica: 'presion_diastolica',
  pa_diastolica: 'presion_diastolica', pa_diastólica: 'presion_diastolica', pad: 'presion_diastolica', diastolic: 'presion_diastolica',
  frecuencia_cardiaca: 'frecuencia_cardiaca', fc: 'frecuencia_cardiaca', pulso: 'frecuencia_cardiaca', heart_rate: 'frecuencia_cardiaca',
  glucosa: 'glucosa', glucose: 'glucosa',
  colesterol: 'colesterol', cholesterol: 'colesterol',
  saturacion_oxigeno: 'saturacion_oxigeno', spo2: 'saturacion_oxigeno', oxigeno: 'saturacion_oxigeno', oxígeno: 'saturacion_oxigeno',
  temperatura: 'temperatura', temp: 'temperatura', temperature: 'temperatura',
  antecedentes_familiares: 'antecedentes_familiares', ant_familiares: 'antecedentes_familiares', familiares: 'antecedentes_familiares',
  fumador: 'fumador', fuma: 'fumador', smokes: 'fumador', tabaquismo: 'fumador',
  consumo_alcohol: 'consumo_alcohol', alcohol: 'consumo_alcohol',
  actividad_fisica: 'actividad_fisica', actividad: 'actividad_fisica', exercise: 'actividad_fisica',
  diagnostico_preliminar: 'diagnostico_preliminar', diagnostico: 'diagnostico_preliminar', diagnóstico: 'diagnostico_preliminar', diagnosis: 'diagnostico_preliminar',
  imc: 'imc', bmi: 'imc', indice_masa_corporal: 'imc', índice_masa_corporal: 'imc',
  riesgo_enfermedad: 'riesgo_enfermedad', riesgo: 'riesgo_enfermedad', risk: 'riesgo_enfermedad',
  fecha_consulta: 'fecha_consulta', fecha: 'fecha_consulta', date: 'fecha_consulta',
}

function normalizarHeader(raw: string): string {
  let k = raw.toLowerCase().trim().replace(/['"]/g, '').replace(/[\s_-]+/g, '_')
  k = k.replace(/\(.*?\)/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '')
  if (ALIASES[k]) return ALIASES[k]
  const stripped = k.replace(/[^a-z0-9_]/g, '')
  if (ALIASES[stripped]) return ALIASES[stripped]
  const noAccent = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return ALIASES[noAccent] || noAccent
}

const BOOL_TRUE = new Set(['true', '1', 'si', 'sí', 'yes', 'y', 'verdadero', 'cierto', 'positivo'])
const parseBool = (v: any): boolean => BOOL_TRUE.has(String(v ?? '').toLowerCase().trim())

function convertirPA(valor: any, defaultVal: number): number {
  if (valor === null || valor === undefined || valor === '') return defaultVal
  const num = parseInt(String(valor))
  if (!isNaN(num) && num > 0) return num
  const s = String(valor).trim().toLowerCase()
  if (['alto', 'alta', 'high'].includes(s)) return 130 + Math.floor(Math.random() * 51)
  if (['bajo', 'baja', 'low'].includes(s)) return 80 + Math.floor(Math.random() * 31)
  return defaultVal
}

function normalizarSexo(v: any): string | null {
  const m: Record<string, string> = {
    m: 'Masculino', masculino: 'Masculino', hombre: 'Masculino', varon: 'Masculino', masculina: 'Masculino',
    f: 'Femenino', femenino: 'Femenino', mujer: 'Femenino', femenina: 'Femenino', dama: 'Femenino',
  }
  return m[String(v ?? '').toLowerCase().trim()] || null
}

function normalizarActividad(v: any): string {
  const val = String(v ?? '').toLowerCase().trim()
  if (['sedentario', 'seden', 'sedentarismo', 'inactivo', 'no activo', 'poco activo'].some(x => val.includes(x))) return 'sedentario'
  if (['activa', 'activo', 'frecuente', 'deportista', 'intenso', 'atleta'].some(x => val.includes(x))) return 'activa'
  return 'moderada'
}

function clinicalDefault(field: string): number {
  const m: Record<string, number> = {
    edad: 45, peso: 70, altura: 165, presion_sistolica: 120, presion_diastolica: 80,
    frecuencia_cardiaca: 75, glucosa: 100, colesterol: 200, saturacion_oxigeno: 97, temperatura: 36.5,
  }
  return m[field] || 0
}

const RANGOS: Record<string, { min: number; max: number }> = {
  edad: { min: 0, max: 150 }, peso: { min: 1, max: 500 }, altura: { min: 20, max: 300 },
  imc: { min: 5, max: 100 },
  presion_sistolica: { min: 50, max: 300 }, presion_diastolica: { min: 30, max: 200 },
  frecuencia_cardiaca: { min: 20, max: 300 }, glucosa: { min: 10, max: 1000 },
  colesterol: { min: 50, max: 800 }, saturacion_oxigeno: { min: 0, max: 100 }, temperatura: { min: 30, max: 45 },
}

const NUM_FIELDS = ['edad', 'peso', 'altura', 'presion_sistolica', 'presion_diastolica', 'frecuencia_cardiaca', 'glucosa', 'colesterol', 'saturacion_oxigeno', 'temperatura'] as const

const DIAG_MAP: Record<string, string> = {
  hipertension: 'Hipertensión Arterial', hipertensión: 'Hipertensión Arterial',
  hta: 'Hipertensión Arterial', 'presion alta': 'Hipertensión Arterial', 'presión alta': 'Hipertensión Arterial',
  diabetes: 'Diabetes Mellitus Tipo 2', 'diabetes tipo 2': 'Diabetes Mellitus Tipo 2', dm2: 'Diabetes Mellitus Tipo 2',
  obesidad: 'Obesidad',
  sobrepeso: 'Sobrepeso',
  dislipidemia: 'Dislipidemia', 'colesterol alto': 'Dislipidemia', hipercolesterolemia: 'Dislipidemia',
  cardiopatia: 'Cardiopatía Isquémica', cardiopatía: 'Cardiopatía Isquémica',
  epoc: 'Enfermedad Pulmonar Obstructiva Crónica',
  asma: 'Asma Bronquial',
  'insuficiencia renal': 'Insuficiencia Renal Crónica', irc: 'Insuficiencia Renal Crónica',
  anemia: 'Anemia', hipotiroidismo: 'Hipotiroidismo', hipertiroidismo: 'Hipertiroidismo',
  artritis: 'Artritis Reumatoide', osteoporosis: 'Osteoporosis',
  depresion: 'Depresión', depresión: 'Depresión', ansiedad: 'Trastorno de Ansiedad',
}

function estandarizarDiagnostico(d: string): string {
  const limpio = d.toLowerCase().trim()
  return DIAG_MAP[limpio] || d
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

function parseRows(raw: any[]): {
  registros: any[]
  stats: { nulos: number; duplicados: number; inconsistencias: number }
  motivosRechazo: { fila: number; motivo: string }[]
  muestraOriginal: any[]
} {
  let nulos = 0, duplicados = 0, inconsistencias = 0
  const seenIds = new Set<number>()
  const registros: any[] = []
  const motivosRechazo: { fila: number; motivo: string }[] = []
  const muestraOriginal = raw.slice(0, 3)

  raw.forEach((row, idx) => {
    try {
      const mapped: Record<string, any> = {}
      for (const [k, v] of Object.entries(row)) mapped[normalizarHeader(k)] = v

      let id = parseInt(mapped.id_paciente)
      if (!id || id <= 0 || isNaN(id)) {
        id = 9000 + idx
      }
      if (seenIds.has(id)) { duplicados++; motivosRechazo.push({ fila: idx + 1, motivo: `ID ${id} duplicado` }); return }
      seenIds.add(id)

      nulos += Object.values(mapped).filter(v => v === null || v === undefined || v === '').length

      let sexoN = normalizarSexo(mapped.sexo)
      if (!sexoN) sexoN = 'Masculino'

      const edadRaw = parseInt(mapped.edad)
      const edad = !isNaN(edadRaw) && edadRaw > 0 && edadRaw <= 150 ? edadRaw : 45

      const registrosLimpios = {
        id_paciente: id,
        nombres: String(mapped.nombres || mapped.nombre || 'Sin nombre').trim() || 'Sin nombre',
        apellidos: String(mapped.apellidos || mapped.apellido || 'Sin apellido').trim() || 'Sin apellido',
        edad,
        sexo: sexoN,
        peso: parseFloat(mapped.peso) || clinicalDefault('peso'),
        altura: (() => {
          const raw = parseFloat(mapped.altura) || clinicalDefault('altura')
          if (raw > 0 && raw < 10) return Math.round(raw * 100 * 100) / 100
          return raw
        })(),
        imc: (() => {
          const rawAlt = parseFloat(mapped.altura) || clinicalDefault('altura')
          const altCm = rawAlt > 0 && rawAlt < 10 ? Math.round(rawAlt * 100 * 100) / 100 : rawAlt
          return parseFloat(mapped.imc) || calcularIMC(parseFloat(mapped.peso) || clinicalDefault('peso'), altCm)
        })(),
        presion_sistolica: convertirPA(mapped.presion_sistolica, clinicalDefault('presion_sistolica')),
        presion_diastolica: convertirPA(mapped.presion_diastolica, clinicalDefault('presion_diastolica')),
        frecuencia_cardiaca: parseInt(mapped.frecuencia_cardiaca) || clinicalDefault('frecuencia_cardiaca'),
        glucosa: parseFloat(mapped.glucosa) || clinicalDefault('glucosa'),
        colesterol: parseFloat(mapped.colesterol) || clinicalDefault('colesterol'),
        saturacion_oxigeno: parseFloat(mapped.saturacion_oxigeno) || clinicalDefault('saturacion_oxigeno'),
        temperatura: parseFloat(mapped.temperatura) || clinicalDefault('temperatura'),
        antecedentes_familiares: parseBool(mapped.antecedentes_familiares),
        fumador: parseBool(mapped.fumador),
        consumo_alcohol: parseBool(mapped.consumo_alcohol),
        actividad_fisica: normalizarActividad(mapped.actividad_fisica),
        diagnostico_preliminar: estandarizarDiagnostico(mapped.diagnostico_preliminar || 'Sin diagnóstico'),
        riesgo_enfermedad: (() => {
          const r = String(mapped.riesgo_enfermedad || '').trim().toLowerCase()
          if (['bajo', 'medio', 'alto', 'critico', 'crítico'].includes(r)) {
            return r === 'crítico' ? 'Critico' : r.charAt(0).toUpperCase() + r.slice(1)
          }
          return ''
        })(),
        fecha_consulta: (() => {
          if (!mapped.fecha_consulta) return new Date().toISOString().split('T')[0]
          try {
            const d = new Date(mapped.fecha_consulta)
            if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
              return d.toISOString().split('T')[0]
            }
          } catch {}
          return new Date().toISOString().split('T')[0]
        })(),
      }

      let valido = true
      for (const [field, rango] of Object.entries(RANGOS)) {
        const v = (registrosLimpios as any)[field]
        if (typeof v === 'number' && !isNaN(v) && (v < rango.min || v > rango.max)) { valido = false; break }
      }
      if (!valido) { inconsistencias++; motivosRechazo.push({ fila: idx + 1, motivo: 'Valores fuera de rango clínico' }); return }

      registros.push(registrosLimpios)
    } catch (e: any) {
      inconsistencias++
      motivosRechazo.push({ fila: idx + 1, motivo: `Error: ${e?.message || 'desconocido'}` })
    }
  })

  return { registros, stats: { nulos, duplicados, inconsistencias }, motivosRechazo, muestraOriginal }
}

function imputarNulos(registros: any[]): number {
  const vals: Record<string, number[]> = {}
  for (const f of NUM_FIELDS) vals[f] = []
  for (const r of registros) {
    for (const f of NUM_FIELDS) {
      const v = (r as any)[f]
      if (typeof v === 'number' && !isNaN(v) && v > 0) vals[f].push(v)
    }
  }
  const promedios: Record<string, number> = {}
  for (const f of NUM_FIELDS) {
    const arr = vals[f]
    promedios[f] = arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : clinicalDefault(f)
  }
  let corregidos = 0
  for (const r of registros) {
    for (const f of NUM_FIELDS) {
      const v = (r as any)[f]
      if (v === null || v === undefined || isNaN(v) || v === 0) {
        (r as any)[f] = promedios[f]
        corregidos++
      }
    }
  }
  return corregidos
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const errores: string[] = []
  let tipo: string | null = null
  let totalRaw = 0
  let insertados = 0
  let duplicados = 0
  let inconsistencias = 0
  let corregidos = 0
  let nulos = 0
  let criticos = 0
  let archivoNombre = ''
  let columnasDetectadas: string[] = []

  try {
    const contentType = request.headers.get('content-type') || ''
    let action = ''
    let file: File | null = null
    let tipoArchivo = 'archivo'

    if (contentType.includes('application/json')) {
      const body = await request.json()
      action = body.action || ''
      tipoArchivo = body.tipo || 'generate'
    } else {
      const formData = await request.formData()
      file = formData.get('file') as File | null
      tipoArchivo = (formData.get('tipo') as string) || 'archivo'
      action = tipoArchivo
    }

    if (action === 'generate') {
      const totalRegistros = 1800
      const { rows, stats: genStats } = generarDatasetSucio(totalRegistros)

      const csvLines: string[] = []
      const headers = Object.keys(rows[0] || {})
      csvLines.push(headers.join(','))
      for (const row of rows) {
        const vals = headers.map(h => {
          const v = (row as any)[h]
          if (v === null || v === undefined) return ''
          const s = String(v)
          if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`
          return s
        })
        csvLines.push(vals.join(','))
      }
      const csvText = csvLines.join('\n')
      const csvBlob = new Blob([csvText], { type: 'text/csv' })
      file = new File([csvBlob], 'dataset_sucio_generado.csv', { type: 'text/csv' })
      tipoArchivo = 'CSV'
      archivoNombre = 'dataset_sucio_generado.csv'
    }

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }

    archivoNombre = archivoNombre || file.name
    const ext = archivoNombre.split('.').pop()?.toLowerCase()
    let rawData: any[] = []

    if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
      tipo = ext.toUpperCase()
      const buf = await file!.arrayBuffer()
      const u8 = new Uint8Array(buf)
      let text: string
      if (u8.length >= 2 && u8[0] === 0xFF && u8[1] === 0xFE) {
        text = new TextDecoder('utf-16le').decode(u8)
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
      } else if (u8.length >= 2 && u8[0] === 0xFE && u8[1] === 0xFF) {
        text = new TextDecoder('utf-16be').decode(u8)
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
      } else if (u8.length >= 3 && u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF) {
        text = new TextDecoder('utf-8').decode(u8.slice(3))
      } else {
        const hasNulls = u8.indexOf(0) !== -1
        if (hasNulls) {
          try { text = new TextDecoder('utf-16le', { fatal: false }).decode(u8) }
          catch { text = new TextDecoder('windows-1252').decode(u8) }
        } else {
          try { text = new TextDecoder('utf-8', { fatal: false }).decode(u8) }
          catch { text = new TextDecoder('windows-1252').decode(u8) }
        }
      }
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      const lines = text.split('\n').map(l => l.replace(/[\u0000-\u001F\u007F]/g, '').trimEnd()).filter(l => l.trim().length > 0)

      if (lines.length === 0) {
        return NextResponse.json({
          ok: false,
          error: 'El archivo está vacío. Asegúrate de que contenga al menos una fila de encabezados y una de datos.',
        }, { status: 400 })
      }

      const detectDelimiter = (line: string): string => {
        const candidates = [',', '\t', ';', '|', '~', '^']
        const counts: Record<string, number> = {}
        for (const c of candidates) counts[c] = 0
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') { inQuotes = !inQuotes; continue }
          if (!inQuotes && ch in counts) counts[ch]++
        }
        let best = ',', bestCount = 0
        for (const c of candidates) {
          if (counts[c] > bestCount) { best = c; bestCount = counts[c] }
        }
        return best
      }

      const splitRow = (line: string, d: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; continue }
            inQuotes = !inQuotes; continue
          }
          if (ch === d && !inQuotes) { result.push(current.trim()); current = ''; continue }
          current += ch
        }
        result.push(current.trim())
        return result
      }

      const allDelimiters = ['\t', ',', ';', '|', '~', '^']
      const delimsToTry: string[] = []
      const primaryDelim = detectDelimiter(lines[0])
      delimsToTry.push(primaryDelim)
      for (const d of allDelimiters) { if (d !== primaryDelim) delimsToTry.push(d) }

      let bestRawData: any[] = []
      let bestDelim = primaryDelim
      let bestHeaders: string[] = []

      for (const tryDelim of delimsToTry) {
        const testHeaders = splitRow(lines[0], tryDelim).map(h => h.trim()).filter(h => h.length > 0)
        if (testHeaders.length < 2) continue

        const testData: any[] = []
        for (let i = 1; i < lines.length; i++) {
          const vals = splitRow(lines[i], tryDelim)
          const nonEmptyCount = vals.filter(v => v && v.trim() !== '').length
          if (nonEmptyCount < 1) continue
          const row: Record<string, string> = {}
          testHeaders.forEach((h, idx) => { row[h] = (vals[idx] || '').trim() })
          if (Object.keys(row).length > 0) testData.push(row)
        }
        if (testData.length > bestRawData.length) {
          bestRawData = testData
          bestDelim = tryDelim
          bestHeaders = testHeaders
        }
        if (testData.length >= lines.length - 1) break
      }

      if (bestRawData.length === 0 && lines.length >= 1) {
        for (const tryDelim of delimsToTry) {
          if (tryDelim === bestDelim) continue
          const testHeaders: string[] = []
          for (let c = 0; c < 5; c++) testHeaders.push(`col${c + 1}`)
          const testData: any[] = []
          for (let i = 0; i < lines.length; i++) {
            const vals = splitRow(lines[i], tryDelim)
            const nonEmptyCount = vals.filter(v => v && v.trim() !== '').length
            if (nonEmptyCount < 1) continue
            const row: Record<string, string> = {}
            testHeaders.forEach((h, idx) => { row[h] = (vals[idx] || '').trim() })
            if (Object.keys(row).length > 0) testData.push(row)
          }
          if (testData.length > bestRawData.length) {
            bestRawData = testData
            bestDelim = tryDelim
            bestHeaders = testHeaders
          }
          if (testData.length > 0) break
        }
      }

      rawData = bestRawData
      columnasDetectadas = bestHeaders

      if (rawData.length === 0) {
        return NextResponse.json({
          ok: false,
          error: 'No se encontraron filas válidas en el archivo.',
          detalle: 'El archivo se leyó pero no se pudo extraer ningún dato. Posibles causas: delimitador no detectado, filas vacías, o formato no estándar.',
          stats: {
            extension: ext,
            tipo,
            lineasLeidas: lines.length,
            primeraLinea: lines[0]?.slice(0, 300),
            segundaLinea: lines[1]?.slice(0, 300),
            delimitadorUsado: bestDelim === '\t' ? 'TAB' : bestDelim,
            headersDetectados: bestHeaders,
          },
        }, { status: 400 })
      }
    } else if (ext === 'xlsx' || ext === 'xls') {
      tipo = ext.toUpperCase()
      let xlsxInfo: any = {}
      try {
        const buf = Buffer.from(await file!.arrayBuffer())
        const wb = XLSX.read(buf, { type: 'buffer' })
        xlsxInfo.hojas = wb.SheetNames
        xlsxInfo.totalHojas = wb.SheetNames?.length || 0

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          return NextResponse.json({
            ok: false,
            error: 'El archivo Excel no tiene hojas de cálculo.',
            stats: xlsxInfo,
          }, { status: 400 })
        }

        const tryParseSheet = (sheetName: string) => {
          const ws = wb.Sheets[sheetName]
          if (!ws) return { data: [], info: { hoja: sheetName, celdas: 0 } }
          const range = ws['!ref']
          const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })
          const dataRaw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, header: 1 })
          let finalData = data
          if (data.length === 0 && Array.isArray(dataRaw) && dataRaw.length > 0) {
            const firstRow = (dataRaw[0] as any[]).map((c, i) => `col${i + 1}`)
            for (let i = 1; i < dataRaw.length; i++) {
              const row: Record<string, any> = {}
              firstRow.forEach((h, j) => { row[h] = (dataRaw[i] as any[])[j] ?? '' })
              if (Object.values(row).some(v => v !== '' && v != null)) finalData.push(row)
            }
          }
          return { data: finalData, info: { hoja: sheetName, rango: range, filasConDatos: finalData.length } }
        }

        let bestSheet: { data: any[]; info: any } = { data: [], info: {} }
        for (const sheetName of wb.SheetNames) {
          const result = tryParseSheet(sheetName)
          if (result.data.length > bestSheet.data.length) bestSheet = result
        }

        rawData = bestSheet.data
        xlsxInfo.hojaUsada = bestSheet.info.hoja
        xlsxInfo.filasExtraidas = rawData.length

        if (rawData.length === 0) {
          const fallbackText = await file!.text().catch(() => '')
          if (fallbackText && fallbackText.length > 10) {
            const lines = fallbackText.split(/\r?\n/).filter(l => l.trim())
            if (lines.length >= 1) {
              const delims = ['\t', ',', ';', '|']
              let bestDelim = ',', bestCount = 0
              for (const d of delims) {
                const c = (lines[0].match(new RegExp(d === '\t' ? '\\t' : d, 'g')) || []).length
                if (c > bestCount) { bestCount = c; bestDelim = d }
              }
              const headers = lines[0].split(bestDelim).map(h => h.trim().replace(/^"|"$/g, ''))
              for (let i = 1; i < lines.length; i++) {
                const vals = lines[i].split(bestDelim).map(v => v.trim().replace(/^"|"$/g, ''))
                if (vals.every(v => !v)) continue
                const row: Record<string, string> = {}
                headers.forEach((h, j) => { row[h] = vals[j] || '' })
                if (Object.keys(row).length > 0) rawData.push(row)
              }
              tipo = bestDelim === '\t' ? 'TSV' : (ext.toUpperCase() + ' (texto)')
              xlsxInfo.fallbackTexto = true
              xlsxInfo.delimitadorUsado = bestDelim === '\t' ? 'TAB' : bestDelim
            }
          }
        }
      } catch (xlsxErr: any) {
        return NextResponse.json({
          ok: false,
          error: 'No se pudo leer el archivo Excel. Verifica que no esté corrupto o protegido con contraseña.',
          detalle: xlsxErr?.message,
          stats: xlsxInfo,
        }, { status: 400 })
      }
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: `Formato "${ext}" no soportado. Usa CSV, TSV, TXT, XLSX o XLS.`,
        },
        { status: 400 }
      )
    }

    totalRaw = rawData.length
    columnasDetectadas = Object.keys(rawData[0] || {})

    if (!rawData.length) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No se pudo extraer datos del archivo. Verifica que el formato sea correcto.',
          detalle: 'El archivo no tiene datos reconocibles. Posibles causas: archivo vacío, solo encabezados, todas las filas en blanco, o formato no estándar.',
          stats: { extension: ext, tipoDetectado: tipo, extensionArchivo: ext },
        },
        { status: 400 }
      )
    }

    const parseResult = parseRows(rawData)
    const parsed = parseResult.registros
    const stats = parseResult.stats
    nulos = stats.nulos
    duplicados = stats.duplicados
    inconsistencias = stats.inconsistencias

    if (!parsed.length) {
      return NextResponse.json({
        ok: false,
        error: `No se pudo procesar ningún registro de ${totalRaw} filas leídas.`,
        detalle: 'Todas las filas fueron rechazadas. Revisa los motivos abajo y las columnas que tu archivo tiene.',
        stats: {
          totalRaw,
          nulos,
          duplicados,
          inconsistencias,
          columnasDetectadas,
          motivosRechazo: parseResult.motivosRechazo.slice(0, 5),
          muestraOriginal: parseResult.muestraOriginal,
          columnasNormalizadas: parseResult.muestraOriginal.length > 0
            ? Object.keys(parseResult.muestraOriginal[0]).map(c => ({ original: c, normalizada: normalizarHeader(c) }))
            : [],
        },
      }, { status: 400 })
    }

    corregidos = imputarNulos(parsed)

    let finalRows = parsed.map(r => {
      const imc = calcularIMC(r.peso, r.altura)
      const riesgo = r.riesgo_enfermedad || calcularRiesgo(r)
      if (riesgo === 'Critico') criticos++
      return {
        id_paciente: r.id_paciente,
        nombres: r.nombres,
        apellidos: r.apellidos,
        edad: r.edad,
        sexo: r.sexo,
        peso: r.peso,
        altura: r.altura,
        imc,
        clasificacion_imc: clasificarIMC(imc),
        presion_sistolica: r.presion_sistolica,
        presion_diastolica: r.presion_diastolica,
        frecuencia_cardiaca: r.frecuencia_cardiaca,
        glucosa: r.glucosa,
        colesterol: r.colesterol,
        saturacion_oxigeno: r.saturacion_oxigeno,
        temperatura: r.temperatura,
        antecedentes_familiares: r.antecedentes_familiares,
        fumador: r.fumador,
        consumo_alcohol: r.consumo_alcohol,
        actividad_fisica: r.actividad_fisica,
        diagnostico_preliminar: r.diagnostico_preliminar,
        riesgo_enfermedad: riesgo,
        fecha_consulta: r.fecha_consulta,
      }
    })

    if (action === 'generate' && finalRows.length < 1800) {
      let nextId = Math.max(...finalRows.map(r => r.id_paciente), 0) + 1
      const { rows: extras } = generarDatasetSucio(1800 - finalRows.length + 100)
      for (const e of extras) {
        if (finalRows.length >= 1800) break
        const peso = Number(e.peso) || 70
        const altura = Number(e.altura) || 165
        const imc = calcularIMC(peso, altura)
        const riesgo = e.riesgo_enfermedad || calcularRiesgo({
          ...e,
          peso,
          altura,
          edad: Number(e.edad) || 45,
          presion_sistolica: Number(e.presion_sistolica) || 120,
          presion_diastolica: Number(e.presion_diastolica) || 80,
          frecuencia_cardiaca: Number(e.frecuencia_cardiaca) || 75,
          glucosa: Number(e.glucosa) || 100,
          colesterol: Number(e.colesterol) || 200,
          saturacion_oxigeno: Number(e.saturacion_oxigeno) || 97,
          temperatura: Number(e.temperatura) || 36.5,
        })
        if (riesgo === 'Critico') criticos++
        finalRows.push({
          id_paciente: nextId++,
          nombres: e.nombres,
          apellidos: e.apellidos,
          edad: Number(e.edad) || 45,
          sexo: e.sexo,
          peso,
          altura,
          imc,
          clasificacion_imc: clasificarIMC(imc),
          presion_sistolica: Number(e.presion_sistolica) || 120,
          presion_diastolica: Number(e.presion_diastolica) || 80,
          frecuencia_cardiaca: Number(e.frecuencia_cardiaca) || 75,
          glucosa: Number(e.glucosa) || 100,
          colesterol: Number(e.colesterol) || 200,
          saturacion_oxigeno: Number(e.saturacion_oxigeno) || 97,
          temperatura: Number(e.temperatura) || 36.5,
          antecedentes_familiares: e.antecedentes_familiares,
          fumador: e.fumador,
          consumo_alcohol: e.consumo_alcohol,
          actividad_fisica: e.actividad_fisica,
          diagnostico_preliminar: e.diagnostico_preliminar,
          riesgo_enfermedad: riesgo,
          fecha_consulta: e.fecha_consulta,
        })
      }
      insertados = finalRows.length
    }

    const loteSize = 50
    for (let i = 0; i < finalRows.length; i += loteSize) {
      const lote = finalRows.slice(i, i + loteSize)
      const { error } = await supabase
        .from('pacientes')
        .upsert(lote, { onConflict: 'id_paciente' })
      if (error) {
        errores.push(`Lote ${Math.floor(i / loteSize) + 1}: ${error.message}`)
        if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          return NextResponse.json({
            ok: false,
            error: 'RLS_BLOQUEANDO',
            mensaje: 'La tabla "pacientes" tiene Row Level Security activado. Ejecuta el SQL abajo en Supabase.',
            sql: 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;',
            sqlCompleto: 'ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;\nALTER TABLE etl_logs DISABLE ROW LEVEL SECURITY;',
            registrosLeidos: totalRaw,
            registrosProcesados: 0,
            errores,
            antes: { total: totalRaw, nulos, duplicados, inconsistencias, columnasDetectadas },
            stats: { rls: true, totalRaw, nulos, duplicados, inconsistencias, columnasDetectadas, criticos },
          }, { status: 403 })
        }
      }
      else insertados += lote.length
    }

    const calidadPct = totalRaw > 0 ? Math.round((insertados / totalRaw) * 100) : 0
    const tiempo = parseFloat(((Date.now() - startTime) / 1000).toFixed(2))

    try {
      await supabase.from('etl_logs').insert({
        archivo_nombre: archivoNombre,
        total_registros: totalRaw,
        registros_validos: insertados,
        duplicados_eliminados: duplicados,
        nulos_corregidos: corregidos,
        inconsistencias,
        calidad_pct: calidadPct,
        tiempo_ejecucion: tiempo,
        errores: JSON.stringify(errores),
      })
    } catch { /* etl_logs no existe */ }

    return NextResponse.json({
      ok: true,
      archivo: archivoNombre,
      tipo,
      antes: { total: totalRaw, nulos, duplicados, inconsistencias, columnasDetectadas },
      despues: { validos: insertados, duplicadosEliminados: duplicados, corregidos, calidad: calidadPct, criticos },
      registrosProcesados: insertados,
      tiempoEjecucion: tiempo,
      errores,
    })
  } catch (e: any) {
    console.error('ETL error:', e)
    return NextResponse.json(
      { ok: false, error: e?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

async function ejecutarETL(datos: any[], archivo: string, tipo: string, startTime: number, errores: string[]) {
  let insertados = 0
  let criticos = 0

  const rows = datos.map(r => {
    const imc = calcularIMC(r.peso, r.altura)
    const riesgo = calcularRiesgo(r)
    if (riesgo === 'Critico') criticos++
    return {
      id_paciente: r.id_paciente,
      nombres: r.nombres,
      apellidos: r.apellidos,
      edad: r.edad,
      sexo: r.sexo,
      peso: r.peso,
      altura: r.altura,
      imc,
      clasificacion_imc: clasificarIMC(imc),
      presion_sistolica: r.presion_sistolica,
      presion_diastolica: r.presion_diastolica,
      frecuencia_cardiaca: r.frecuencia_cardiaca,
      glucosa: r.glucosa,
      colesterol: r.colesterol,
      saturacion_oxigeno: r.saturacion_oxigeno,
      temperatura: r.temperatura,
      antecedentes_familiares: r.antecedentes_familiares,
      fumador: r.fumador,
      consumo_alcohol: r.consumo_alcohol,
      actividad_fisica: r.actividad_fisica,
      diagnostico_preliminar: r.diagnostico_preliminar,
      riesgo_enfermedad: riesgo,
      fecha_consulta: r.fecha_consulta,
    }
  })

  const loteSize = 25
  for (let i = 0; i < rows.length; i += loteSize) {
    const lote = rows.slice(i, i + loteSize)
    const { error } = await supabase
      .from('pacientes')
      .upsert(lote, { onConflict: 'id_paciente' })
    if (error) errores.push(`Lote ${Math.floor(i / loteSize) + 1}: ${error.message}`)
    else insertados += lote.length
  }

  const tiempo = parseFloat(((Date.now() - startTime) / 1000).toFixed(2))
  const totalRaw = datos.length
  const calidadPct = totalRaw > 0 ? Math.round((insertados / totalRaw) * 100) : 0

  try {
    await supabase.from('etl_logs').insert({
      archivo_nombre: archivo,
      total_registros: totalRaw,
      registros_validos: insertados,
      duplicados_eliminados: 0,
      nulos_corregidos: 0,
      inconsistencias: 0,
      calidad_pct: calidadPct,
      tiempo_ejecucion: tiempo,
      errores: JSON.stringify(errores),
    })
  } catch { /* etl_logs no existe */ }

  return {
    ok: true,
    archivo,
    tipo,
    antes: { total: totalRaw, nulos: 0, duplicados: 0, inconsistencias: 0, columnasDetectadas: Object.keys(rows[0] || {}) },
    despues: { validos: insertados, duplicadosEliminados: 0, corregidos: 0, calidad: calidadPct, criticos },
    registrosProcesados: insertados,
    tiempoEjecucion: tiempo,
    errores,
  }
}

function generarDatosDemo() {
  return [
    { id_paciente: 1001, nombres: 'Carlos', apellidos: 'Mendoza Rivera', edad: 58, sexo: 'Masculino', peso: 92, altura: 172, presion_sistolica: 158, presion_diastolica: 96, frecuencia_cardiaca: 88, glucosa: 145, colesterol: 245, saturacion_oxigeno: 95, temperatura: 36.7, antecedentes_familiares: true, fumador: true, consumo_alcohol: true, actividad_fisica: 'sedentario', diagnostico_preliminar: 'Hipertensión Arterial', fecha_consulta: '2025-01-15' },
    { id_paciente: 1002, nombres: 'María', apellidos: 'González Pérez', edad: 42, sexo: 'Femenino', peso: 68, altura: 160, presion_sistolica: 125, presion_diastolica: 78, frecuencia_cardiaca: 72, glucosa: 105, colesterol: 195, saturacion_oxigeno: 98, temperatura: 36.5, antecedentes_familiares: true, fumador: false, consumo_alcohol: false, actividad_fisica: 'activa', diagnostico_preliminar: 'Chequeo Preventivo', fecha_consulta: '2025-01-20' },
    { id_paciente: 1003, nombres: 'José', apellidos: 'Ramírez López', edad: 67, sexo: 'Masculino', peso: 88, altura: 168, presion_sistolica: 172, presion_diastolica: 102, frecuencia_cardiaca: 95, glucosa: 198, colesterol: 268, saturacion_oxigeno: 92, temperatura: 36.8, antecedentes_familiares: true, fumador: false, consumo_alcohol: false, actividad_fisica: 'sedentario', diagnostico_preliminar: 'Diabetes Mellitus Tipo 2', fecha_consulta: '2025-02-01' },
    { id_paciente: 1004, nombres: 'Ana Lucía', apellidos: 'Torres Vega', edad: 35, sexo: 'Femenino', peso: 62, altura: 165, presion_sistolica: 118, presion_diastolica: 74, frecuencia_cardiaca: 68, glucosa: 92, colesterol: 178, saturacion_oxigeno: 99, temperatura: 36.6, antecedentes_familiares: false, fumador: false, consumo_alcohol: false, actividad_fisica: 'activa', diagnostico_preliminar: 'Chequeo Preventivo', fecha_consulta: '2025-02-05' },
    { id_paciente: 1005, nombres: 'Pedro', apellidos: 'Sánchez Mora', edad: 51, sexo: 'Masculino', peso: 105, altura: 175, presion_sistolica: 148, presion_diastolica: 92, frecuencia_cardiaca: 82, glucosa: 132, colesterol: 232, saturacion_oxigeno: 96, temperatura: 36.5, antecedentes_familiares: true, fumador: true, consumo_alcohol: true, actividad_fisica: 'sedentario', diagnostico_preliminar: 'Obesidad Grado I', fecha_consulta: '2025-02-10' },
    { id_paciente: 1006, nombres: 'Lucía', apellidos: 'Fernández Castro', edad: 73, sexo: 'Femenino', peso: 58, altura: 155, presion_sistolica: 165, presion_diastolica: 88, frecuencia_cardiaca: 78, glucosa: 168, colesterol: 215, saturacion_oxigeno: 94, temperatura: 36.4, antecedentes_familiares: true, fumador: false, consumo_alcohol: false, actividad_fisica: 'sedentario', diagnostico_preliminar: 'Hipertensión Arterial', fecha_consulta: '2025-02-15' },
    { id_paciente: 1007, nombres: 'Roberto', apellidos: 'Díaz Salazar', edad: 29, sexo: 'Masculino', peso: 78, altura: 180, presion_sistolica: 122, presion_diastolica: 76, frecuencia_cardiaca: 65, glucosa: 88, colesterol: 165, saturacion_oxigeno: 99, temperatura: 36.5, antecedentes_familiares: false, fumador: false, consumo_alcohol: true, actividad_fisica: 'activa', diagnostico_preliminar: 'Chequeo Deportivo', fecha_consulta: '2025-02-20' },
    { id_paciente: 1008, nombres: 'Sofía', apellidos: 'Martínez Ruiz', edad: 46, sexo: 'Femenino', peso: 72, altura: 162, presion_sistolica: 138, presion_diastolica: 86, frecuencia_cardiaca: 76, glucosa: 118, colesterol: 210, saturacion_oxigeno: 97, temperatura: 36.6, antecedentes_familiares: true, fumador: false, consumo_alcohol: false, actividad_fisica: 'moderada', diagnostico_preliminar: 'Sobrepeso', fecha_consulta: '2025-03-01' },
    { id_paciente: 1009, nombres: 'Miguel', apellidos: 'Castro Vargas', edad: 61, sexo: 'Masculino', peso: 95, altura: 170, presion_sistolica: 162, presion_diastolica: 98, frecuencia_cardiaca: 92, glucosa: 175, colesterol: 256, saturacion_oxigeno: 93, temperatura: 36.7, antecedentes_familiares: true, fumador: true, consumo_alcohol: true, actividad_fisica: 'sedentario', diagnostico_preliminar: 'Cardiopatía Isquémica', fecha_consulta: '2025-03-05' },
    { id_paciente: 1010, nombres: 'Elena', apellidos: 'Vargas Mendoza', edad: 38, sexo: 'Femenino', peso: 65, altura: 167, presion_sistolica: 115, presion_diastolica: 72, frecuencia_cardiaca: 70, glucosa: 95, colesterol: 182, saturacion_oxigeno: 98, temperatura: 36.5, antecedentes_familiares: false, fumador: false, consumo_alcohol: false, actividad_fisica: 'activa', diagnostico_preliminar: 'Chequeo Preventivo', fecha_consulta: '2025-03-10' },
    { id_paciente: 1011, nombres: 'Fernando', apellidos: 'Ortiz Reyes', edad: 54, sexo: 'Masculino', peso: 82, altura: 174, presion_sistolica: 145, presion_diastolica: 88, frecuencia_cardiaca: 80, glucosa: 125, colesterol: 225, saturacion_oxigeno: 96, temperatura: 36.6, antecedentes_familiares: true, fumador: false, consumo_alcohol: true, actividad_fisica: 'moderada', diagnostico_preliminar: 'Dislipidemia', fecha_consulta: '2025-03-15' },
    { id_paciente: 1012, nombres: 'Patricia', apellidos: 'Rojas Aguilar', edad: 48, sexo: 'Femenino', peso: 75, altura: 158, presion_sistolica: 132, presion_diastolica: 84, frecuencia_cardiaca: 74, glucosa: 110, colesterol: 198, saturacion_oxigeno: 97, temperatura: 36.5, antecedentes_familiares: true, fumador: false, consumo_alcohol: false, actividad_fisica: 'moderada', diagnostico_preliminar: 'Sobrepeso', fecha_consulta: '2025-03-20' },
    { id_paciente: 1013, nombres: 'Andrés', apellidos: 'Morales Pinto', edad: 33, sexo: 'Masculino', peso: 80, altura: 178, presion_sistolica: 120, presion_diastolica: 75, frecuencia_cardiaca: 68, glucosa: 90, colesterol: 175, saturacion_oxigeno: 98, temperatura: 36.5, antecedentes_familiares: false, fumador: false, consumo_alcohol: true, actividad_fisica: 'activa', diagnostico_preliminar: 'Chequeo Preventivo', fecha_consulta: '2025-04-01' },
    { id_paciente: 1014, nombres: 'Carmen', apellidos: 'Silva Carrasco', edad: 70, sexo: 'Femenino', peso: 70, altura: 152, presion_sistolica: 168, presion_diastolica: 92, frecuencia_cardiaca: 85, glucosa: 155, colesterol: 240, saturacion_oxigeno: 93, temperatura: 36.7, antecedentes_familiares: true, fumador: false, consumo_alcohol: false, actividad_fisica: 'sedentario', diagnostico_preliminar: 'Hipertensión Arterial', fecha_consulta: '2025-04-05' },
    { id_paciente: 1015, nombres: 'Ricardo', apellidos: 'Paredes Núñez', edad: 45, sexo: 'Masculino', peso: 85, altura: 172, presion_sistolica: 128, presion_diastolica: 80, frecuencia_cardiaca: 75, glucosa: 102, colesterol: 205, saturacion_oxigeno: 97, temperatura: 36.6, antecedentes_familiares: false, fumador: true, consumo_alcohol: false, actividad_fisica: 'moderada', diagnostico_preliminar: 'Chequeo Preventivo', fecha_consulta: '2025-04-10' },
  ]
}

export async function GET() {
  try {
    const { data: pacientes, error: pError } = await supabase
      .from('pacientes')
      .select('id_paciente')
    const { data: criticos, error: cError } = await supabase
      .from('pacientes')
      .select('id_paciente')
      .eq('riesgo_enfermedad', 'Critico')

    if (pError || cError) {
      return NextResponse.json({ ok: false, error: pError?.message || cError?.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      stats: { totalPacientes: pacientes?.length || 0, totalCriticos: criticos?.length || 0 },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
