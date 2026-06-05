import { Paciente, PacienteFormData } from '@/types/pacientes'

export function calcularIMC(peso: number, altura: number): number {
  const alturaM = altura / 100
  return Math.round((peso / (alturaM * alturaM)) * 100) / 100
}

export function clasificarIMC(imc: number): string {
  if (imc < 18.5) return 'Bajo peso'
  if (imc < 25) return 'Normal'
  if (imc < 30) return 'Sobrepeso'
  if (imc < 35) return 'Obesidad Grado I'
  if (imc < 40) return 'Obesidad Grado II'
  return 'Obesidad Grado III'
}

export function calcularRiesgo(p: PacienteFormData | {
  edad: number; peso: number; altura: number
  presion_sistolica: number; presion_diastolica: number
  glucosa: number; colesterol: number; saturacion_oxigeno: number
  frecuencia_cardiaca: number; temperatura: number
  antecedentes_familiares?: boolean; fumador?: boolean; consumo_alcohol?: boolean
  actividad_fisica?: string
}): { nivel: string; score: number; detalles: string[] } {
  let score = 0
  const detalles: string[] = []

  if (p.edad > 60) { score += 3; detalles.push('Edad >60') }
  else if (p.edad > 45) { score += 2; detalles.push('Edad 45-60') }
  else if (p.edad > 30) { score += 1; detalles.push('Edad 31-45') }

  const imc = calcularIMC(p.peso, p.altura)
  if (imc >= 40) { score += 4; detalles.push(`Obesidad III (IMC ${imc.toFixed(1)})`) }
  else if (imc >= 35) { score += 3; detalles.push(`Obesidad II (IMC ${imc.toFixed(1)})`) }
  else if (imc >= 30) { score += 2; detalles.push(`Obesidad I (IMC ${imc.toFixed(1)})`) }
  else if (imc >= 25) { score += 1; detalles.push(`Sobrepeso (IMC ${imc.toFixed(1)})`) }

  if (p.presion_sistolica >= 180) { score += 4; detalles.push(`Crisis HTA (${p.presion_sistolica})`) }
  else if (p.presion_sistolica >= 160) { score += 3; detalles.push(`HTA severa (${p.presion_sistolica})`) }
  else if (p.presion_sistolica >= 140) { score += 2; detalles.push(`Hipertenso (${p.presion_sistolica})`) }
  else if (p.presion_sistolica >= 130) { score += 1; detalles.push(`PA limítrofe (${p.presion_sistolica})`) }

  if (p.presion_diastolica >= 120) { score += 3; detalles.push(`PAD ${p.presion_diastolica}`) }
  else if (p.presion_diastolica >= 90) { score += 2; detalles.push(`PAD ${p.presion_diastolica}`) }
  else if (p.presion_diastolica >= 80) { score += 1; detalles.push(`PAD ${p.presion_diastolica}`) }

  if (p.glucosa > 300) { score += 4; detalles.push(`Glucosa crítica (${p.glucosa})`) }
  else if (p.glucosa > 200) { score += 3; detalles.push(`Glucosa alta (${p.glucosa})`) }
  else if (p.glucosa > 140) { score += 2; detalles.push(`Glucosa elevada (${p.glucosa})`) }
  else if (p.glucosa > 100) { score += 1; detalles.push(`Glucosa limítrofe (${p.glucosa})`) }

  if (p.colesterol > 300) { score += 3; detalles.push(`Colesterol crítico (${p.colesterol})`) }
  else if (p.colesterol > 240) { score += 2; detalles.push(`Colesterol alto (${p.colesterol})`) }
  else if (p.colesterol > 200) { score += 1; detalles.push(`Colesterol limítrofe (${p.colesterol})`) }

  if (p.frecuencia_cardiaca > 120 || p.frecuencia_cardiaca < 50) { score += 3; detalles.push(`FC anormal (${p.frecuencia_cardiaca})`) }
  else if (p.frecuencia_cardiaca > 100 || p.frecuencia_cardiaca < 60) { score += 1; detalles.push(`FC limítrofe (${p.frecuencia_cardiaca})`) }

  if (p.saturacion_oxigeno < 85) { score += 4; detalles.push(`Hipoxemia severa (${p.saturacion_oxigeno}%)`) }
  else if (p.saturacion_oxigeno < 90) { score += 3; detalles.push(`Hipoxemia (${p.saturacion_oxigeno}%)`) }
  else if (p.saturacion_oxigeno < 95) { score += 1; detalles.push(`SpO2 limítrofe (${p.saturacion_oxigeno}%)`) }

  if (p.temperatura > 39 || p.temperatura < 35) { score += 3; detalles.push(`Temp crítica (${p.temperatura}°C)`) }
  else if (p.temperatura > 38) { score += 1; detalles.push(`Febrícula (${p.temperatura}°C)`) }

  if (p.antecedentes_familiares) { score += 2; detalles.push('Antecedentes') }
  if (p.fumador) { score += 3; detalles.push('Fumador') }
  if (p.consumo_alcohol) { score += 2; detalles.push('Alcohol') }
  if (p.actividad_fisica === 'sedentario') { score += 2; detalles.push('Sedentario') }
  if (p.actividad_fisica === 'activa') { score -= 1; detalles.push('Activo') }

  let nivel = 'Bajo'
  if (score >= 15) nivel = 'Critico'
  else if (score >= 10) nivel = 'Alto'
  else if (score >= 5) nivel = 'Medio'

  return { nivel, score, detalles }
}

