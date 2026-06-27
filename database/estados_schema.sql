-- Crear tablas para división territorial de Venezuela

CREATE TABLE IF NOT EXISTS estados (
    id_estado SERIAL PRIMARY KEY,
    estado VARCHAR(100) NOT NULL,
    iso_3166_2 VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS municipios (
    id_municipio SERIAL PRIMARY KEY,
    id_estado INTEGER NOT NULL REFERENCES estados(id_estado),
    municipio VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parroquias (
    id_parroquia SERIAL PRIMARY KEY,
    id_municipio INTEGER NOT NULL REFERENCES municipios(id_municipio),
    parroquia VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_municipios_estado ON municipios(id_estado);
CREATE INDEX IF NOT EXISTS idx_parroquias_municipio ON parroquias(id_municipio);

-- Agregar columnas a la tabla pacientes
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS id_estado INTEGER REFERENCES estados(id_estado),
ADD COLUMN IF NOT EXISTS id_municipio INTEGER REFERENCES municipios(id_municipio),
ADD COLUMN IF NOT EXISTS id_parroquia INTEGER REFERENCES parroquias(id_parroquia);

-- Índices en pacientes para filtros geográficos
CREATE INDEX IF NOT EXISTS idx_pacientes_estado ON pacientes(id_estado);
CREATE INDEX IF NOT EXISTS idx_pacientes_municipio ON pacientes(id_municipio);
CREATE INDEX IF NOT EXISTS idx_pacientes_parroquia ON pacientes(id_parroquia);
