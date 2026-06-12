export interface DirtyDatasetRow {
  id_paciente: number | string
  nombres: string
  apellidos: string
  edad: number | string
  sexo: string
  peso: number | string
  altura: number | string
  imc?: number | string
  presion_sistolica: number | string
  presion_diastolica: number | string
  frecuencia_cardiaca: number | string
  glucosa: number | string
  colesterol: number | string
  saturacion_oxigeno: number | string
  temperatura: number | string
  antecedentes_familiares: string | boolean
  fumador: string | boolean
  consumo_alcohol: string | boolean
  actividad_fisica: string
  diagnostico_preliminar: string
  riesgo_enfermedad?: string
  fecha_consulta: string
}

export interface DirtyDatasetStats {
  totalRegistros: number
  porTipoError: {
    limpios: number
    nulos: number
    duplicados: number
    tiposIncorrectos: number
    valoresAtipicos: number
    erroresOrtograficos: number
    erroresSexo: number
    erroresFecha: number
    erroresBoolean: number
  }
  tiempoGeneracion: number
}

const NOMBRES = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Lucía', 'Roberto', 'Sofía', 'Miguel', 'Elena', 'Fernando', 'Patricia', 'Andrés', 'Carmen', 'Ricardo', 'Laura', 'Diego', 'Valentina', 'Jorge', 'Camila', 'Luis', 'Daniela', 'Martín', 'Isabella', 'Alejandro', 'Gabriela', 'Rafael', 'Adriana', 'Sergio', 'Paula', 'Francisco', 'Claudia', 'Eduardo', 'Mónica', 'Manuel', 'Teresa', 'Pablo', 'Rosa', 'Javier', 'Gloria', 'Alfredo', 'Sandra', 'Arturo', 'Mariana', 'Enrique', 'Verónica', 'Rodrigo', 'Beatriz', 'Héctor', 'Alicia', 'Leonardo', 'Fernanda', 'Óscar', 'Luciana', 'Gustavo', 'Natalia', 'Rubén', 'Diana', 'Emilio', 'Claudia']
const APELLIDOS = ['García', 'López', 'Rodríguez', 'Martínez', 'Hernández', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Ortiz', 'Gutiérrez', 'Chávez', 'Ramos', 'Ruiz', 'Vargas', 'Castillo', 'Jiménez', 'Moreno', 'Romero', 'Herrera', 'Medina', 'Aguilar', 'Vega', 'Castro', 'Mendoza', 'Silva', 'Paredes', 'Núñez', 'Salazar', 'Carrasco', 'Aguirre', 'Delgado', 'Rojas', 'Espinoza', 'Yáñez', 'Fuentes', 'Cortés']
const DIAGNOSTICOS_LIMPIOS = ['Hipertensión Arterial', 'Diabetes Mellitus Tipo 2', 'Obesidad', 'Sobrepeso', 'Dislipidemia', 'Cardiopatía Isquémica', 'Asma Bronquial', 'Anemia', 'Chequeo Preventivo', 'Insuficiencia Renal Crónica', 'Depresión', 'Artritis Reumatoide', 'Hipotiroidismo', 'Migraña', 'Bronquitis Aguda']
const ACTIVIDADES = ['sedentario', 'moderada', 'activa']

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min: number, max: number, dec = 1): number { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)) }

