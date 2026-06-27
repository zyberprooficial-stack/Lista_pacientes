-- ==========================================
-- FIX: Corregir constraint de estado_salud
-- Problema: encoding incorrecto en el constraint
-- ==========================================

-- 1. Eliminar el constraint antiguo con encoding incorrecto
ALTER TABLE pacientes 
DROP CONSTRAINT IF EXISTS pacientes_estado_salud_check;

-- 2. Agregar el constraint correcto con encoding UTF-8 apropiado
ALTER TABLE pacientes
ADD CONSTRAINT pacientes_estado_salud_check 
CHECK (estado_salud IN ('Estable', 'Crítico', 'Fallecido', 'Desconocido'));

-- 3. Verificar que el constraint se creó correctamente
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'pacientes_estado_salud_check';

-- 4. Verificar que los datos existentes son válidos
SELECT DISTINCT estado_salud, COUNT(*) 
FROM pacientes 
GROUP BY estado_salud
ORDER BY estado_salud;

COMMIT;