export function getRiesgoCalculado(p: {
  edad: number; peso: number; altura: number
  presion_sistolica: number; presion_diastolica: number
  glucosa: number; colesterol: number; saturacion_oxigeno: number
  frecuencia_cardiaca: number; temperatura: number
  antecedentes_familiares?: boolean; fumador?: boolean; consumo_alcohol?: boolean
  actividad_fisica?: string
}): string {
  return calcularRiesgo(p).nivel
}

export function calcularRiesgoScore(p: PacienteFormData): number {
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
  if (p.actividad_fisica === 'activa') score--;

  return score
}

export function generarFactoresRiesgo(p: PacienteFormData): string[] {
  const factores: string[] = []
  const imc = calcularIMC(p.peso, p.altura)

  if (p.edad > 60) factores.push('Edad avanzada (+60 años)')
  else if (p.edad > 45) factores.push('Edad de riesgo (+45 años)')
  if (imc >= 30) factores.push(`Obesidad (IMC: ${imc.toFixed(1)})`)
  if (imc >= 25 && imc < 30) factores.push(`Sobrepeso (IMC: ${imc.toFixed(1)})`)
  if (p.presion_sistolica >= 140) factores.push(`Hipertensión arterial (${p.presion_sistolica}/${p.presion_diastolica})`)
  if (p.glucosa > 140) factores.push(`Glucosa elevada (${p.glucosa} mg/dL)`)
  if (p.colesterol > 240) factores.push(`Colesterol alto (${p.colesterol} mg/dL)`)
  if (p.frecuencia_cardiaca > 100) factores.push(`Taquicardia (${p.frecuencia_cardiaca} lpm)`)
  if (p.frecuencia_cardiaca < 60) factores.push(`Bradicardia (${p.frecuencia_cardiaca} lpm)`)
  if (p.saturacion_oxigeno < 90) factores.push(`Hipoxemia (SpO2: ${p.saturacion_oxigeno}%)`)
  if (p.temperatura > 38) factores.push(`Febrícula/Fiebre (${p.temperatura}°C)`)
  if (p.antecedentes_familiares) factores.push('Antecedentes familiares de enfermedades crónicas')
  if (p.fumador) factores.push('Tabaquismo activo')
  if (p.consumo_alcohol) factores.push('Consumo regular de alcohol')
  if (p.actividad_fisica === 'sedentario') factores.push('Estilo de vida sedentario')

  return factores
}

