'use client'

import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/ui/AppLayout'
import { Paciente } from '@/types/pacientes'
import {
  FileText, Download, FileSpreadsheet, AlertTriangle,
  BarChart3, Brain, Sparkles, CheckCircle2, XCircle,
  Loader2, Eye, X, TrendingUp, Users, Activity,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { predecirDiagnostico, calcularIMC, clasificarIMC } from '@/lib/utils'
import ModalPortal from '@/components/ui/ModalPortal'

type TipoReporte = 'criticos' | 'etl' | 'clinico' | 'predicciones'

interface ReporteConfig {
  tipo: TipoReporte
  titulo: string
  descripcion: string
  icono: typeof FileText
  gradient: string
  border: string
  textColor: string
  badge: string
}

interface EtlLog {
  id: number
  fecha_ejecucion: string
  archivo_nombre: string
  total_registros: number
  registros_validos: number
  duplicados_eliminados: number
  nulos_corregidos: number
  inconsistencias: number
  calidad_pct: number
  tiempo_ejecucion: number
  errores: string
  created_at: string
}

const reportes: ReporteConfig[] = [
  { tipo: 'criticos', titulo: 'Pacientes Críticos', descripcion: 'Reporte detallado de pacientes en estado crítico con alertas activas', icono: AlertTriangle, gradient: 'from-red-600/20 to-red-800/10', border: 'border-red-500/20', textColor: 'text-red-400', badge: 'Urgente' },
  { tipo: 'clinico', titulo: 'Reporte Clínico General', descripcion: 'Resumen completo de todos los pacientes con métricas clínicas', icono: BarChart3, gradient: 'from-purple-600/20 to-purple-800/10', border: 'border-purple-500/20', textColor: 'text-purple-400', badge: 'General' },
  { tipo: 'etl', titulo: 'Reporte ETL', descripcion: 'Bitácora del proceso de extracción, transformación y carga de datos', icono: FileSpreadsheet, gradient: 'from-amber-600/20 to-amber-800/10', border: 'border-amber-500/20', textColor: 'text-amber-400', badge: 'Técnico' },
  { tipo: 'predicciones', titulo: 'Predicciones de Riesgo', descripcion: 'Análisis de predicciones de riesgo realizadas por el sistema', icono: Brain, gradient: 'from-violet-600/20 to-violet-800/10', border: 'border-violet-500/20', textColor: 'text-violet-400', badge: 'IA' },
]

export default function ReportesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [etlLogs, setEtlLogs] = useState<EtlLog[]>([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState<TipoReporte | null>(null)
  const [toast, setToast] = useState<{ tipo: 'ok' | 'error'; mensaje: string } | null>(null)
  const [previewOpen, setPreviewOpen] = useState<TipoReporte | null>(null)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, eRes] = await Promise.all([
        fetch('/api/pacientes', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/etl-logs?limit=100', { cache: 'no-store' }).then(r => r.json()),
      ])
      if (pRes.ok) setPacientes(pRes.pacientes || [])
      if (eRes.ok) setEtlLogs(eRes.logs || [])
    } catch (e) {
      console.error('Error cargando datos:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const showToast = (tipo: 'ok' | 'error', mensaje: string) => {
    setToast({ tipo, mensaje })
    setTimeout(() => setToast(null), 4000)
  }

  const criticos = pacientes.filter(p => p.riesgo_enfermedad === 'Critico')
  const totalRiesgo = {
    bajo: pacientes.filter(p => p.riesgo_enfermedad === 'Bajo').length,
    medio: pacientes.filter(p => p.riesgo_enfermedad === 'Medio').length,
    alto: pacientes.filter(p => p.riesgo_enfermedad === 'Alto').length,
    critico: criticos.length,
  }

  const descargarBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  const headerPDF = (doc: jsPDF, titulo: string, subtitulo?: string) => {
    const pw = doc.internal.pageSize.getWidth()
    doc.setFillColor(15, 15, 28)
    doc.rect(0, 0, pw, 38, 'F')
    doc.setFillColor(124, 58, 237)
    doc.rect(0, 38, pw, 2, 'F')
    doc.setFontSize(16)
    doc.setTextColor(168, 85, 247)
    doc.setFont('helvetica', 'bold')
    doc.text('LULA ANALISIS', 14, 16)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(136, 136, 160)
    doc.text('Plataforma Inteligente de Analitica Clinica', 14, 23)
    doc.text(new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }), pw - 14, 16, { align: 'right' })
    doc.text(`Reporte generado automaticamente`, pw - 14, 23, { align: 'right' })
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(239, 68, 68)
    doc.text(titulo, 14, 50)
    if (subtitulo) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(136, 136, 160)
      doc.text(subtitulo, 14, 57)
    }
  }

  const footerPDF = (doc: jsPDF) => {
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
    const pageNum = doc.internal.pages.length - 1
    doc.setFillColor(15, 15, 28)
    doc.rect(0, ph - 12, pw, 12, 'F')
    doc.setFontSize(6)
    doc.setTextColor(102, 102, 128)
    doc.text(`LULA ANALISIS v1.0 | Pagina ${pageNum} | Confidencial`, pw / 2, ph - 5, { align: 'center' })
  }

  async function exportarPDF(tipo: TipoReporte) {
    if (pacientes.length === 0 && tipo !== 'etl') {
      showToast('error', 'No hay pacientes para generar el reporte')
      return
    }
    setGenerando(tipo)
    try {
      await new Promise(r => setTimeout(r, 300))
      const doc = new jsPDF()

      if (tipo === 'criticos') {
        headerPDF(doc, 'Reporte de Pacientes en Estado Critico', `Total pacientes criticos: ${criticos.length} | Poblacion total: ${pacientes.length}`)
        autoTable(doc, {
          startY: 64,
          head: [['ID', 'Nombre Completo', 'Edad', 'Sexo', 'PA (mmHg)', 'Glucosa', 'SpO2', 'Riesgo', 'Diagnostico', 'Fecha']],
          body: criticos.map(p => [
            String(p.id_paciente),
            `${p.nombres} ${p.apellidos}`,
            String(p.edad),
            p.sexo,
            `${p.presion_sistolica}/${p.presion_diastolica}`,
            `${p.glucosa} mg/dL`,
            `${p.saturacion_oxigeno}%`,
            p.riesgo_enfermedad,
            p.diagnostico_preliminar || '-',
            p.fecha_consulta,
          ]),
          styles: { fontSize: 7, textColor: [60, 60, 80], lineColor: [220, 220, 230] },
          headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 35 } },
        })
      }

      if (tipo === 'clinico') {
        headerPDF(doc, 'Reporte Clinico General', `Poblacion total: ${pacientes.length} pacientes | Generado: ${new Date().toLocaleDateString('es-ES')}`)

        const imcProm = pacientes.length > 0 ? (pacientes.reduce((s, p) => s + (p.imc || 0), 0) / pacientes.length).toFixed(1) : '0'
        const edadProm = pacientes.length > 0 ? (pacientes.reduce((s, p) => s + p.edad, 0) / pacientes.length).toFixed(1) : '0'
        const pasProm = pacientes.length > 0 ? Math.round(pacientes.reduce((s, p) => s + p.presion_sistolica, 0) / pacientes.length) : 0
        const gluProm = pacientes.length > 0 ? Math.round(pacientes.reduce((s, p) => s + p.glucosa, 0) / pacientes.length) : 0
        const hta = pacientes.filter(p => p.presion_sistolica >= 140 || p.presion_diastolica >= 90).length
        const dm = pacientes.filter(p => p.glucosa > 126).length
        const obesos = pacientes.filter(p => (p.imc || 0) >= 30).length
        const fumadores = pacientes.filter(p => p.fumador).length

        autoTable(doc, {
          startY: 64,
          head: [['Indicador', 'Valor']],
          body: [
            ['Total Pacientes', String(pacientes.length)],
            ['Edad Promedio (años)', edadProm],
            ['IMC Promedio', imcProm],
            ['Presion Sistolica Promedio (mmHg)', String(pasProm)],
            ['Glucosa Promedio (mg/dL)', String(gluProm)],
            ['--- Distribucion de Riesgo ---', ''],
            ['Riesgo Bajo', String(totalRiesgo.bajo)],
            ['Riesgo Medio', String(totalRiesgo.medio)],
            ['Riesgo Alto', String(totalRiesgo.alto)],
            ['Riesgo Critico', String(totalRiesgo.critico)],
            ['--- Comorbilidades Detectadas ---', ''],
            ['Hipertensos (PA >= 140/90)', String(hta)],
            ['Diabeticos (Glucosa > 126)', String(dm)],
            ['Obesos (IMC >= 30)', String(obesos)],
            ['Fumadores Activos', String(fumadores)],
          ],
          styles: { fontSize: 9, textColor: [60, 60, 80] },
          headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 243, 255] },
        })

        const lastY1 = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(124, 58, 237)
        doc.text('Detalle de Pacientes', 14, lastY1)

        autoTable(doc, {
          startY: lastY1 + 6,
          head: [['ID', 'Nombre', 'Edad', 'Sexo', 'IMC', 'PA', 'Glucosa', 'Riesgo']],
          body: pacientes.map(p => [
            String(p.id_paciente),
            `${p.nombres} ${p.apellidos}`,
            String(p.edad),
            p.sexo,
            (p.imc || 0).toFixed(1),
            `${p.presion_sistolica}/${p.presion_diastolica}`,
            String(p.glucosa),
            p.riesgo_enfermedad,
          ]),
          styles: { fontSize: 6, textColor: [60, 60, 80] },
          headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontSize: 6, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 243, 255] },
        })
      }

      if (tipo === 'etl') {
        headerPDF(doc, 'Reporte de Proceso ETL', `Bitacora de cargas: ${etlLogs.length} ejecuciones registradas`)
        if (etlLogs.length === 0) {
          doc.setFontSize(10)
          doc.setTextColor(100, 100, 120)
          doc.text('No hay ejecuciones ETL registradas en la bitacora.', 14, 70)
        } else {
          autoTable(doc, {
            startY: 64,
            head: [['Fecha', 'Archivo', 'Total', 'Validos', 'Inconsist.', 'Calidad %', 'Tiempo (s)']],
            body: etlLogs.map(log => [
              new Date(log.fecha_ejecucion).toLocaleString('es-ES'),
              log.archivo_nombre,
              String(log.total_registros),
              String(log.registros_validos),
              String(log.inconsistencias),
              `${log.calidad_pct}%`,
              log.tiempo_ejecucion.toFixed(2),
            ]),
            styles: { fontSize: 7, textColor: [60, 60, 80] },
            headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [255, 251, 235] },
          })

          const lastY = (doc as any).lastAutoTable.finalY + 10
          const totalReg = etlLogs.reduce((s, l) => s + l.total_registros, 0)
          const totalVal = etlLogs.reduce((s, l) => s + l.registros_validos, 0)
          const totalInc = etlLogs.reduce((s, l) => s + l.inconsistencias, 0)
          const totalDup = etlLogs.reduce((s, l) => s + l.duplicados_eliminados, 0)
          const totalNul = etlLogs.reduce((s, l) => s + l.nulos_corregidos, 0)
          const calProm = etlLogs.length > 0 ? Math.round(etlLogs.reduce((s, l) => s + l.calidad_pct, 0) / etlLogs.length) : 0

          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(217, 119, 6)
          doc.text('Resumen Acumulado', 14, lastY)

          autoTable(doc, {
            startY: lastY + 6,
            head: [['Metrica', 'Total']],
            body: [
              ['Ejecuciones Totales', String(etlLogs.length)],
              ['Registros Procesados', String(totalReg)],
              ['Registros Validos', String(totalVal)],
              ['Inconsistencias Detectadas', String(totalInc)],
              ['Duplicados Eliminados', String(totalDup)],
              ['Nulos Corregidos', String(totalNul)],
              ['Calidad Promedio', `${calProm}%`],
            ],
            styles: { fontSize: 9, textColor: [60, 60, 80] },
            headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [255, 251, 235] },
          })
        }
      }

      if (tipo === 'predicciones') {
        headerPDF(doc, 'Reporte de Predicciones de Riesgo', `Pacientes analizados: ${pacientes.length} | Distribucion de riesgo en poblacion`)

        autoTable(doc, {
          startY: 64,
          head: [['Nivel de Riesgo', 'Cantidad', 'Porcentaje']],
          body: [
            ['Riesgo Bajo', String(totalRiesgo.bajo), `${pacientes.length > 0 ? ((totalRiesgo.bajo / pacientes.length) * 100).toFixed(1) : 0}%`],
            ['Riesgo Medio', String(totalRiesgo.medio), `${pacientes.length > 0 ? ((totalRiesgo.medio / pacientes.length) * 100).toFixed(1) : 0}%`],
            ['Riesgo Alto', String(totalRiesgo.alto), `${pacientes.length > 0 ? ((totalRiesgo.alto / pacientes.length) * 100).toFixed(1) : 0}%`],
            ['Riesgo Critico', String(totalRiesgo.critico), `${pacientes.length > 0 ? ((totalRiesgo.critico / pacientes.length) * 100).toFixed(1) : 0}%`],
          ],
          styles: { fontSize: 10, textColor: [60, 60, 80] },
          headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 243, 255] },
        })

        const lastY = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(139, 92, 246)
        doc.text('Top 10 Pacientes con Mayor Riesgo', 14, lastY)

        const top10 = [...pacientes]
          .sort((a, b) => {
            const riesgoOrder = { 'Critico': 4, 'Alto': 3, 'Medio': 2, 'Bajo': 1 }
            return (riesgoOrder[b.riesgo_enfermedad as keyof typeof riesgoOrder] || 0) - (riesgoOrder[a.riesgo_enfermedad as keyof typeof riesgoOrder] || 0)
          })
          .slice(0, 10)

        autoTable(doc, {
          startY: lastY + 6,
          head: [['ID', 'Nombre', 'Edad', 'Riesgo', 'Condiciones Detectadas']],
          body: top10.map(p => {
            const preds = predecirDiagnostico({
              edad: p.edad, sexo: p.sexo, peso: p.peso, altura: p.altura,
              presion_sistolica: p.presion_sistolica, presion_diastolica: p.presion_diastolica,
              glucosa: p.glucosa, colesterol: p.colesterol, saturacion_oxigeno: p.saturacion_oxigeno,
              frecuencia_cardiaca: p.frecuencia_cardiaca, temperatura: p.temperatura,
              antecedentes_familiares: p.antecedentes_familiares === 'Sí' || p.antecedentes_familiares === 'Si',
              fumador: p.fumador, consumo_alcohol: p.consumo_alcohol === 'Sí' || p.consumo_alcohol === 'Si',
            })
            return [
              String(p.id_paciente),
              `${p.nombres} ${p.apellidos}`,
              String(p.edad),
              p.riesgo_enfermedad,
              preds.length > 0 ? preds.slice(0, 3).map(x => `${x.condicion} (${x.probabilidad}%)`).join(' | ') : 'Sin condiciones',
            ]
          }),
          styles: { fontSize: 6, textColor: [60, 60, 80] },
          headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255], fontSize: 6, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 243, 255] },
        })
      }

      footerPDF(doc)
      const filename = `lula-${tipo}-${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)
      showToast('ok', `PDF descargado: ${filename}`)
    } catch (e: any) {
      console.error('Error PDF:', e)
      showToast('error', `Error al generar PDF: ${e?.message || 'desconocido'}`)
    } finally {
      setGenerando(null)
    }
  }

  function exportarExcel(tipo: TipoReporte) {
    if (pacientes.length === 0 && tipo !== 'etl') {
      showToast('error', 'No hay datos para exportar')
      return
    }
    setGenerando(tipo)
    try {
      const wb = XLSX.utils.book_new()
      const ts = new Date().toISOString().slice(0, 10)

      if (tipo === 'criticos') {
        const data = criticos.map(p => ({
          ID: p.id_paciente,
          Nombres: p.nombres,
          Apellidos: p.apellidos,
          Edad: p.edad,
          Sexo: p.sexo,
          'PA Sistolica (mmHg)': p.presion_sistolica,
          'PA Diastolica (mmHg)': p.presion_diastolica,
          Glucosa: p.glucosa,
          Colesterol: p.colesterol,
          SpO2: p.saturacion_oxigeno,
          Temperatura: p.temperatura,
          Riesgo: p.riesgo_enfermedad,
          Diagnostico: p.diagnostico_preliminar,
          'Fecha Consulta': p.fecha_consulta,
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: 18 }))
        XLSX.utils.book_append_sheet(wb, ws, 'Criticos')
      }

      if (tipo === 'clinico') {
        const detalle = pacientes.map(p => ({
          ID: p.id_paciente,
          Nombres: p.nombres,
          Apellidos: p.apellidos,
          Edad: p.edad,
          Sexo: p.sexo,
          Peso: p.peso,
          Altura: p.altura,
          IMC: p.imc,
          'Clasificacion IMC': p.clasificacion_imc,
          'PA Sistolica': p.presion_sistolica,
          'PA Diastolica': p.presion_diastolica,
          FC: p.frecuencia_cardiaca,
          Glucosa: p.glucosa,
          Colesterol: p.colesterol,
          SpO2: p.saturacion_oxigeno,
          Temperatura: p.temperatura,
          'Ant. Familiares': p.antecedentes_familiares,
          Fumador: p.fumador ? 'Sí' : 'No',
          Alcohol: p.consumo_alcohol,
          'Act. Fisica': p.actividad_fisica,
          Riesgo: p.riesgo_enfermedad,
          Diagnostico: p.diagnostico_preliminar,
          'Fecha Consulta': p.fecha_consulta,
        }))
        const imcProm = pacientes.length > 0 ? (pacientes.reduce((s, p) => s + (p.imc || 0), 0) / pacientes.length).toFixed(1) : '0'
        const resumen = [
          { Indicador: 'Total Pacientes', Valor: pacientes.length },
          { Indicador: 'Edad Promedio', Valor: (pacientes.length > 0 ? (pacientes.reduce((s, p) => s + p.edad, 0) / pacientes.length).toFixed(1) : '0') },
          { Indicador: 'IMC Promedio', Valor: imcProm },
          { Indicador: 'PA Sistolica Promedio', Valor: pacientes.length > 0 ? Math.round(pacientes.reduce((s, p) => s + p.presion_sistolica, 0) / pacientes.length) : 0 },
          { Indicador: 'Riesgo Bajo', Valor: totalRiesgo.bajo },
          { Indicador: 'Riesgo Medio', Valor: totalRiesgo.medio },
          { Indicador: 'Riesgo Alto', Valor: totalRiesgo.alto },
          { Indicador: 'Riesgo Critico', Valor: totalRiesgo.critico },
          { Indicador: 'Hipertensos', Valor: pacientes.filter(p => p.presion_sistolica >= 140).length },
          { Indicador: 'Diabeticos', Valor: pacientes.filter(p => p.glucosa > 126).length },
          { Indicador: 'Fumadores', Valor: pacientes.filter(p => p.fumador).length },
        ]
        const wsDet = XLSX.utils.json_to_sheet(detalle)
        wsDet['!cols'] = Object.keys(detalle[0] || {}).map(() => ({ wch: 16 }))
        const wsRes = XLSX.utils.json_to_sheet(resumen)
        wsRes['!cols'] = [{ wch: 28 }, { wch: 12 }]
        XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen')
        XLSX.utils.book_append_sheet(wb, wsDet, 'Detalle Pacientes')
      }

      if (tipo === 'etl') {
        const data = etlLogs.map(log => ({
          ID: log.id,
          'Fecha Ejecucion': new Date(log.fecha_ejecucion).toLocaleString('es-ES'),
          Archivo: log.archivo_nombre,
          'Total Registros': log.total_registros,
          'Validos': log.registros_validos,
          'Duplicados': log.duplicados_eliminados,
          'Nulos Corregidos': log.nulos_corregidos,
          'Inconsistencias': log.inconsistencias,
          'Calidad %': log.calidad_pct,
          'Tiempo (s)': log.tiempo_ejecucion,
        }))
        const ws = XLSX.utils.json_to_sheet(data)
        ws['!cols'] = Object.keys(data[0] || {}).map(() => ({ wch: 18 }))
        XLSX.utils.book_append_sheet(wb, ws, 'Bitacora ETL')
      }

      if (tipo === 'predicciones') {
        const distrib = [
          { Nivel: 'Riesgo Bajo', Cantidad: totalRiesgo.bajo, Porcentaje: pacientes.length > 0 ? `${((totalRiesgo.bajo / pacientes.length) * 100).toFixed(1)}%` : '0%' },
          { Nivel: 'Riesgo Medio', Cantidad: totalRiesgo.medio, Porcentaje: pacientes.length > 0 ? `${((totalRiesgo.medio / pacientes.length) * 100).toFixed(1)}%` : '0%' },
          { Nivel: 'Riesgo Alto', Cantidad: totalRiesgo.alto, Porcentaje: pacientes.length > 0 ? `${((totalRiesgo.alto / pacientes.length) * 100).toFixed(1)}%` : '0%' },
          { Nivel: 'Riesgo Critico', Cantidad: totalRiesgo.critico, Porcentaje: pacientes.length > 0 ? `${((totalRiesgo.critico / pacientes.length) * 100).toFixed(1)}%` : '0%' },
        ]
        const detalle = pacientes.map(p => {
          const preds = predecirDiagnostico({
            edad: p.edad, sexo: p.sexo, peso: p.peso, altura: p.altura,
            presion_sistolica: p.presion_sistolica, presion_diastolica: p.presion_diastolica,
            glucosa: p.glucosa, colesterol: p.colesterol, saturacion_oxigeno: p.saturacion_oxigeno,
            frecuencia_cardiaca: p.frecuencia_cardiaca, temperatura: p.temperatura,
            antecedentes_familiares: p.antecedentes_familiares === 'Sí' || p.antecedentes_familiares === 'Si',
            fumador: p.fumador, consumo_alcohol: p.consumo_alcohol === 'Sí' || p.consumo_alcohol === 'Si',
          })
          return {
            ID: p.id_paciente,
            Nombre: `${p.nombres} ${p.apellidos}`,
            Edad: p.edad,
            Sexo: p.sexo,
            Riesgo: p.riesgo_enfermedad,
            'Condiciones Detectadas': preds.length > 0 ? preds.slice(0, 3).map(x => `${x.condicion} (${x.probabilidad}%)`).join(' | ') : 'Sin condiciones',
          }
        })
        const wsDist = XLSX.utils.json_to_sheet(distrib)
        wsDist['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 14 }]
        const wsDet = XLSX.utils.json_to_sheet(detalle)
        wsDet['!cols'] = Object.keys(detalle[0] || {}).map(() => ({ wch: 22 }))
        XLSX.utils.book_append_sheet(wb, wsDist, 'Distribucion Riesgo')
        XLSX.utils.book_append_sheet(wb, wsDet, 'Predicciones Detalle')
      }

      const filename = `lula-${tipo}-${ts}.xlsx`
      XLSX.writeFile(wb, filename)
      showToast('ok', `Excel descargado: ${filename}`)
    } catch (e: any) {
      console.error('Error Excel:', e)
      showToast('error', `Error al generar Excel: ${e?.message || 'desconocido'}`)
    } finally {
      setGenerando(null)
    }
  }

  function exportarCSV(tipo: TipoReporte) {
    if (pacientes.length === 0 && tipo !== 'etl') {
      showToast('error', 'No hay datos para exportar')
      return
    }
    setGenerando(tipo)
    try {
      const ts = new Date().toISOString().slice(0, 10)
      let headers: string[] = []
      let rows: (string | number)[][] = []

      if (tipo === 'criticos') {
        headers = ['ID', 'Nombres', 'Apellidos', 'Edad', 'Sexo', 'PA Sistolica', 'PA Diastolica', 'Glucosa', 'SpO2', 'Riesgo', 'Diagnostico', 'Fecha']
        rows = criticos.map(p => [p.id_paciente, p.nombres, p.apellidos, p.edad, p.sexo, p.presion_sistolica, p.presion_diastolica, p.glucosa, p.saturacion_oxigeno, p.riesgo_enfermedad, p.diagnostico_preliminar || '', p.fecha_consulta])
      } else if (tipo === 'clinico') {
        headers = ['ID', 'Nombres', 'Apellidos', 'Edad', 'Sexo', 'IMC', 'PA Sistolica', 'PA Diastolica', 'Glucosa', 'Colesterol', 'SpO2', 'Fumador', 'Riesgo', 'Diagnostico', 'Fecha']
        rows = pacientes.map(p => [p.id_paciente, p.nombres, p.apellidos, p.edad, p.sexo, p.imc, p.presion_sistolica, p.presion_diastolica, p.glucosa, p.colesterol, p.saturacion_oxigeno, p.fumador ? 'Sí' : 'No', p.riesgo_enfermedad, p.diagnostico_preliminar || '', p.fecha_consulta])
      } else if (tipo === 'etl') {
        headers = ['ID', 'Fecha', 'Archivo', 'Total', 'Validos', 'Inconsistencias', 'Calidad %', 'Tiempo (s)']
        rows = etlLogs.map(l => [l.id, new Date(l.fecha_ejecucion).toLocaleString('es-ES'), l.archivo_nombre, l.total_registros, l.registros_validos, l.inconsistencias, l.calidad_pct, l.tiempo_ejecucion])
      } else if (tipo === 'predicciones') {
        headers = ['ID', 'Nombre', 'Edad', 'Riesgo', 'Top Condiciones']
        rows = pacientes.map(p => {
          const preds = predecirDiagnostico({
            edad: p.edad, sexo: p.sexo, peso: p.peso, altura: p.altura,
            presion_sistolica: p.presion_sistolica, presion_diastolica: p.presion_diastolica,
            glucosa: p.glucosa, colesterol: p.colesterol, saturacion_oxigeno: p.saturacion_oxigeno,
            frecuencia_cardiaca: p.frecuencia_cardiaca, temperatura: p.temperatura,
            antecedentes_familiares: p.antecedentes_familiares === 'Sí' || p.antecedentes_familiares === 'Si',
            fumador: p.fumador, consumo_alcohol: p.consumo_alcohol === 'Sí' || p.consumo_alcohol === 'Si',
          })
          return [p.id_paciente, `${p.nombres} ${p.apellidos}`, p.edad, p.riesgo_enfermedad, preds.slice(0, 3).map(x => `${x.condicion} (${x.probabilidad}%)`).join(' | ')]
        })
      }

      const escapeCSV = (v: any) => {
        const s = String(v ?? '')
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }
      const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const filename = `lula-${tipo}-${ts}.csv`
      descargarBlob(blob, filename)
      showToast('ok', `CSV descargado: ${filename}`)
    } catch (e: any) {
      console.error('Error CSV:', e)
      showToast('error', `Error al generar CSV: ${e?.message || 'desconocido'}`)
    } finally {
      setGenerando(null)
    }
  }

  const downloadFormats = [
    { label: 'PDF', icon: FileText, action: exportarPDF, color: 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border-red-500/20' },
    { label: 'Excel', icon: FileSpreadsheet, action: exportarExcel, color: 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/20' },
    { label: 'CSV', icon: Download, action: exportarCSV, color: 'bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border-purple-500/20' },
  ]

  const getRecordCount = (tipo: TipoReporte): number => {
    if (tipo === 'criticos') return criticos.length
    if (tipo === 'clinico') return pacientes.length
    if (tipo === 'etl') return etlLogs.length
    if (tipo === 'predicciones') return pacientes.length
    return 0
  }

  return (
    <AppLayout>
      <div className="w-full space-y-8 relative z-10">
        <div className="animate-slide-left">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600/20 to-violet-600/10 border border-purple-500/20">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Reportes</h1>
              <p className="text-[#8888a0] text-base mt-1">Exportación de reportes clínicos en múltiples formatos</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-medium uppercase tracking-wider">
              <Users size={14} /> Población Total
            </div>
            <div className="text-3xl font-bold text-white mt-2">{pacientes.length}</div>
            <div className="text-xs text-[#8888a0] mt-1">pacientes registrados</div>
          </div>
          <div className="glass-card rounded-xl p-5 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-300 text-xs font-medium uppercase tracking-wider">
              <AlertTriangle size={14} /> Críticos
            </div>
            <div className="text-3xl font-bold text-white mt-2">{totalRiesgo.critico}</div>
            <div className="text-xs text-[#8888a0] mt-1">requieren atención urgente</div>
          </div>
          <div className="glass-card rounded-xl p-5 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-medium uppercase tracking-wider">
              <Activity size={14} /> Ejecuciones ETL
            </div>
            <div className="text-3xl font-bold text-white mt-2">{etlLogs.length}</div>
            <div className="text-xs text-[#8888a0] mt-1">en la bitácora</div>
          </div>
          <div className="glass-card rounded-xl p-5 border border-violet-500/20">
            <div className="flex items-center gap-2 text-violet-300 text-xs font-medium uppercase tracking-wider">
              <TrendingUp size={14} /> Calidad Datos
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {etlLogs.length > 0 ? Math.round(etlLogs.reduce((s, l) => s + l.calidad_pct, 0) / etlLogs.length) : 0}%
            </div>
            <div className="text-xs text-[#8888a0] mt-1">promedio en cargas</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportes.map((reporte, idx) => {
            const Icon = reporte.icono
            const recordCount = getRecordCount(reporte.tipo)
            return (
              <div key={reporte.tipo}
                className={`glass-card rounded-2xl p-7 border bg-gradient-to-br ${reporte.gradient} ${reporte.border} glass-card-hover animate-slide-in`}
                style={{ animationDelay: `${idx * 80}ms` }}>
                <div className="flex items-start gap-5">
                  <div className={`p-3.5 rounded-xl bg-gradient-to-br ${reporte.gradient} border ${reporte.border}`}>
                    <Icon className={`w-7 h-7 ${reporte.textColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-semibold text-white">{reporte.titulo}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${reporte.textColor} bg-white/5`}>
                        {reporte.badge}
                      </span>
                    </div>
                    <p className="text-sm text-[#8888a0] mt-1.5">{reporte.descripcion}</p>
                    <div className="mt-2 text-xs text-white/70">
                      <span className="font-semibold text-white">{recordCount}</span> registros disponibles
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => setPreviewOpen(reporte.tipo)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 bg-white/5 text-white/80 hover:bg-white/10 border-white/10">
                    <Eye size={15} /> Vista Previa
                  </button>
                  {downloadFormats.map(fmt => {
                    const FmtIcon = fmt.icon
                    const isGenerating = generando === reporte.tipo
                    return (
                      <button key={fmt.label}
                        type="button"
                        onClick={() => fmt.action(reporte.tipo)}
                        disabled={isGenerating}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${fmt.color} disabled:opacity-40 active:scale-95`}>
                        {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <FmtIcon size={15} />}
                        {isGenerating ? 'Generando...' : fmt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {previewOpen && (
          <PreviewModal
            tipo={previewOpen}
            pacientes={pacientes}
            etlLogs={etlLogs}
            totalRiesgo={totalRiesgo}
            onClose={() => setPreviewOpen(null)}
            onExport={(fmt) => {
              setPreviewOpen(null)
              if (fmt === 'PDF') exportarPDF(previewOpen)
              if (fmt === 'Excel') exportarExcel(previewOpen)
              if (fmt === 'CSV') exportarCSV(previewOpen)
            }}
          />
        )}

        {toast && (
          <div className={`fixed bottom-6 right-6 z-[300] px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md animate-fade-in flex items-center gap-3 ${toast.tipo === 'ok' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200' : 'bg-red-500/15 border-red-500/30 text-red-200'}`}>
            {toast.tipo === 'ok' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span className="text-sm font-medium">{toast.mensaje}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {loading && (
          <div className="glass-card rounded-2xl p-8 border border-purple-500/30 text-center">
            <Loader2 className="w-8 h-8 text-purple-400 mx-auto animate-spin" />
            <p className="text-sm text-[#8888a0] mt-3">Cargando datos para reportes...</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function PreviewModal({ tipo, pacientes, etlLogs, totalRiesgo, onClose, onExport }: {
  tipo: TipoReporte
  pacientes: Paciente[]
  etlLogs: EtlLog[]
  totalRiesgo: { bajo: number; medio: number; alto: number; critico: number }
  onClose: () => void
  onExport: (fmt: 'PDF' | 'Excel' | 'CSV') => void
}) {
  const criticos = pacientes.filter(p => p.riesgo_enfermedad === 'Critico')
  const titles: Record<TipoReporte, string> = {
    criticos: 'Vista Previa: Pacientes Críticos',
    clinico: 'Vista Previa: Reporte Clínico General',
    etl: 'Vista Previa: Reporte ETL',
    predicciones: 'Vista Previa: Predicciones de Riesgo',
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="glass-card rounded-2xl border border-purple-500/30 max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{titles[tipo]}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-[#8888a0] hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tipo === 'criticos' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatBox label="Críticos" value={criticos.length} color="text-red-400" />
                <StatBox label="Total" value={pacientes.length} color="text-purple-400" />
                <StatBox label="% Críticos" value={pacientes.length > 0 ? `${((criticos.length / pacientes.length) * 100).toFixed(1)}%` : '0%'} color="text-amber-400" />
                <StatBox label="Edad Prom." value={criticos.length > 0 ? Math.round(criticos.reduce((s, p) => s + p.edad, 0) / criticos.length) : 0} color="text-cyan-400" />
              </div>
              {criticos.length === 0 ? (
                <Empty msg="No hay pacientes críticos registrados" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-[#8888a0] uppercase">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 px-2">ID</th>
                        <th className="text-left py-2 px-2">Nombre</th>
                        <th className="text-left py-2 px-2">Edad</th>
                        <th className="text-left py-2 px-2">PA</th>
                        <th className="text-left py-2 px-2">Glucosa</th>
                        <th className="text-left py-2 px-2">SpO2</th>
                        <th className="text-left py-2 px-2">Diagnóstico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criticos.map(p => (
                        <tr key={p.id_paciente} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2 px-2 text-white/80">{p.id_paciente}</td>
                          <td className="py-2 px-2 text-white font-medium">{p.nombres} {p.apellidos}</td>
                          <td className="py-2 px-2 text-white/80">{p.edad}</td>
                          <td className="py-2 px-2 text-red-300">{p.presion_sistolica}/{p.presion_diastolica}</td>
                          <td className="py-2 px-2 text-white/80">{p.glucosa}</td>
                          <td className="py-2 px-2 text-white/80">{p.saturacion_oxigeno}%</td>
                          <td className="py-2 px-2 text-white/70 text-xs">{p.diagnostico_preliminar || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tipo === 'clinico' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatBox label="Total" value={pacientes.length} color="text-purple-400" />
                <StatBox label="Bajo" value={totalRiesgo.bajo} color="text-emerald-400" />
                <StatBox label="Medio" value={totalRiesgo.medio} color="text-amber-400" />
                <StatBox label="Alto" value={totalRiesgo.alto} color="text-orange-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MetricCard label="IMC Promedio" value={pacientes.length > 0 ? (pacientes.reduce((s, p) => s + (p.imc || 0), 0) / pacientes.length).toFixed(1) : '0'} />
                <MetricCard label="Edad Promedio" value={pacientes.length > 0 ? (pacientes.reduce((s, p) => s + p.edad, 0) / pacientes.length).toFixed(1) : '0'} />
                <MetricCard label="Hipertensos" value={pacientes.filter(p => p.presion_sistolica >= 140).length} />
                <MetricCard label="Diabéticos" value={pacientes.filter(p => p.glucosa > 126).length} />
                <MetricCard label="Fumadores" value={pacientes.filter(p => p.fumador).length} />
                <MetricCard label="Críticos" value={totalRiesgo.critico} />
              </div>
            </div>
          )}

          {tipo === 'etl' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatBox label="Ejecuciones" value={etlLogs.length} color="text-amber-400" />
                <StatBox label="Total Registros" value={etlLogs.reduce((s, l) => s + l.total_registros, 0)} color="text-purple-400" />
                <StatBox label="Calidad Prom." value={`${etlLogs.length > 0 ? Math.round(etlLogs.reduce((s, l) => s + l.calidad_pct, 0) / etlLogs.length) : 0}%`} color="text-emerald-400" />
                <StatBox label="Inconsistencias" value={etlLogs.reduce((s, l) => s + l.inconsistencias, 0)} color="text-red-400" />
              </div>
              {etlLogs.length === 0 ? (
                <Empty msg="No hay ejecuciones ETL registradas" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-[#8888a0] uppercase">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 px-2">Fecha</th>
                        <th className="text-left py-2 px-2">Archivo</th>
                        <th className="text-right py-2 px-2">Total</th>
                        <th className="text-right py-2 px-2">Válidos</th>
                        <th className="text-right py-2 px-2">Inconsist.</th>
                        <th className="text-right py-2 px-2">Calidad</th>
                        <th className="text-right py-2 px-2">Tiempo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {etlLogs.slice(0, 15).map(l => (
                        <tr key={l.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2 px-2 text-white/80 text-xs">{new Date(l.fecha_ejecucion).toLocaleString('es-ES')}</td>
                          <td className="py-2 px-2 text-white font-medium text-xs truncate max-w-[200px]">{l.archivo_nombre}</td>
                          <td className="py-2 px-2 text-right text-white/80">{l.total_registros}</td>
                          <td className="py-2 px-2 text-right text-emerald-300">{l.registros_validos}</td>
                          <td className="py-2 px-2 text-right text-amber-300">{l.inconsistencias}</td>
                          <td className="py-2 px-2 text-right">
                            <span className={`font-bold ${l.calidad_pct >= 80 ? 'text-emerald-400' : l.calidad_pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                              {l.calidad_pct}%
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-white/70 text-xs">{l.tiempo_ejecucion.toFixed(2)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tipo === 'predicciones' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatBox label="Bajo" value={totalRiesgo.bajo} color="text-emerald-400" />
                <StatBox label="Medio" value={totalRiesgo.medio} color="text-amber-400" />
                <StatBox label="Alto" value={totalRiesgo.alto} color="text-orange-400" />
                <StatBox label="Crítico" value={totalRiesgo.critico} color="text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-3">Top 5 Predicciones por Paciente</h3>
              <div className="space-y-2">
                {pacientes.slice(0, 5).map(p => {
                  const preds = predecirDiagnostico({
                    edad: p.edad, sexo: p.sexo, peso: p.peso, altura: p.altura,
                    presion_sistolica: p.presion_sistolica, presion_diastolica: p.presion_diastolica,
                    glucosa: p.glucosa, colesterol: p.colesterol, saturacion_oxigeno: p.saturacion_oxigeno,
                    frecuencia_cardiaca: p.frecuencia_cardiaca, temperatura: p.temperatura,
                    antecedentes_familiares: p.antecedentes_familiares === 'Sí' || p.antecedentes_familiares === 'Si',
                    fumador: p.fumador, consumo_alcohol: p.consumo_alcohol === 'Sí' || p.consumo_alcohol === 'Si',
                  })
                  return (
                    <div key={p.id_paciente} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{p.nombres} {p.apellidos}</span>
                        <span className="text-xs text-[#8888a0]">Riesgo: <span className="font-bold text-white">{p.riesgo_enfermedad}</span></span>
                      </div>
                      {preds.length > 0 ? (
                        <div className="space-y-1">
                          {preds.slice(0, 3).map((pred, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500" style={{ width: `${pred.probabilidad}%` }} />
                              </div>
                              <span className="text-white/80 w-44 truncate">{pred.condicion}</span>
                              <span className="text-violet-300 font-bold w-10 text-right">{pred.probabilidad}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-300">Sin condiciones detectadas</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-[#8888a0] hover:text-white hover:bg-white/5">
            Cerrar
          </button>
          <button onClick={() => onExport('PDF')} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500/25">
            Descargar PDF
          </button>
          <button onClick={() => onExport('Excel')} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25">
            Descargar Excel
          </button>
          <button onClick={() => onExport('CSV')} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25">
            Descargar CSV
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

function StatBox({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="text-[10px] uppercase tracking-wider text-[#8888a0]">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="text-xs uppercase tracking-wider text-[#8888a0]">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </div>
  )
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="text-center py-12 text-[#8888a0]">
      <Sparkles className="w-8 h-8 mx-auto mb-3 text-purple-400/40" />
      <p className="text-sm">{msg}</p>
    </div>
  )
}
