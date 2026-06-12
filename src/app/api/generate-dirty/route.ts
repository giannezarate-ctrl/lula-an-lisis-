import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOMBRES = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Lucía', 'Roberto', 'Sofía', 'Miguel', 'Elena', 'Fernando', 'Patricia', 'Andrés', 'Carmen', 'Ricardo', 'Laura', 'Diego', 'Valentina', 'Jorge', 'Camila', 'Luis', 'Daniela', 'Martín', 'Isabella', 'Alejandro', 'Gabriela', 'Rafael', 'Adriana', 'Sergio', 'Paula', 'Francisco', 'Claudia', 'Eduardo', 'Mónica', 'Manuel', 'Teresa', 'Pablo', 'Rosa', 'Javier', 'Gloria', 'Alfredo', 'Sandra', 'Arturo', 'Mariana', 'Enrique', 'Verónica', 'Rodrigo', 'Beatriz', 'Héctor', 'Alicia']
const APELLIDOS = ['García', 'López', 'Rodríguez', 'Martínez', 'Hernández', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Ortiz', 'Gutiérrez', 'Chávez', 'Ramos', 'Ruiz', 'Vargas', 'Castillo', 'Jiménez', 'Moreno', 'Romero', 'Herrera', 'Medina', 'Aguilar', 'Vega', 'Castro', 'Mendoza', 'Silva', 'Paredes', 'Núñez', 'Salazar', 'Carrasco', 'Aguirre', 'Delgado']
const SEXOS = ['Masculino', 'Femenino', 'M', 'F', 'Hombre', 'Mujer', 'H', 'm', 'f', 'MASCULINO', 'FEMENINO', 'masculino', 'femenino', 'varón', 'dama']
const ACTIVIDADES = ['sedentario', 'moderada', 'activa', 'Sedentario', 'MODERADA', 'Activa', 'inactivo', 'deportista', 'atleta', 'sedentarismo', 'poco activo', 'frecuente']
const DIAGNOSTICOS = ['Hipertensión', 'Diabetes', 'Obesidad', 'Sobrepeso', 'Dislipidemia', 'Cardiopatía', 'asma', 'epoc', 'Anemia', 'Chequeo Preventivo', 'hipertencion', 'diabète', 'obesida', 'sobrepesito', 'coolesterol alto', 'presion alta', 'azúcar alta', 'Insuficiencia renal', 'depresión', 'artritis']
const RIESGOS = ['Bajo', 'Medio', 'Alto', 'Critico', 'CRITICO', 'bajo', 'medio', 'ALTO', 'Bajo riesgo', 'Alto riesgo']

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min: number, max: number, dec = 1): number { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)) }