export function generarRecomendaciones(riesgo: string, factores: string[]): string[] {
  const recomendaciones: string[] = [
    'Mantener una dieta equilibrada rica en frutas, verduras y proteínas magras',
    'Realizar actividad física moderada al menos 30 minutos al día',
    'Controlar periódicamente los signos vitales',
  ]

  if (riesgo === 'Critico' || riesgo === 'Alto') {
    recomendaciones.push('Buscar atención médica inmediata')
    recomendaciones.push('Realizar estudios complementarios de laboratorio')
    recomendaciones.push('Evaluación por especialista en medicina interna')
    recomendaciones.push('Monitoreo continuo de signos vitales')
  }

  if (factores.some(f => f.includes('Hipertensión'))) {
    recomendaciones.push('Reducir el consumo de sodio en la dieta')
    recomendaciones.push('Tomar medicamentos antihipertensivos según indicación médica')
  }
  if (factores.some(f => f.includes('Glucosa'))) {
    recomendaciones.push('Controlar el consumo de azúcares refinados')
    recomendaciones.push('Realizar prueba de tolerancia a la glucosa')
  }
  if (factores.some(f => f.includes('Colesterol'))) {
    recomendaciones.push('Reducir consumo de grasas saturadas y trans')
    recomendaciones.push('Incluir ácidos grasos omega-3 en la dieta')
  }
  if (factores.some(f => f.includes('Tabaquismo'))) {
    recomendaciones.push('Buscar programas de cesación tabáquica')
    recomendaciones.push('Evitar ambientes con humo de tabaco')
  }
  if (factores.some(f => f.includes('sedentario'))) {
    recomendaciones.push('Caminar al menos 30 minutos diarios')
    recomendaciones.push('Incorporar ejercicios de resistencia y flexibilidad')
  }
  if (factores.some(f => f.includes('alcohol'))) {
    recomendaciones.push('Reducir progresivamente el consumo de alcohol')
    recomendaciones.push('Buscar apoyo profesional si es necesario')
  }
  if (factores.some(f => f.includes('Obesidad') || f.includes('Sobrepeso'))) {
    recomendaciones.push('Consultar con un nutriólogo para plan de alimentación personalizado')
    recomendaciones.push('Establecer meta de pérdida de peso gradual del 5-10%')
  }

  return recomendaciones
}

export function generarExplicacion(riesgo: string, score: number, factores: string[]): string {
  const nivel = riesgo.toLowerCase()
  if (nivel === 'critico') {
    return `El paciente presenta un puntaje de riesgo de ${score}/30, indicando una condición crítica. Se detectaron ${factores.length} factores de riesgo significativos que requieren intervención médica inmediata. La probabilidad de complicaciones graves es elevada y se recomienda hospitalización.`
  }
  if (nivel === 'alto') {
    return `El paciente presenta un puntaje de riesgo de ${score}/30, considerado alto. Con ${factores.length} factores de riesgo identificados, existe una probabilidad significativa de desarrollar complicaciones cardiovasculares o metabólicas. Se requiere seguimiento médico cercano.`
  }
  if (nivel === 'medio') {
    return `El paciente presenta un puntaje de riesgo de ${score}/30, considerado moderado. Se identificaron ${factores.length} factores de riesgo que pueden ser controlados con cambios en el estilo de vida y seguimiento médico regular.`
  }
  return `El paciente presenta un puntaje de riesgo de ${score}/30, considerado bajo. Con ${factores.length} factores de riesgo mínimos, el pronóstico es favorable. Se recomienda mantener hábitos saludables y chequeos regulares.`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getRiesgoColor(riesgo: string): string {
  switch (riesgo.toLowerCase()) {
    case 'bajo': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'medio': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'alto': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'critico': return 'bg-rose-600/20 text-rose-300 border-rose-600/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

export const PACIENTES_EVENT = 'lula:pacientes-updated'

export function emitirCambioPacientes() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PACIENTES_EVENT))
  }
}

export function suscribirCambioPacientes(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(PACIENTES_EVENT, callback)
  return () => window.removeEventListener(PACIENTES_EVENT, callback)
}

export function getRiesgoBg(riesgo: string): string {
  switch (riesgo.toLowerCase()) {
    case 'bajo': return 'from-emerald-900/40 to-emerald-800/20'
    case 'medio': return 'from-amber-900/40 to-amber-800/20'
    case 'alto': return 'from-red-900/40 to-red-800/20'
    case 'critico': return 'from-rose-900/40 to-rose-800/20'
    default: return 'from-gray-900/40 to-gray-800/20'
  }
}

