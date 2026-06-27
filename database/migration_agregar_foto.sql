-- ==========================================
-- Migración: Agregar campo de foto
-- ==========================================

-- Agregar columna para almacenar foto comprimida en base64
ALTER TABLE pacientes 
ADD COLUMN foto TEXT;

-- Comentario
COMMENT ON COLUMN pacientes.foto IS 'Foto del paciente en formato base64 (comprimida, máx 200KB)';

-- Índice para acelerar consultas que incluyan foto
CREATE INDEX idx_pacientes_con_foto ON pacientes (id) WHERE foto IS NOT NULL;

-- Verificar
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pacientes' AND column_name = 'foto';
