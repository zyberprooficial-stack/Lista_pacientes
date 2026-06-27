# Script para convertir imágenes PNG a WebP usando cwebp (si está instalado) o alternativa online

param(
    [string]$InputPath = ".",
    [int]$Quality = 85
)

# Función para convertir con cwebp si está disponible
function Convert-WithCWebP {
    param($pngFile, $webpFile, $quality)
    
    try {
        $cwebpPath = Get-Command cwebp -ErrorAction SilentlyContinue
        if ($cwebpPath) {
            Write-Host "Convirtiendo con cwebp: $pngFile -> $webpFile" -ForegroundColor Cyan
            & cwebp -q $quality $pngFile -o $webpFile
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Obtener archivos PNG
$pngFiles = Get-ChildItem -Path $InputPath -Filter "*.png"

Write-Host "=== Conversión PNG a WebP ===" -ForegroundColor Green
Write-Host "Encontrados $($pngFiles.Count) archivos PNG" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $pngFiles) {
    $webpName = [System.IO.Path]::ChangeExtension($file.Name, ".webp")
    $webpPath = Join-Path $file.DirectoryName $webpName
    
    Write-Host "Procesando: $($file.Name) ($([math]::Round($file.Length/1KB, 2)) KB)" -ForegroundColor White
    
    # Intentar convertir con cwebp
    $converted = Convert-WithCWebP $file.FullName $webpPath $Quality
    
    if ($converted) {
        $webpFile = Get-Item $webpPath
        $reduction = [math]::Round((1 - ($webpFile.Length / $file.Length)) * 100, 2)
        Write-Host "  ✓ Convertido: $webpName ($([math]::Round($webpFile.Length/1KB, 2)) KB, reducción: $reduction%)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ No se pudo convertir (cwebp no disponible)" -ForegroundColor Red
        Write-Host "  → Instala cwebp desde: https://developers.google.com/speed/webp/download" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "=== Proceso completado ===" -ForegroundColor Green
