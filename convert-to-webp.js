/**
 * Script para convertir imágenes PNG a WebP usando sharp
 * Uso: node convert-to-webp.js
 */

const fs = require('fs');
const path = require('path');

// Verificar si sharp está instalado
let sharp;
try {
    sharp = require('sharp');
} catch (error) {
    console.log('📦 sharp no está instalado. Instalando...');
    console.log('Ejecuta: npm install sharp');
    process.exit(1);
}

// Configuración
const quality = 85;
const inputDir = './frontend';
const pngFiles = ['1.png', '2.png'];

console.log('=== Conversión PNG a WebP ===\n');

async function convertImage(filename) {
    const inputPath = path.join(inputDir, filename);
    const outputPath = path.join(inputDir, filename.replace('.png', '.webp'));
    
    try {
        // Obtener tamaño original
        const stats = fs.statSync(inputPath);
        const originalSize = stats.size;
        
        console.log(`📸 Procesando: ${filename} (${(originalSize / 1024).toFixed(2)} KB)`);
        
        // Convertir a WebP
        await sharp(inputPath)
            .webp({ quality: quality })
            .toFile(outputPath);
        
        // Obtener tamaño nuevo
        const newStats = fs.statSync(outputPath);
        const newSize = newStats.size;
        const reduction = ((1 - (newSize / originalSize)) * 100).toFixed(2);
        
        console.log(`  ✅ Convertido: ${path.basename(outputPath)}`);
        console.log(`     Original: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log(`     WebP: ${(newSize / 1024).toFixed(2)} KB`);
        console.log(`     Reducción: ${reduction}%\n`);
        
        return true;
    } catch (error) {
        console.error(`  ❌ Error al convertir ${filename}:`, error.message);
        return false;
    }
}

async function main() {
    let converted = 0;
    
    for (const file of pngFiles) {
        const success = await convertImage(file);
        if (success) converted++;
    }
    
    console.log(`\n=== Proceso completado ===`);
    console.log(`✅ ${converted}/${pngFiles.length} imágenes convertidas exitosamente`);
    
    if (converted === pngFiles.length) {
        console.log('\n💡 Ahora actualiza las referencias en index.html de .png a .webp');
    }
}

main();
