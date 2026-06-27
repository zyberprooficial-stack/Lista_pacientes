-- ==========================================
-- Sistema de Consulta de Pacientes
-- Terremoto Venezuela
-- ==========================================

-- Eliminar tabla si existe (solo para desarrollo)
DROP TABLE IF EXISTS pacientes;

-- Crear tabla principal de pacientes
CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    nombre_completo TEXT NOT NULL CHECK (char_length(nombre_completo) > 0 AND char_length(nombre_completo) <= 200),
    cedula VARCHAR(20) CHECK (cedula IS NULL OR cedula ~ '^[VE][0-9]{6,8}$'),
    ubicacion_actual TEXT NOT NULL CHECK (char_length(ubicacion_actual) <= 300),
    estado_salud VARCHAR(50) NOT NULL CHECK (estado_salud IN ('Estable', 'Crítico', 'Fallecido', 'Desconocido')),
    fecha_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ÍNDICES OPTIMIZADOS PARA BÚSQUEDA RÁPIDA
-- ==========================================

-- Índice GIN para búsqueda full-text en nombre
-- Permite búsquedas tipo "LIKE '%juan%'" de forma eficiente
CREATE INDEX idx_pacientes_nombre_gin ON pacientes 
USING gin (to_tsvector('spanish', nombre_completo));

-- Índice GIN para búsqueda full-text en ubicación
CREATE INDEX idx_pacientes_ubicacion_gin ON pacientes 
USING gin (to_tsvector('spanish', ubicacion_actual));

-- Índice B-tree único en cédula para búsquedas exactas ultra-rápidas
-- Solo para cédulas no nulas
CREATE UNIQUE INDEX idx_pacientes_cedula ON pacientes (cedula) WHERE cedula IS NOT NULL;

-- Índice B-tree en fecha de registro para ordenamiento temporal
CREATE INDEX idx_pacientes_fecha ON pacientes (fecha_registro DESC);

-- Índice B-tree en estado de salud para filtros
CREATE INDEX idx_pacientes_estado ON pacientes (estado_salud);

-- ==========================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE pacientes IS 'Registro de pacientes afectados por el terremoto';
COMMENT ON COLUMN pacientes.id IS 'Identificador único autoincremental';
COMMENT ON COLUMN pacientes.nombre_completo IS 'Nombre completo del paciente (máx 200 caracteres)';
COMMENT ON COLUMN pacientes.cedula IS 'Cédula venezolana formato V/E seguido de 6-8 dígitos (opcional)';
COMMENT ON COLUMN pacientes.ubicacion_actual IS 'Ubicación actual del paciente (máx 300 caracteres)';
COMMENT ON COLUMN pacientes.estado_salud IS 'Estado: Estable, Crítico, Fallecido, Desconocido';
COMMENT ON COLUMN pacientes.fecha_registro IS 'Fecha y hora de registro en el sistema';

-- ==========================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ==========================================

INSERT INTO pacientes (nombre_completo, cedula, ubicacion_actual, estado_salud) VALUES
    ('Juan Carlos Pérez', 'V12345678', 'Hospital Central de Caracas - Sala 3', 'Estable'),
    ('María Fernanda González', 'V23456789', 'Centro de Salud Maracaibo', 'Crítico'),
    ('Pedro Antonio Rodríguez', 'V34567890', 'Hospital Militar Caracas - UCI', 'Crítico'),
    ('Ana Isabel Martínez', 'V45678901', 'Refugio Temporal Valencia', 'Estable'),
    ('Carlos Eduardo López', 'V56789012', 'Hospital San Juan de Los Morros', 'Estable'),
    ('Luisa Carolina Hernández', 'E67890123', 'Centro Médico Barquisimeto', 'Desconocido'),
    ('Miguel Ángel Sánchez', 'V78901234', 'Hospital Central Maracay - Piso 2', 'Estable'),
    ('Carmen Rosa Díaz', 'V89012345', 'Clínica Popular Valencia', 'Fallecido'),
    ('José Luis Ramírez', 'V90123456', 'Hospital de Niños Caracas', 'Estable'),
    ('Teresa Beatriz Torres', 'E01234567', 'Centro Asistencial Mérida', 'Crítico'),
    ('Francisco Javier Flores', 'V11223344', 'Hospital Universitario Caracas', 'Estable'),
    ('Rosa Elena Vargas', 'V22334455', 'Refugio Cruz Roja Valencia', 'Desconocido'),
    ('Antonio José Castillo', 'V33445566', 'Hospital Central Barquisimeto - Piso 4', 'Estable'),
    ('Patricia Andrea Morales', 'V44556677', 'Centro de Salud La Victoria', 'Crítico'),
    ('Roberto Carlos Mendoza', 'E55667788', 'Hospital Regional San Cristóbal', 'Estable');

-- ==========================================
-- VERIFICACIÓN
-- ==========================================

-- Verificar que los índices se crearon correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'pacientes'
ORDER BY indexname;

-- Estadísticas iniciales
SELECT 
    COUNT(*) as total_pacientes,
    COUNT(CASE WHEN estado_salud = 'Estable' THEN 1 END) as estables,
    COUNT(CASE WHEN estado_salud = 'Crítico' THEN 1 END) as criticos,
    COUNT(CASE WHEN estado_salud = 'Fallecido' THEN 1 END) as fallecidos,
    COUNT(CASE WHEN estado_salud = 'Desconocido' THEN 1 END) as desconocidos
FROM pacientes;

-- ==========================================
-- PERFORMANCE TUNING (OPCIONAL)
-- ==========================================

-- Actualizar estadísticas para el query optimizer
ANALYZE pacientes;

-- Para entornos de producción, considerar:
-- 1. Configurar shared_buffers en postgresql.conf (25% de RAM)
-- 2. Configurar effective_cache_size (50-75% de RAM)
-- 3. Configurar work_mem apropiadamente
-- 4. Habilitar pg_stat_statements para monitoreo
