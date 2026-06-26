-- ==========================================
-- SETUP COMPLETO PARA SUPABASE
-- Ejecuta este script completo en el SQL Editor de Supabase
-- ==========================================

-- PASO 1: Crear tabla de pacientes
-- ==========================================
DROP TABLE IF EXISTS pacientes CASCADE;

CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    nombre_completo TEXT NOT NULL CHECK (char_length(nombre_completo) > 0 AND char_length(nombre_completo) <= 200),
    cedula VARCHAR(20) CHECK (cedula IS NULL OR cedula ~ '^[VE][0-9]{6,8}$'),
    telefono VARCHAR(20) CHECK (telefono IS NULL OR char_length(telefono) >= 7),
    edad INTEGER CHECK (edad IS NULL OR (edad >= 0 AND edad <= 150)),
    ubicacion_actual TEXT NOT NULL CHECK (char_length(ubicacion_actual) <= 300),
    estado_salud VARCHAR(50) NOT NULL CHECK (estado_salud IN ('Estable', 'Critico', 'Fallecido', 'Desconocido')),
    fecha_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PASO 2: Crear tablas geográficas
-- ==========================================
DROP TABLE IF EXISTS parroquias CASCADE;
DROP TABLE IF EXISTS municipios CASCADE;
DROP TABLE IF EXISTS estados CASCADE;

CREATE TABLE estados (
    id_estado SERIAL PRIMARY KEY,
    estado VARCHAR(100) NOT NULL,
    iso_3166_2 VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE municipios (
    id_municipio SERIAL PRIMARY KEY,
    id_estado INTEGER NOT NULL REFERENCES estados(id_estado),
    municipio VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE parroquias (
    id_parroquia SERIAL PRIMARY KEY,
    id_municipio INTEGER NOT NULL REFERENCES municipios(id_municipio),
    parroquia VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PASO 3: Agregar columnas geográficas a pacientes
-- ==========================================
ALTER TABLE pacientes 
ADD COLUMN id_estado INTEGER REFERENCES estados(id_estado),
ADD COLUMN id_municipio INTEGER REFERENCES municipios(id_municipio),
ADD COLUMN id_parroquia INTEGER REFERENCES parroquias(id_parroquia);

-- PASO 4: Crear índices para performance
-- ==========================================

-- Índices GIN para búsqueda full-text
CREATE INDEX idx_pacientes_nombre_gin ON pacientes 
USING gin (to_tsvector('spanish', nombre_completo));

CREATE INDEX idx_pacientes_ubicacion_gin ON pacientes 
USING gin (to_tsvector('spanish', ubicacion_actual));

-- Índice único en cédula
CREATE UNIQUE INDEX idx_pacientes_cedula ON pacientes (cedula) WHERE cedula IS NOT NULL;

-- Índices B-tree
CREATE INDEX idx_pacientes_fecha ON pacientes (fecha_registro DESC);
CREATE INDEX idx_pacientes_estado_salud ON pacientes (estado_salud);
CREATE INDEX idx_pacientes_telefono ON pacientes (telefono) WHERE telefono IS NOT NULL;
CREATE INDEX idx_pacientes_edad ON pacientes (edad) WHERE edad IS NOT NULL;

-- Índices geográficos
CREATE INDEX idx_pacientes_id_estado ON pacientes(id_estado);
CREATE INDEX idx_pacientes_id_municipio ON pacientes(id_municipio);
CREATE INDEX idx_pacientes_id_parroquia ON pacientes(id_parroquia);
CREATE INDEX idx_municipios_estado ON municipios(id_estado);
CREATE INDEX idx_parroquias_municipio ON parroquias(id_municipio);

-- PASO 5: Comentarios de documentación
-- ==========================================
COMMENT ON TABLE pacientes IS 'Registro de pacientes afectados por el terremoto';
COMMENT ON COLUMN pacientes.id IS 'Identificador único autoincremental';
COMMENT ON COLUMN pacientes.nombre_completo IS 'Nombre completo del paciente (máx 200 caracteres)';
COMMENT ON COLUMN pacientes.cedula IS 'Cédula venezolana formato V/E seguido de 6-8 dígitos (opcional)';
COMMENT ON COLUMN pacientes.telefono IS 'Número de contacto del paciente o familiar (opcional)';
COMMENT ON COLUMN pacientes.edad IS 'Edad del paciente en años (opcional)';
COMMENT ON COLUMN pacientes.ubicacion_actual IS 'Ubicación actual del paciente (máx 300 caracteres)';
COMMENT ON COLUMN pacientes.estado_salud IS 'Estado: Estable, Critico, Fallecido, Desconocido';
COMMENT ON COLUMN pacientes.fecha_registro IS 'Fecha y hora de registro en el sistema';

-- ==========================================
-- LISTO: Ahora ejecuta el script venezuela_data.sql
-- para cargar los estados, municipios y parroquias
-- ==========================================

SELECT '✅ Tablas creadas exitosamente' AS status;
SELECT 'Ahora ejecuta el archivo venezuela_data.sql para cargar los datos geográficos' AS proximo_paso;
