-- ==========================================
-- MIGRACIÓN: Agregar campo edad
-- Fecha: 2026-06-26
-- ==========================================

-- Agregar columna edad (opcional)
ALTER TABLE pacientes 
ADD COLUMN edad INTEGER CHECK (edad IS NULL OR (edad >= 0 AND edad <= 150));

-- Crear índice para búsquedas/filtros por edad
CREATE INDEX idx_pacientes_edad ON pacientes (edad) WHERE edad IS NOT NULL;

-- Actualizar comentario
COMMENT ON COLUMN pacientes.edad IS 'Edad del paciente en años (opcional)';

-- Verificar cambios
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pacientes' AND column_name = 'edad';

-- Mensaje de confirmación
SELECT '✅ Columna edad agregada exitosamente' AS status;
