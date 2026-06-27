-- ==========================================
-- MIGRACIÓN: Agregar campo teléfono
-- Fecha: 2026-06-26
-- ==========================================

-- Agregar columna telefono (opcional)
ALTER TABLE pacientes 
ADD COLUMN telefono VARCHAR(20) CHECK (telefono IS NULL OR char_length(telefono) >= 7);

-- Crear índice para búsquedas por teléfono
CREATE INDEX idx_pacientes_telefono ON pacientes (telefono) WHERE telefono IS NOT NULL;

-- Actualizar comentario
COMMENT ON COLUMN pacientes.telefono IS 'Número de contacto del paciente o familiar (opcional)';

-- Verificar cambios
SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'pacientes' AND column_name = 'telefono';

-- Mensaje de confirmación
SELECT '✅ Columna telefono agregada exitosamente' AS status;
