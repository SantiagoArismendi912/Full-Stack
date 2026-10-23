# Clonar la voz de Nyla con VoiceStudio y generar el storytelling

Todo corre en tu PC: no se sube nada a terceros ni se gastan créditos.

## 1 · Instalar VoiceStudio
- macOS / Linux: `curl -fsSL https://voicestudio.sh/install | sh`
- Windows (PowerShell): `irm https://voicestudio.sh/install | iex`
- O descarga el instalador desde https://github.com/debpalash/VoiceStudio/releases/latest
- Sin GPU funciona en CPU (más lento). La primera vez descargará el modelo del motor VoiceStudio (OmniVoice): acepta la descarga cuando te la pida.
- Licencia: la app es AGPL-3.0; **los modelos de voz tienen licencias aparte**: revisa la nota del Model Manager antes de usar la voz en algo comercial.

## 2 · Clonar la voz (una sola vez)
1. Abre **Voice cloning**.
2. Carga `storytelling-video/referencia/referencia-nyla.wav` (14 s de la voz limpia, sin música) y pega su texto, que está en `referencia-nyla.txt`.
3. Guarda la voz como perfil, por ejemplo "Nyla Jornexa".
4. Prueba una frase: ¡Qué esperas! ¡Solicita tu demo! Si suena muy plana, la voz clonada hereda la entrega de la muestra (Nyla en tono tranquilo): vuelve a probar con otra semilla o sube el ritmo.

## 3 · Generar las 19 frases automáticamente
Con VoiceStudio abierto (el backend escucha en http://127.0.0.1:3900), desde la carpeta `storytelling-video/tools`:

```bash
python generar_con_voicestudio.py voces --muestra ../referencia/referencia-nyla.wav --texto-muestra ../referencia/referencia-nyla.txt
```
o con el perfil guardado: `python generar_con_voicestudio.py voces --perfil <id-del-perfil>`.
Escribe `voces/voz-<escena>-<n>.wav` (19 archivos) con un poco más de ritmo hacia el final.

## 4 · Mándamelos
Comprime la carpeta `voces` en un ZIP y súbela a la conversación. Yo hago el resto: ajusto música y tiempos, renderizo el video horizontal (y el vertical si lo pides) y te lo envío.