export const diagnosticosEstandarizados: Record<string, string> = {
  'hipertension': 'Hipertensión Arterial',
  'hipertensión': 'Hipertensión Arterial',
  'presion alta': 'Hipertensión Arterial',
  'presión alta': 'Hipertensión Arterial',
  'hta': 'Hipertensión Arterial',
  'diabetes': 'Diabetes Mellitus Tipo 2',
  'diabetes tipo 2': 'Diabetes Mellitus Tipo 2',
  'dm2': 'Diabetes Mellitus Tipo 2',
  'diabete': 'Diabetes Mellitus Tipo 2',
  'obesidad': 'Obesidad',
  'obesidad grado i': 'Obesidad Grado I',
  'obesidad grado ii': 'Obesidad Grado II',
  'obesidad grado iii': 'Obesidad Grado III',
  'sobrepeso': 'Sobrepeso',
  'dislipidemia': 'Dislipidemia',
  'colesterol alto': 'Dislipidemia',
  'hipercolesterolemia': 'Dislipidemia',
  'cardiopatia': 'Cardiopatía Isquémica',
  'cardiopatía': 'Cardiopatía Isquémica',
  'cardiopatia isquemica': 'Cardiopatía Isquémica',
  'cardiopatía isquémica': 'Cardiopatía Isquémica',
  'epoc': 'Enfermedad Pulmonar Obstructiva Crónica',
  'enfermedad pulmonar': 'Enfermedad Pulmonar Obstructiva Crónica',
  'asma': 'Asma Bronquial',
  'insuficiencia renal': 'Insuficiencia Renal Crónica',
  'irc': 'Insuficiencia Renal Crónica',
  'anemia': 'Anemia',
  'hipotiroidismo': 'Hipotiroidismo',
  'hipertiroidismo': 'Hipertiroidismo',
  'artritis': 'Artritis Reumatoide',
  'osteoporosis': 'Osteoporosis',
  'depresion': 'Depresión',
  'depresión': 'Depresión',
  'ansiedad': 'Trastorno de Ansiedad',
  'infeccion urinaria': 'Infección del Tracto Urinario',
  'itu': 'Infección del Tracto Urinario',
  'gastroenteritis': 'Gastroenteritis Aguda',
  'neumonia': 'Neumonía Adquirida en la Comunidad',
  'neumonía': 'Neumonía Adquirida en la Comunidad',
  'bronquitis': 'Bronquitis Aguda',
  'migraña': 'Migraña',
  'cefalea': 'Cefalea Tensional',
  'lumbalgia': 'Lumbalgia Mecánica',
}

export function estandarizarDiagnostico(diagnostico: string): string {
  const limpio = diagnostico.toLowerCase().trim()
  return diagnosticosEstandarizados[limpio] || diagnostico
}

export interface PrediccionDiagnostico {
  condicion: string
  descripcion: string
  probabilidad: number
  evidencia: string[]
  nivel: 'critico' | 'alto' | 'medio' | 'bajo'
}

function clasificarNivel(prob: number): 'critico' | 'alto' | 'medio' | 'bajo' {
  if (prob >= 75) return 'critico'
  if (prob >= 55) return 'alto'
  if (prob >= 35) return 'medio'
  return 'bajo'
}

