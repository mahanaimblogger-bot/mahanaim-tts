# 🎙️ mahanaim-tts

Convierte un **guion de podcast** (con marcas de pausa/tono/locutor) en **audio**.
Funciona 100 % en tu navegador con **Web Speech API**: sin internet, sin costes, sin instalar nada.

## ✨ Qué hace
- Pegas o cargas un guion `.txt`.
- Lo editas directamente en el área de texto.
- Interpreta las marcas del guion **sin leerlas en voz alta**:
  - `[PAUSA 2s]` → silencio real de 2 segundos (1s, 3s, etc.).
  - `(tono …)` → se ignora como etiqueta (no se lee).
  - `LOCUTOR=…` → selecciona voz al cambiar de locutor (opcional).
  - `[ENFASIS]`, `[EXPECTATIVA]` → marcas expresivas (no se leen).
  - `[INTRO]`, `[CUERPO]`, `[CIERRE]`, `[FIN]` → solo estructura, no se leen.
  - `#` (metadatos) → no se leen.
- Elige **voz**, velocidad y volumen.
- Reproduce en vivo para revisar el guion.

## ▶️ Cómo usarlo
1. Descarga/clona la carpeta en tu PC.
2. **Abre `index.html` en un navegador** (Chrome o Edge, con voz en español instalada).
   > Tip: funciona mejor si abres el archivo directamente y permites audio.
3. Carga tu guion `.txt`, ajusta voz y velocidad, y pulsa **▶️ Reproducir en vivo**.

## ⚠️ Sobre "descargar el audio"
La voz gratuita del navegador (Web Speech API) **no permite exportar el audio a un archivo**
de forma fiable. Con esta versión **escuchas en vivo** en tu PC.
Para obtener un **MP3/WAV descargable de buena calidad** habrá que conectar un motor de voz
adicional (en la nube, p. ej. ElevenLabs/Google, o uno local). La app está pensada para
enchufarlo más adelante sin reescribirla.

## 📁 Archivos
- `index.html` · interfaz
- `styles.css` · estilos
- `app.js` · lógica (parseo + voz)
- `README.md` · este archivo

## 🚧 Próximos pasos (opcional)
- Motor para exportar MP3/WAV.
- Soporte multilingüe y más acentos latinos.
- Interfaz para abrir varios guiones a la vez.