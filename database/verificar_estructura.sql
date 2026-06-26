-- ==========================================
-- VERIFICACIÓN DE ESTRUCTURA DE BASE DE DATOS
-- ==========================================

-- 1. Verificar columnas de la tabla pacientes
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pacientes'
ORDER BY ordinal_position;

-- 2. Verificar si existen las tablas de geografía
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as num_columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('estados', 'municipios', 'parroquias', 'pacientes')
ORDER BY table_name;

-- 3. Verificar índices en la tabla pacientes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'pacientes'
ORDER BY indexname;

-- 4. Verificar foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'pacientes';

-- 5. Contar registros en cada tabla
SELECT 'pacientes' AS tabla, COUNT(*) AS total FROM pacientes
UNION ALL
SELECT 'estados' AS tabla, COUNT(*) AS total FROM estados
UNION ALL
SELECT 'municipios' AS tabla, COUNT(*) AS total FROM municipios
UNION ALL
SELECT 'parroquias' AS tabla, COUNT(*) AS total FROM parroquias;

-- 6. Verificar un registro de ejemplo con JOIN
SELECT 
    p.id,
    p.nombre_completo,
    p.cedula,
    p.telefono,
    p.edad,
    p.ubicacion_actual,
    p.estado_salud,
    e.estado,
    m.municipio,
    pa.parroquia
FROM pacientes p
LEFT JOIN estados e ON p.id_estado = e.id_estado
LEFT JOIN municipios m ON p.id_municipio = m.id_municipio
LEFT JOIN parroquias pa ON p.id_parroquia = pa.id_parroquia
LIMIT 3;