export function predecirDiagnostico(p: {
  edad: number; sexo: string; peso: number; altura: number
  presion_sistolica: number; presion_diastolica: number
  glucosa: number; colesterol: number; saturacion_oxigeno: number
  frecuencia_cardiaca: number; temperatura: number
  antecedentes_familiares?: boolean; fumador?: boolean; consumo_alcohol?: boolean
  imc?: number
}): PrediccionDiagnostico[] {
  const imc = p.imc ?? calcularIMC(p.peso, p.altura)
  const predicciones: PrediccionDiagnostico[] = []

  const htaEv: string[] = []
  let htaBase = 0
  if (p.presion_sistolica >= 180 || p.presion_diastolica >= 110) {
    htaEv.push(`Crisis hipertensiva (${p.presion_sistolica}/${p.presion_diastolica} mmHg)`)
    htaBase = 95
  } else if (p.presion_sistolica >= 160 || p.presion_diastolica >= 100) {
    htaEv.push(`HTA severa (${p.presion_sistolica}/${p.presion_diastolica} mmHg)`)
    htaBase = 90
  } else if (p.presion_sistolica >= 140 || p.presion_diastolica >= 90) {
    htaEv.push(`Hipertenso (PA ${p.presion_sistolica}/${p.presion_diastolica} mmHg)`)
    htaBase = 84
  } else if (p.presion_sistolica >= 130 || p.presion_diastolica >= 85) {
    htaEv.push(`Pre-hipertensión (PA ${p.presion_sistolica}/${p.presion_diastolica} mmHg)`)
    htaBase = 55
  }
  if (p.edad >= 60) htaEv.push('Edad avanzada (≥60)')
  else if (p.edad >= 45) htaEv.push('Edad de riesgo (≥45)')
  if (imc >= 30) htaEv.push(`Obesidad (IMC ${imc.toFixed(1)})`)
  if (p.antecedentes_familiares) htaEv.push('Antecedentes familiares')
  if (p.fumador) htaEv.push('Tabaquismo activo')
  if (p.consumo_alcohol) htaEv.push('Consumo de alcohol')
  if (p.colesterol > 200) htaEv.push('Colesterol elevado')
  if (htaEv.length > 0) {
    const prob = Math.min(98, htaBase + (htaEv.length - 1) * 1.5)
    predicciones.push({
      condicion: htaBase >= 84 ? 'Hipertenso' : 'Riesgo de Hipertensión',
      descripcion: 'El paciente puede sufrir de presión arterial alta. Se recomienda control médico periódico y dieta baja en sodio.',
      probabilidad: prob,
      evidencia: htaEv,
      nivel: clasificarNivel(prob),
    })
  }

  const dmEv: string[] = []
  let dmBase = 0
  if (p.glucosa >= 200) {
    dmEv.push(`Diabetes descompensada (Glucosa ${p.glucosa} mg/dL)`)
    dmBase = 94
  } else if (p.glucosa > 126) {
    dmEv.push(`Diabetes mellitus (Glucosa ${p.glucosa} mg/dL en ayunas)`)
    dmBase = 88
  } else if (p.glucosa > 110) {
    dmEv.push(`Glucosa alterada en ayunas (${p.glucosa} mg/dL)`)
    dmBase = 65
  } else if (p.glucosa > 100) {
    dmEv.push(`Prediabetes (Glucosa ${p.glucosa} mg/dL)`)
    dmBase = 45
  }
  if (p.edad >= 45) dmEv.push('Edad de riesgo (≥45)')
  if (imc >= 30) dmEv.push(`Obesidad (IMC ${imc.toFixed(1)})`)
  else if (imc >= 25) dmEv.push(`Sobrepeso (IMC ${imc.toFixed(1)})`)
  if (p.antecedentes_familiares) dmEv.push('Antecedentes familiares de diabetes')
  if (p.presion_sistolica >= 140) dmEv.push('HTA asociada')
  if (p.colesterol > 200) dmEv.push('Dislipidemia asociada')
  if (dmEv.length > 0) {
    const prob = Math.min(96, dmBase + (dmEv.length - 1) * 1.5)
    predicciones.push({
      condicion: dmBase >= 65 ? 'Puede sufrir del azúcar (Diabetes)' : 'Riesgo de Diabetes',
      descripcion: 'El paciente puede desarrollar diabetes mellitus. Se recomienda control glucémico, dieta baja en azúcares y ejercicio regular.',
      probabilidad: prob,
      evidencia: dmEv,
      nivel: clasificarNivel(prob),
    })
  }

  const obEv: string[] = []
  let obCond = '', obBase = 0
  if (imc >= 40) { obCond = 'Obesidad Mórbida (Grado III)'; obBase = 96 }
  else if (imc >= 35) { obCond = 'Obesidad Severa (Grado II)'; obBase = 90 }
  else if (imc >= 30) { obCond = 'Obesidad (Grado I)'; obBase = 84 }
  else if (imc >= 25) { obCond = 'Sobrepeso'; obBase = 68 }
  if (obCond) {
    obEv.push(`IMC ${imc.toFixed(1)} kg/m²`)
    if (p.presion_sistolica >= 140) obEv.push('HTA asociada')
    if (p.glucosa > 100) obEv.push('Glucosa alterada')
    if (p.colesterol > 200) obEv.push('Colesterol elevado')
    const prob = Math.min(98, obBase)
    predicciones.push({
      condicion: obCond,
      descripcion: 'El paciente presenta un índice de masa corporal elevado. Se recomienda valoración nutricional y plan de ejercicio supervisado.',
      probabilidad: prob,
      evidencia: obEv,
      nivel: clasificarNivel(prob),
    })
  }

  const colEv: string[] = []
  let colBase = 0
  if (p.colesterol >= 280) { colEv.push(`Hipercolesterolemia severa (${p.colesterol} mg/dL)`); colBase = 90 }
  else if (p.colesterol > 240) { colEv.push(`Colesterol alto (${p.colesterol} mg/dL)`); colBase = 82 }
  else if (p.colesterol > 200) { colEv.push(`Colesterol límite alto (${p.colesterol} mg/dL)`); colBase = 58 }
  if (imc >= 30) colEv.push('Obesidad')
  if (p.fumador) colEv.push('Tabaquismo')
  if (p.antecedentes_familiares) colEv.push('Antecedentes familiares')
  if (p.presion_sistolica >= 140) colEv.push('HTA')
  if (colEv.length > 0) {
    const prob = Math.min(94, colBase + (colEv.length - 1) * 1.5)
    predicciones.push({
      condicion: colBase >= 80 ? 'Dislipidemia / Colesterol alto' : 'Riesgo de Colesterol alto',
      descripcion: 'El paciente puede presentar niveles elevados de colesterol. Se recomienda dieta baja en grasas saturadas y control lipídico.',
      probabilidad: prob,
      evidencia: colEv,
      nivel: clasificarNivel(prob),
    })
  }

  const cvEv: string[] = []
  if (p.edad >= 55) cvEv.push('Edad avanzada')
  if (p.edad >= 45 && p.sexo === 'Masculino') cvEv.push('Sexo masculino ≥45')
  if (p.edad >= 55 && p.sexo === 'Femenino') cvEv.push('Sexo femenino ≥55')
  if (p.presion_sistolica >= 140) cvEv.push('Hipertensión')
  if (p.colesterol > 200) cvEv.push('Colesterol elevado')
  if (p.glucosa > 126) cvEv.push('Diabetes')
  if (p.fumador) cvEv.push('Tabaquismo')
  if (p.antecedentes_familiares) cvEv.push('Antecedentes familiares')
  if (imc >= 30) cvEv.push('Obesidad')
  if (cvEv.length >= 3) {
    const prob = Math.min(88, 45 + cvEv.length * 6)
    predicciones.push({
      condicion: 'Riesgo Cardiovascular Elevado',
      descripcion: 'El paciente presenta múltiples factores de riesgo cardiovascular. Requiere evaluación cardiológica completa y cambio de estilo de vida.',
      probabilidad: prob,
      evidencia: cvEv,
      nivel: clasificarNivel(prob),
    })
  }

  const smEv: string[] = []
  const tieneHTA = p.presion_sistolica >= 130 || p.presion_diastolica >= 85
  const tieneObesidadCentral = imc >= 30
  const tieneGlucosaAlta = p.glucosa >= 100
  const tieneTrigliceridos = p.colesterol > 200
  if (tieneHTA) smEv.push('PA elevada')
  if (tieneObesidadCentral) smEv.push('Obesidad')
  if (tieneGlucosaAlta) smEv.push('Glucosa basal alterada')
  if (tieneTrigliceridos) smEv.push('Colesterol elevado')
  if ([tieneHTA, tieneObesidadCentral, tieneGlucosaAlta, tieneTrigliceridos].filter(Boolean).length >= 3) {
    const prob = Math.min(86, 60 + smEv.length * 5)
    predicciones.push({
      condicion: 'Síndrome Metabólico',
      descripcion: 'El paciente cumple múltiples criterios de síndrome metabólico. Alto riesgo de enfermedad cardiovascular y diabetes tipo 2.',
      probabilidad: prob,
      evidencia: smEv,
      nivel: clasificarNivel(prob),
    })
  }

  const respEv: string[] = []
  if (p.saturacion_oxigeno < 85) {
    respEv.push(`Hipoxemia severa (SpO2 ${p.saturacion_oxigeno}%)`)
    predicciones.push({
      condicion: 'Insuficiencia Respiratoria',
      descripcion: 'El paciente presenta saturación de oxígeno crítica. Requiere oxigenoterapia y evaluación urgente.',
      probabilidad: 95, evidencia: respEv, nivel: 'critico',
    })
  } else if (p.saturacion_oxigeno < 90) {
    respEv.push(`Hipoxemia (SpO2 ${p.saturacion_oxigeno}%)`)
    if (p.frecuencia_cardiaca > 100) respEv.push(`Taquicardia compensatoria (${p.frecuencia_cardiaca} lpm)`)
    if (p.temperatura > 38) respEv.push(`Fiebre (${p.temperatura}°C)`)
    const prob = Math.min(88, 70 + respEv.length * 5)
    predicciones.push({
      condicion: 'Compromiso Respiratorio',
      descripcion: 'El paciente puede presentar dificultad respiratoria. Se recomienda oximetría continua y evaluación neumológica.',
      probabilidad: prob, evidencia: respEv, nivel: clasificarNivel(prob),
    })
  } else if (p.saturacion_oxigeno < 95) {
    respEv.push(`SpO2 limítrofe (${p.saturacion_oxigeno}%)`)
    predicciones.push({
      condicion: 'Oxigenación subóptima',
      descripcion: 'El paciente tiene una saturación de oxígeno en el límite inferior. Se recomienda seguimiento.',
      probabilidad: 48, evidencia: respEv, nivel: 'medio',
    })
  }

  if (p.frecuencia_cardiaca > 130) {
    predicciones.push({
      condicion: 'Taquicardia Severa',
      descripcion: 'Frecuencia cardíaca muy elevada. Requiere evaluación cardiológica urgente.',
      probabilidad: 92, evidencia: [`FC ${p.frecuencia_cardiaca} lpm`], nivel: 'critico',
    })
  } else if (p.frecuencia_cardiaca > 100) {
    const ev = [`FC ${p.frecuencia_cardiaca} lpm`]
    if (p.temperatura > 38) ev.push(`Fiebre (${p.temperatura}°C)`)
    predicciones.push({
      condicion: 'Taquicardia',
      descripcion: 'El paciente presenta frecuencia cardíaca elevada. Puede ser secundaria a estrés, fiebre o patología cardíaca.',
      probabilidad: 75, evidencia: ev, nivel: 'alto',
    })
  } else if (p.frecuencia_cardiaca < 50 && p.frecuencia_cardiaca > 0) {
    predicciones.push({
      condicion: 'Bradicardia',
      descripcion: 'Frecuencia cardíaca baja. Puede indicar alteración del sistema de conducción.',
      probabilidad: 78, evidencia: [`FC ${p.frecuencia_cardiaca} lpm`], nivel: 'alto',
    })
  }

  if (p.temperatura >= 39) {
    predicciones.push({
      condicion: 'Fiebre Alta',
      descripcion: 'El paciente presenta fiebre alta. Requiere evaluación de foco infeccioso.',
      probabilidad: 93, evidencia: [`Temp ${p.temperatura}°C`], nivel: 'critico',
    })
  } else if (p.temperatura > 37.8) {
    predicciones.push({
      condicion: 'Febrícula',
      descripcion: 'El paciente presenta leve elevación térmica. Se recomienda control y observación.',
      probabilidad: 62, evidencia: [`Temp ${p.temperatura}°C`], nivel: 'medio',
    })
  }

  if (p.fumador && (p.presion_sistolica >= 130 || p.colesterol > 200 || imc >= 25)) {
    const ev = ['Tabaquismo']
    if (p.presion_sistolica >= 130) ev.push('PA elevada')
    if (p.colesterol > 200) ev.push('Colesterol elevado')
    if (imc >= 25) ev.push(`IMC ${imc.toFixed(1)}`)
    predicciones.push({
      condicion: 'Riesgo por Tabaquismo',
      descripcion: 'El tabaquismo combinado con otros factores aumenta significativamente el riesgo de enfermedad cardiovascular y pulmonar.',
      probabilidad: 70, evidencia: ev, nivel: 'alto',
    })
  }

  if (predicciones.length === 0) {
    predicciones.push({
      condicion: 'Sin riesgo aparente',
      descripcion: 'El paciente no presenta signos clínicos de alarma. Mantener hábitos saludables y chequeos preventivos.',
      probabilidad: 85,
      evidencia: ['Signos vitales dentro de parámetros normales', `IMC ${imc.toFixed(1)}`],
      nivel: 'bajo',
    })
  }

  return predicciones.sort((a, b) => b.probabilidad - a.probabilidad)
}

export function getColorProbabilidad(prob: number): string {
  if (prob >= 75) return 'text-red-400'
  if (prob >= 55) return 'text-orange-400'
  if (prob >= 35) return 'text-amber-400'
  return 'text-emerald-400'
}

export function getBgProbabilidad(prob: number): string {
  if (prob >= 75) return 'bg-red-500/15 border-red-500/30'
  if (prob >= 55) return 'bg-orange-500/15 border-orange-500/30'
  if (prob >= 35) return 'bg-amber-500/15 border-amber-500/30'
  return 'bg-emerald-500/15 border-emerald-500/30'
}

export function getColorNivel(nivel: 'critico' | 'alto' | 'medio' | 'bajo'): string {
  if (nivel === 'critico') return 'text-red-400'
  if (nivel === 'alto') return 'text-orange-400'
  if (nivel === 'medio') return 'text-amber-400'
  return 'text-emerald-400'
}
