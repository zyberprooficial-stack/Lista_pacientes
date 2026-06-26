-- ==========================================
-- FIX V2: Corregir constraint de estado_salud
-- Solución alternativa usando código Unicode
-- ==========================================

-- 1. Eliminar el constraint antiguo
ALTER TABLE pacientes 
DROP CONSTRAINT IF EXISTS pacientes_estado_salud_check;

-- 2. Agregar constraint usando código ASCII sin acentos para evitar problemas de encoding
-- Luego haremos una migración de datos si es necesario
ALTER TABLE pacientes
ADD CONSTRAINT pacientes_estado_salud_check 
CHECK (estado_salud IN ('Estable', 'Critico', 'Fallecido', 'Desconocido'));

-- 3. Actualizar datos existentes de 'Crítico' a 'Critico' (sin acento)
UPDATE pacientes 
SET estado_salud = 'Critico' 
WHERE estado_salud LIKE '%tico%' OR estado_salud LIKE 'Cr%tico';

-- 4. Verificar
SELECT DISTINCT estado_salud, COUNT(*) 
FROM pacientes 
GROUP BY estado_salud
ORDER BY estado_salud;
