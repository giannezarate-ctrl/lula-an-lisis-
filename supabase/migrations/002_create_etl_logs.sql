CREATE TABLE IF NOT EXISTS etl_logs (
  id SERIAL PRIMARY KEY,
  fecha_ejecucion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archivo_nombre TEXT NOT NULL,
  total_registros INTEGER NOT NULL,
  registros_validos INTEGER NOT NULL,
  duplicados_eliminados INTEGER NOT NULL DEFAULT 0,
  nulos_corregidos INTEGER NOT NULL DEFAULT 0,
  inconsistencias INTEGER NOT NULL DEFAULT 0,
  calidad_pct NUMERIC(5,2) NOT NULL,
  tiempo_ejecucion NUMERIC(10,2) NOT NULL,
  errores JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_etl_logs_fecha ON etl_logs(fecha_ejecucion DESC);
