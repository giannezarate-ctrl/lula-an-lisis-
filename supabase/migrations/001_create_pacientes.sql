CREATE TABLE IF NOT EXISTS pacientes (
  id_paciente INTEGER PRIMARY KEY,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  edad INTEGER NOT NULL CHECK (edad >= 0 AND edad <= 150),
  sexo TEXT NOT NULL CHECK (sexo IN ('Masculino', 'Femenino')),
  peso FLOAT NOT NULL CHECK (peso > 0 AND peso <= 500),
  altura FLOAT NOT NULL CHECK (altura > 0 AND altura <= 300),
  imc FLOAT NOT NULL,
  clasificacion_imc TEXT NOT NULL,
  presion_sistolica INTEGER NOT NULL CHECK (presion_sistolica >= 50 AND presion_sistolica <= 300),
  presion_diastolica INTEGER NOT NULL CHECK (presion_diastolica >= 30 AND presion_diastolica <= 200),
  frecuencia_cardiaca INTEGER NOT NULL CHECK (frecuencia_cardiaca >= 20 AND frecuencia_cardiaca <= 300),
  glucosa FLOAT NOT NULL CHECK (glucosa >= 10 AND glucosa <= 1000),
  colesterol FLOAT NOT NULL CHECK (colesterol >= 50 AND colesterol <= 800),
  saturacion_oxigeno FLOAT NOT NULL CHECK (saturacion_oxigeno >= 0 AND saturacion_oxigeno <= 100),
  temperatura FLOAT NOT NULL CHECK (temperatura >= 30 AND temperatura <= 45),
  antecedentes_familiares BOOLEAN NOT NULL DEFAULT FALSE,
  fumador BOOLEAN NOT NULL DEFAULT FALSE,
  consumo_alcohol BOOLEAN NOT NULL DEFAULT FALSE,
  actividad_fisica TEXT NOT NULL CHECK (actividad_fisica IN ('sedentario', 'moderada', 'activa')),
  diagnostico_preliminar TEXT NOT NULL,
  riesgo_enfermedad TEXT NOT NULL CHECK (riesgo_enfermedad IN ('Bajo', 'Medio', 'Alto', 'Critico')),
  fecha_consulta DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pacientes_riesgo ON pacientes(riesgo_enfermedad);
CREATE INDEX IF NOT EXISTS idx_pacientes_edad ON pacientes(edad);
CREATE INDEX IF NOT EXISTS idx_pacientes_fecha ON pacientes(fecha_consulta);
