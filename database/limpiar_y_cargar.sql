-- Limpiar todas las tablas
TRUNCATE TABLE parroquias RESTART IDENTITY CASCADE;
TRUNCATE TABLE municipios RESTART IDENTITY CASCADE;
TRUNCATE TABLE estados RESTART IDENTITY CASCADE;

-- Insertar datos desde lista_estados.sql
\i 'c:/xampp/htdocs/Lista de pacientes/lista_estados.sql'