function generateCleanRow(id: number): Record<string, any> {
  const sexo = pick(['Masculino', 'Femenino'])
  const edad = rand(1, 95)
  const pesoBase = sexo === 'Masculino' ? rand(55, 120) : rand(42, 95)
  const alturaBase = sexo === 'Masculino' ? rand(155, 195) : rand(145, 180)

  return {
    id_paciente: id,
    nombres: pick(NOMBRES),
    apellidos: `${pick(APELLIDOS)} ${pick(APELLIDOS)}`,
    edad,
    sexo,
    peso: pesoBase,
    altura: alturaBase,
    presion_sistolica: rand(100, 180),
    presion_diastolica: rand(60, 110),
    frecuencia_cardiaca: rand(55, 110),
    glucosa: rand(70, 250),
    colesterol: rand(140, 320),
    saturacion_oxigeno: rand(88, 100),
    temperatura: randFloat(35.5, 38.5),
    antecedentes_familiares: pick([true, false]),
    fumador: pick([true, false]),
    consumo_alcohol: pick([true, false]),
    actividad_fisica: pick(['sedentario', 'moderada', 'activa']),
    diagnostico_preliminar: pick(DIAGNOSTICOS.slice(0, 10)),
    fecha_consulta: `2025-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
  }
}

function mutateRow(row: Record<string, any>, errorType: string): Record<string, any> {
  const r = { ...row }

  switch (errorType) {
    case 'null_values':
      const nullFields = ['glucosa', 'colesterol', 'peso', 'altura', 'temperatura', 'presion_sistolica', 'presion_diastolica', 'frecuencia_cardiaca', 'saturacion_oxigeno']
      const field = pick(nullFields)
      r[field] = pick(['', 'NULL', 'null', 'N/A', 'NaN', null, undefined])
      break

    case 'wrong_type':
      const typeField = pick(['edad', 'peso', 'altura', 'presion_sistolica'])
      const wrongTypes: Record<string, any> = {
        edad: pick(['Treinta', 'cuarenta y cinco', 'veinte', 'No sabe', '-', '30.5', 'Edad: 45']),
        peso: pick(['setenta y cinco', 'Peso ideal', '-', '75.5 kg', 'Muy pesado']),
        altura: pick(['un metro setenta', '170 cm', '-', 'Alto']),
        presion_sistolica: pick(['alta', 'normal', '-', '130/85', 'Presión: 140']),
      }
      r[typeField] = wrongTypes[typeField]
      break

    case 'outliers':
      const outlierField = pick(['peso', 'temperatura', 'altura', 'glucosa', 'presion_sistolica'])
      const outliers: Record<string, number> = {
        peso: pick([420, 0.5, -15, 850, 3]),
        temperatura: pick([28, 45, -5, 50, 20]),
        altura: pick([30, 500, -10, 10, 400]),
        glucosa: pick([0, 2000, -50, 5000]),
        presion_sistolica: pick([0, 400, -50, 500]),
      }
      r[outlierField] = outliers[outlierField]
      break

    case 'spelling':
      const diagCorrections: Record<string, string> = {
        'Hipertensión': pick(['hipertencion', 'hipertencíon', 'hipertension', 'hiperthension', 'hipertencio']),
        'Diabetes': pick(['diabètes', 'diabetès', 'diabetis', 'dibetes', 'diabetis']),
        'Obesidad': pick(['obesida', 'obecidad', 'obesedá', 'obecesidad']),
        'Sobrepeso': pick(['sobrepesito', 'sobrepeso leve', 'sobrepesoo']),
        'Dislipidemia': pick(['dislipitemia', 'dislipedimia', 'dislipidenia']),
        'Cardiopatía': pick(['cardiopatia', 'cardiopathia', 'cardipatía']),
        'asma': pick(['asmita', 'asma bronquial leve']),
        'Anemia': pick(['anèmia', 'anemía', 'anemi']),
      }
      r.diagnostico_preliminar = diagCorrections[r.diagnostico_preliminar] || pick(['hipertencion', 'diabète', 'obesida', 'coolesterol alto', 'presion alta'])
      break

    case 'duplicate':
      break

    case 'sex_errors':
      r.sexo = pick(['Masculino', 'Femenino', 'M', 'F', 'X', 'Otro', 'm', 'f', '1', '2', 'H', ''])
      break

    case 'date_errors':
      r.fecha_consulta = pick(['2025/13/01', '15-01-2025', 'Sin fecha', 'ayer', '2025-02-30', 'null', '2025-99-01'])
      break

    case 'boolean_errors':
      r.antecedentes_familiares = pick(['sí', 'no', 'si', '1', '0', 'true', 'false', 'Si', 'No', 'verdadero', 'falso', ''])
      r.fumador = pick(['fuma', 'no fuma', 'si', 'no', '1', '0', 'tabaquismo', '', 'a veces'])
      r.consumo_alcohol = pick(['bebe', 'no bebe', 'si', 'no', '1', '0', 'social', '', 'nunca'])
      break
  }

  return r
}

function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    const vals = headers.map(h => {
      const v = row[h]
      if (v === null || v === undefined) return ''
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    })
    lines.push(vals.join(','))
  }
  return lines.join('\n')
}

export async function GET() {
  try {
    const TOTAL = 1800
    const rows: Record<string, any>[] = []
    const errorsByType: Record<string, number> = {
      clean: 0,
      null_values: 0,
      wrong_type: 0,
      outliers: 0,
      spelling: 0,
      duplicate: 0,
      sex_errors: 0,
      date_errors: 0,
      boolean_errors: 0,
    }

    // Generate ~1500 clean rows
    const CLEAN_COUNT = 1500
    for (let i = 1; i <= CLEAN_COUNT; i++) {
      rows.push(generateCleanRow(i))
      errorsByType.clean++
    }

    // Generate rows with null values (~80)
    for (let i = 0; i < 80; i++) {
      const base = generateCleanRow(CLEAN_COUNT + i + 1)
      rows.push(mutateRow(base, 'null_values'))
      errorsByType.null_values++
    }

    // Generate rows with wrong types (~50)
    for (let i = 0; i < 50; i++) {
      const base = generateCleanRow(CLEAN_COUNT + 80 + i + 1)
      rows.push(mutateRow(base, 'wrong_type'))
      errorsByType.wrong_type++
    }

    // Generate rows with outliers (~40)
    for (let i = 0; i < 40; i++) {
      const base = generateCleanRow(CLEAN_COUNT + 130 + i + 1)
      rows.push(mutateRow(base, 'outliers'))
      errorsByType.outliers++
    }

    // Generate rows with spelling errors (~60)
    for (let i = 0; i < 60; i++) {
      const base = generateCleanRow(CLEAN_COUNT + 170 + i + 1)
      rows.push(mutateRow(base, 'spelling'))
      errorsByType.spelling++
    }

    // Generate duplicate rows (~30 pairs = 60 rows)
    for (let i = 0; i < 30; i++) {
      const base = generateCleanRow(CLEAN_COUNT + 230 + i + 1)
      rows.push(base)
      rows.push({ ...base })
      errorsByType.duplicate++
    }

    // Generate rows with sex errors (~30)
    for (let i = 0; i < 30; i++) {
      const base = generateCleanRow(CLEAN_COUNT + 260 + i + 1)
      rows.push(mutateRow(base, 'sex_errors'))
      errorsByType.sex_errors++
    }

    // Generate rows with date errors (~20)
    for (let i = 0; i < 20; i++) {
      const base = generateCleanRow(CLEAN_COUNT + 290 + i + 1)
      rows.push(mutateRow(base, 'date_errors'))
      errorsByType.date_errors++
    }

    // Generate rows with boolean errors (~20)
    for (let i = 0; i < 20; i++) {
      const base = generateCleanRow(CLEAN_COUNT + 310 + i + 1)
      rows.push(mutateRow(base, 'boolean_errors'))
      errorsByType.boolean_errors++
    }

    // Shuffle the rows
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]]
    }

    const csv = toCSV(rows)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="dataset_sucio_lula.csv"',
        'X-Total-Records': String(rows.length),
        'X-Errors-Summary': JSON.stringify(errorsByType),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}