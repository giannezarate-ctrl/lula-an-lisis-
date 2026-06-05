export interface Paciente {
  id_paciente: number
  nombres: string
  apellidos: string
  edad: number
  sexo: string
  peso: number
  altura: number
  imc: number
  clasificacion_imc: string
  presion_sistolica: number
  presion_diastolica: number
  frecuencia_cardiaca: number
  glucosa: number
  colesterol: number
  saturacion_oxigeno: number
  temperatura: number
  antecedentes_familiares: boolean
  fumador: boolean
  consumo_alcohol: boolean
  actividad_fisica: string
  diagnostico_preliminar: string
  riesgo_enfermedad: string
  fecha_consulta: string
  created_at?: string
  riesgo_calculado?: 'Bajo' | 'Medio' | 'Alto' | 'Critico'
}

export interface PacienteFormData {
  id_paciente: number
  nombres: string
  apellidos: string
  edad: number
  sexo: string
  peso: number
  altura: number
  presion_sistolica: number
  presion_diastolica: number
  frecuencia_cardiaca: number
  glucosa: number
  colesterol: number
  saturacion_oxigeno: number
  temperatura: number
  antecedentes_familiares: boolean
  fumador: boolean
  consumo_alcohol: boolean
  actividad_fisica: string
  diagnostico_preliminar: string
  fecha_consulta: string
}

export interface RiesgoStats {
  bajo: number
  medio: number
  alto: number
  critico: number
}

export type RiesgoTipo = 'bajo' | 'medio' | 'alto' | 'critico'

export type FiltroRiesgo = 'todos' | RiesgoTipo
