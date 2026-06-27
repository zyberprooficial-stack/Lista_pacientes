-- ==========================================
-- MIGRACIÓN: Hacer la cédula opcional
-- Fecha: 2026-06-26
-- ==========================================

-- Este script modifica la tabla pacientes para hacer el campo cedula opcional
-- IMPORTANTE: Ejecutar este script si ya tienes una base de datos existente

-- Paso 1: Remover la restricción UNIQUE de la cédula
ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS pacientes_cedula_key;

-- Paso 2: Remover el índice único existente si existe
DROP INDEX IF EXISTS idx_pacientes_cedula;

-- Paso 3: Modificar la columna cedula para permitir NULL y ajustar el CHECK
ALTER TABLE pacientes ALTER COLUMN cedula DROP NOT NULL;
ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS pacientes_cedula_check;
ALTER TABLE pacientes ADD CONSTRAINT pacientes_cedula_check 
    CHECK (cedula IS NULL OR cedula ~ '^[VE][0-9]{6,8}$');

-- Paso 4: Crear índice único parcial (solo para cédulas no nulas)
CREATE UNIQUE INDEX idx_pacientes_cedula ON pacientes (cedula) WHERE cedula IS NOT NULL;

-- Paso 5: Actualizar comentario de la columna
COMMENT ON COLUMN pacientes.cedula IS 'Cédula venezolana formato V/E seguido de 6-8 dígitos (opcional)';

-- Verificar cambios
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pacientes' AND column_name = 'cedula';

-- Mostrar restricciones actualizadas
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'pacientes'::regclass;

-- Mostrar índices actualizados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'pacientes' AND indexname = 'idx_pacientes_cedula';

-- ==========================================
-- MENSAJE DE CONFIRMACIÓN
-- ==========================================
SELECT 'Migración completada exitosamente. La cédula ahora es opcional.' AS status;
