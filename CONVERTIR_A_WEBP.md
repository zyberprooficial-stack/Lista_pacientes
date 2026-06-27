# 🖼️ Guía para Convertir Imágenes a WebP

## Método 1: Conversor Online (Más Rápido) ⚡

1. Ve a: https://cloudconvert.com/png-to-webp
2. Sube los archivos:
   - `frontend/1.png` (1.1 MB)
   - `frontend/2.png` (196 KB)
3. Configura calidad: **85%**
4. Descarga los archivos como:
   - `1.webp`
   - `2.webp`
5. Coloca los archivos en la carpeta `frontend/`

## Método 2: Usando el Conversor HTML Incluido 🌐

1. Abre en tu navegador: `convert-images-webp.html`
2. Arrastra las imágenes PNG
3. Ajusta la calidad al 85%
4. Descarga los archivos WebP generados
5. Coloca los archivos en la carpeta `frontend/`

## Método 3: GIMP (Gratis) 🎨

1. Descarga GIMP: https://www.gimp.org/downloads/
2. Abre cada imagen PNG
3. Ve a: **Archivo > Exportar Como**
4. Cambia la extensión a `.webp`
5. Configura calidad al 85%
6. Guarda en `frontend/`

## Método 4: Squoosh (Google, Online) 🔧

1. Ve a: https://squoosh.app/
2. Arrastra la imagen
3. Selecciona formato: **WebP**
4. Ajusta calidad: **85**
5. Descarga y renombra

## Método 5: Windows (Con Paint.NET + Plugin) 🪟

1. Descarga Paint.NET: https://www.getpaint.net/
2. Instala plugin WebP: https://forums.getpaint.net/topic/93676-webp-filetype/
3. Abre imagen y exporta como WebP

---

## 📊 Tamaños Esperados

| Archivo | Original (PNG) | Esperado (WebP 85%) | Reducción |
|---------|---------------|---------------------|-----------|
| 1.png   | 1,130 KB      | ~350-450 KB         | ~60-70%   |
| 2.png   | 196 KB        | ~80-100 KB          | ~50-60%   |

---

## ✅ Después de Convertir

Una vez que tengas los archivos `.webp`, los cambios en el código ya están listos.
Los archivos se usarán automáticamente con el elemento `<picture>` que incluye fallback a PNG.

**Ubicación final:**
```
frontend/
  ├── 1.png (mantener como fallback)
  ├── 1.webp (nuevo)
  ├── 2.png (mantener como fallback)
  └── 2.webp (nuevo)
```