function generarFechaConsulta(): string {
  const y = 2024 + (Math.random() > 0.5 ? 1 : 0)
  const m = rand(1, 12)
  const d = rand(1, 28)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function calcularIMC(peso: number, altura: number): number {
  const alturaM = altura / 100
  return Math.round((peso / (alturaM * alturaM)) * 100) / 100
}

function calcularRiesgo(edad: number, peso: number, altura: number, presionSist: number, presionDiast: number, glucosa: number, colesterol: number, fc: number, spo2: number, temp: number, antecedentes: boolean, fumador: boolean, alcohol: boolean, actividad: string): string {
  let score = 0
  if (edad > 60) score += 3; else if (edad > 45) score += 2; else if (edad > 30) score += 1
  const imc = calcularIMC(peso, altura)
  if (imc >= 40) score += 4; else if (imc >= 35) score += 3; else if (imc >= 30) score += 2; else if (imc >= 25) score += 1
  if (presionSist >= 180) score += 4; else if (presionSist >= 160) score += 3; else if (presionSist >= 140) score += 2; else if (presionSist >= 130) score += 1
  if (presionDiast >= 120) score += 3; else if (presionDiast >= 90) score += 2; else if (presionDiast >= 80) score += 1
  if (glucosa > 300) score += 4; else if (glucosa > 200) score += 3; else if (glucosa > 140) score += 2; else if (glucosa > 100) score += 1
  if (colesterol > 300) score += 3; else if (colesterol > 240) score += 2; else if (colesterol > 200) score += 1
  if (fc > 120 || fc < 50) score += 3; else if (fc > 100 || fc < 60) score += 1
  if (spo2 < 85) score += 4; else if (spo2 < 90) score += 3; else if (spo2 < 95) score += 1
  if (temp > 39 || temp < 35) score += 3; else if (temp > 38) score += 1
  if (antecedentes) score += 2
  if (fumador) score += 3
  if (alcohol) score += 2
  if (actividad === 'sedentario') score += 2
  if (actividad === 'activa') score -= 1
  if (score >= 15) return 'Critico'
  if (score >= 10) return 'Alto'
  if (score >= 5) return 'Medio'
  return 'Bajo'
}

function generarRegistroLimpio(id: number): DirtyDatasetRow {
  const sexo = pick(['Masculino', 'Femenino'])
  const edad = rand(1, 90)
  const peso = sexo === 'Masculino' ? rand(55, 120) : rand(42, 95)
  const altura = sexo === 'Masculino' ? rand(155, 195) : rand(145, 180)
  const presionSist = rand(100, 180)
  const presionDiast = rand(60, 110)
  const fc = rand(55, 110)
  const glucosa = rand(70, 250)
  const colesterol = rand(140, 320)
  const spo2 = rand(88, 100)
  const temp = randFloat(35.5, 38.5)
  const antFam = pick([true, false])
  const fumador = pick([true, false])
  const alcohol = pick([true, false])
  const actividad = pick(ACTIVIDADES)

  return {
    id_paciente: id,
    nombres: pick(NOMBRES),
    apellidos: `${pick(APELLIDOS)} ${pick(APELLIDOS)}`,
    edad,
    sexo,
    peso,
    altura,
    imc: calcularIMC(peso, altura),
    presion_sistolica: presionSist,
    presion_diastolica: presionDiast,
    frecuencia_cardiaca: fc,
    glucosa,
    colesterol,
    saturacion_oxigeno: spo2,
    temperatura: temp,
    antecedentes_familiares: antFam,
    fumador,
    consumo_alcohol: alcohol,
    actividad_fisica: actividad,
    diagnostico_preliminar: pick(DIAGNOSTICOS_LIMPIOS),
    riesgo_enfermedad: calcularRiesgo(edad, peso, altura, presionSist, presionDiast, glucosa, colesterol, fc, spo2, temp, antFam, fumador, alcohol, actividad),
    fecha_consulta: generarFechaConsulta(),
  }
}

function injectNulos(row: DirtyDatasetRow): DirtyDatasetRow {
  const r = { ...row }
  const campos = ['glucosa', 'colesterol', 'peso', 'altura', 'temperatura', 'presion_sistolica', 'presion_diastolica', 'frecuencia_cardiaca', 'saturacion_oxigeno']
  const campo = pick(campos)
  const nulo = pick(['', 'NULL', 'null', 'N/A', 'NaN', null])
  ;(r as any)[campo] = nulo
  return r
}

function injectTiposIncorrectos(row: DirtyDatasetRow): DirtyDatasetRow {
  const r = { ...row }
  const tipo = pick(['edad', 'peso', 'altura', 'presion_sistolica', 'glucosa'])
  const valores: Record<string, any> = {
    edad: pick(['Treinta', 'cuarenta y cinco', 'No sabe', '-', 'Edad: 45', '30.5', '?']),
    peso: pick(['setenta y cinco', 'Peso ideal', '-', '75.5 kg', 'Muy pesado']),
    altura: pick(['un metro setenta', '170 cm', '-', 'Alto', 'Buena estatura']),
    presion_sistolica: pick(['alta', 'normal', '-', '130/85', 'Presión elevada']),
    glucosa: pick(['alta', 'normal', '-', '100 mg/dL', 'Controlada']),
  }
  ;(r as any)[tipo] = valores[tipo]
  return r
}

function injectValoresAtipicos(row: DirtyDatasetRow): DirtyDatasetRow {
  const r = { ...row }
  const campo = pick(['peso', 'temperatura', 'altura', 'glucosa', 'presion_sistolica'])
  const atipicos: Record<string, any> = {
    peso: pick([420, 0.5, -15, 850, 3, 999]),
    temperatura: pick([28, 45, -5, 50, 20, 60]),
    altura: pick([30, 500, -10, 10, 400, 5]),
    glucosa: pick([0, 2000, -50, 5000, 9999]),
    presion_sistolica: pick([0, 400, -50, 500, 999]),
  }
  ;(r as any)[campo] = atipicos[campo]
  return r
}

function injectErroresOrtograficos(row: DirtyDatasetRow): DirtyDatasetRow {
  const r = { ...row }
  const corruptos: Record<string, string[]> = {
    'Hipertensión Arterial': ['hipertencion', 'hipertencíon', 'hipertension', 'hiperthension', 'hipertencio', 'hipertensión arteria'],
    'Diabetes Mellitus Tipo 2': ['diabètes', 'diabetès', 'diabetis', 'dibetes', 'diabetis tipo 2', 'diabetes tipo II'],
    'Obesidad': ['obesida', 'obecidad', 'obesedá', 'obecesidad', 'obesidad grado I'],
    'Sobrepeso': ['sobrepesito', 'sobrepeso grado', 'sobrepesoo', 'sobrepeso leve'],
    'Dislipidemia': ['dislipitemia', 'dislipedimia', 'dislipidenia', 'dislipidemía'],
    'Cardiopatía Isquémica': ['cardiopatia', 'cardiopathia', 'cardipatía', 'cardiopatia isquemica'],
    'Asma Bronquial': ['asmita', 'asma bronquial leve', 'asma crónica'],
    'Anemia': ['anèmia', 'anemía', 'anemi', 'anemia ferropénica'],
  }
  const opciones = corruptos[row.diagnostico_preliminar]
  if (opciones) {
    r.diagnostico_preliminar = pick(opciones)
  } else {
    r.diagnostico_preliminar = pick(['hipertencion', 'diabète', 'obesida', 'coolesterol alto', 'presion alta', 'azúcar alta'])
  }
  return r
}

function injectErroresSexo(row: DirtyDatasetRow): DirtyDatasetRow {
  const r = { ...row }
  r.sexo = pick(['M', 'F', 'H', 'X', 'Otro', 'm', 'f', '1', '2', '', 'Masculino', 'Femenino', 'Hombre', 'Mujer', 'varón', 'dama', 'MASCULINO', 'FEMENINO'])
  return r
}

function injectErroresFecha(row: DirtyDatasetRow): DirtyDatasetRow {
  const r = { ...row }
  r.fecha_consulta = pick([
    '2025/13/01', '15-01-2025', 'Sin fecha', 'ayer',
    '2025-02-30', 'null', '2025-99-01', '01/01/2025',
    '2025-1-5', '32/12/2024', '2024-00-00',
  ])
  return r
}

function injectErroresBoolean(row: DirtyDatasetRow): DirtyDatasetRow {
  const r = { ...row }
  r.antecedentes_familiares = pick(['sí', 'no', 'si', '1', '0', 'true', 'false', 'Si', 'No', 'verdadero', 'falso', ''])
  r.fumador = pick(['fuma', 'no fuma', 'si', 'no', '1', '0', 'tabaquismo', '', 'a veces', 'true', 'false'])
  r.consumo_alcohol = pick(['bebe', 'no bebe', 'si', 'no', '1', '0', 'social', '', 'nunca', 'true', 'false'])
  return r
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generarDatasetSucio(totalRegistros: number = 1800): { rows: DirtyDatasetRow[]; stats: DirtyDatasetStats } {
  const startTime = Date.now()
  const rows: DirtyDatasetRow[] = []
  const stats = {
    totalRegistros,
    porTipoError: {
      limpios: 0,
      nulos: 0,
      duplicados: 0,
      tiposIncorrectos: 0,
      valoresAtipicos: 0,
      erroresOrtograficos: 0,
      erroresSexo: 0,
      erroresFecha: 0,
      erroresBoolean: 0,
    },
    tiempoGeneracion: 0,
  }

  const CLEAN_RATIO = 0.75
  const cleanCount = Math.floor(totalRegistros * CLEAN_RATIO)
  const dirtyCount = totalRegistros - cleanCount

  for (let i = 1; i <= cleanCount; i++) {
    rows.push(generarRegistroLimpio(i))
    stats.porTipoError.limpios++
  }

  const erroresPorTipo = Math.floor(dirtyCount / 8)
  let id = cleanCount + 1

  for (let i = 0; i < erroresPorTipo; i++) {
    rows.push(injectNulos(generarRegistroLimpio(id++)))
    stats.porTipoError.nulos++
  }
  for (let i = 0; i < erroresPorTipo; i++) {
    rows.push(injectTiposIncorrectos(generarRegistroLimpio(id++)))
    stats.porTipoError.tiposIncorrectos++
  }
  for (let i = 0; i < Math.floor(erroresPorTipo * 0.7); i++) {
    rows.push(injectValoresAtipicos(generarRegistroLimpio(id++)))
    stats.porTipoError.valoresAtipicos++
  }
  for (let i = 0; i < erroresPorTipo; i++) {
    rows.push(injectErroresOrtograficos(generarRegistroLimpio(id++)))
    stats.porTipoError.erroresOrtograficos++
  }
  for (let i = 0; i < Math.floor(erroresPorTipo * 0.5); i++) {
    rows.push(injectErroresSexo(generarRegistroLimpio(id++)))
    stats.porTipoError.erroresSexo++
  }
  for (let i = 0; i < Math.floor(erroresPorTipo * 0.4); i++) {
    rows.push(injectErroresFecha(generarRegistroLimpio(id++)))
    stats.porTipoError.erroresFecha++
  }
  for (let i = 0; i < Math.floor(erroresPorTipo * 0.4); i++) {
    rows.push(injectErroresBoolean(generarRegistroLimpio(id++)))
    stats.porTipoError.erroresBoolean++
  }

  const dupCount = Math.floor(erroresPorTipo * 0.7)
  const dupSource = rows.slice(0, dupCount)
  for (const d of dupSource) {
    rows.push({ ...d })
    stats.porTipoError.duplicados++
  }

  const shuffled = shuffleArray(rows)
  stats.tiempoGeneracion = parseFloat(((Date.now() - startTime) / 1000).toFixed(2))

  return { rows: shuffled, stats }
}

export function datasetToCSV(rows: DirtyDatasetRow[]): string {
  const headers = [
    'id_paciente', 'nombres', 'apellidos', 'edad', 'sexo', 'peso', 'altura', 'imc',
    'presion_sistolica', 'presion_diastolica', 'frecuencia_cardiaca', 'glucosa',
    'colesterol', 'saturacion_oxigeno', 'temperatura', 'antecedentes_familiares',
    'fumador', 'consumo_alcohol', 'actividad_fisica', 'diagnostico_preliminar',
    'riesgo_enfermedad', 'fecha_consulta',
  ]

  const lines = [headers.join(',')]
  for (const row of rows) {
    const vals = headers.map(h => {
      const v = (row as any)[h]
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