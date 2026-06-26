-- ==========================================
-- VERIFICACIÓN Y APLICACIÓN DE MIGRACIONES
-- Verifica si las columnas edad y telefono existen
-- y las agrega si no están presentes
-- ==========================================

-- Verificar estructura actual
SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'pacientes'
ORDER BY ordinal_position;

-- ==========================================
-- AGREGAR COLUMNA TELEFONO SI NO EXISTE
-- ==========================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pacientes' 
        AND column_name = 'telefono'
    ) THEN
        ALTER TABLE pacientes 
        ADD COLUMN telefono VARCHAR(20) CHECK (telefono IS NULL OR char_length(telefono) >= 7);
        
        CREATE INDEX idx_pacientes_telefono ON pacientes (telefono) WHERE telefono IS NOT NULL;
        
        COMMENT ON COLUMN pacientes.telefono IS 'Número de contacto del paciente o familiar (opcional)';
        
        RAISE NOTICE '✅ Columna telefono agregada exitosamente';
    ELSE
        RAISE NOTICE '⚠️  Columna telefono ya existe';
    END IF;
END $$;

-- ==========================================
-- AGREGAR COLUMNA EDAD SI NO EXISTE
-- ==========================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pacientes' 
        AND column_name = 'edad'
    ) THEN
        ALTER TABLE pacientes 
        ADD COLUMN edad INTEGER CHECK (edad IS NULL OR (edad >= 0 AND edad <= 150));
        
        CREATE INDEX idx_pacientes_edad ON pacientes (edad) WHERE edad IS NOT NULL;
        
        COMMENT ON COLUMN pacientes.edad IS 'Edad del paciente en años (opcional)';
        
        RAISE NOTICE '✅ Columna edad agregada exitosamente';
    ELSE
        RAISE NOTICE '⚠️  Columna edad ya existe';
    END IF;
END $$;

-- ==========================================
-- AGREGAR CAMPOS GEOGRÁFICOS SI NO EXISTEN
-- ==========================================
DO $$ 
BEGIN
    -- Agregar id_estado
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pacientes' 
        AND column_name = 'id_estado'
    ) THEN
        ALTER TABLE pacientes 
        ADD COLUMN id_estado INTEGER REFERENCES estados(id_estado);
        
        CREATE INDEX idx_pacientes_id_estado ON pacientes (id_estado);
        
        RAISE NOTICE '✅ Columna id_estado agregada exitosamente';
    ELSE
        RAISE NOTICE '⚠️  Columna id_estado ya existe';
    END IF;
    
    -- Agregar id_municipio
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pacientes' 
        AND column_name = 'id_municipio'
    ) THEN
        ALTER TABLE pacientes 
        ADD COLUMN id_municipio INTEGER REFERENCES municipios(id_municipio);
        
        CREATE INDEX idx_pacientes_id_municipio ON pacientes (id_municipio);
        
        RAISE NOTICE '✅ Columna id_municipio agregada exitosamente';
    ELSE
        RAISE NOTICE '⚠️  Columna id_municipio ya existe';
    END IF;
    
    -- Agregar id_parroquia
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pacientes' 
        AND column_name = 'id_parroquia'
    ) THEN
        ALTER TABLE pacientes 
        ADD COLUMN id_parroquia INTEGER REFERENCES parroquias(id_parroquia);
        
        CREATE INDEX idx_pacientes_id_parroquia ON pacientes (id_parroquia);
        
        RAISE NOTICE '✅ Columna id_parroquia agregada exitosamente';
    ELSE
        RAISE NOTICE '⚠️  Columna id_parroquia ya existe';
    END IF;
END $$;

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length,
    CASE 
        WHEN column_name IN ('telefono', 'edad') THEN '🆕 Campo nuevo'
        ELSE '📋 Campo original'
    END as tipo
FROM information_schema.columns
WHERE table_name = 'pacientes'
ORDER BY ordinal_position;

-- Contar registros
SELECT 
    COUNT(*) as total_pacientes,
    COUNT(telefono) as con_telefono,
    COUNT(edad) as con_edad,
    COUNT(id_estado) as con_estado,
    COUNT(id_municipio) as con_municipio,
    COUNT(id_parroquia) as con_parroquia
FROM pacientes;

SELECT '✅ Verificación completada. Ejecuta este script en tu base de datos PostgreSQL.' AS resultado;
