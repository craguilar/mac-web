# MAC Tecnología

Prototipo bilingüe de la página de MAC Tecnología. Esta exportación contiene únicamente la dirección visual seleccionada: Monolito suave.

## Ejecutar localmente

El sitio es HTML, CSS y JavaScript estático, sin dependencias de ejecución ni instalación de paquetes.

```sh
python3 -m http.server 8000 --directory public
```

Abrir `http://localhost:8000/?lang=es` para español o `http://localhost:8000/?lang=en` para inglés. El selector de idioma también funciona dentro de la página. Los recursos usan rutas relativas, por lo que la carpeta `public/` puede servirse desde la raíz o un subdirectorio.

## Verificar

Con Node.js 18 o posterior:

```sh
npm test
npm run build
```

`npm test` usa las herramientas incorporadas de Node.js: valida sintaxis, referencias locales, contenido bilingüe aprobado, contraste de contacto, controles de vista previa, licencias de fuentes y límites del prototipo. Son comprobaciones estáticas, no una auditoría completa de accesibilidad. `npm run build` copia `public/`, licencias y avisos a `dist/`; no publica ni despliega.

## Diseño aprobado

La versión actual incorpora textos de servicios más concretos, contenido visible sin expansiones automáticas, un encabezado móvil más compacto y el texto aprobado de Nosotros. El formulario muestra nombre, correo y mensaje; empresa y tema son opcionales. Permite revisar y copiar el texto, volver a editar y deshacer el borrado mientras la página siga abierta.

## Estructura

- `public/index.html`: documento, metadatos y carga de recursos.
- `public/assets/content.js`: textos en español e inglés.
- `public/assets/app.js`: navegación, idioma, ilustración y vista previa local del formulario.
- `public/assets/styles.css`: diseño adaptable y estilos de accesibilidad.
- `public/assets/fonts/`: fuentes locales con licencias incluidas.
- `licenses/` y `THIRD_PARTY_NOTICES.md`: avisos y procedencia de las fuentes.
- `tests/`: comprobaciones estáticas reproducibles.

## Alcance y pendientes

- El formulario **no envía mensajes ni los guarda de forma persistente**. Valida los campos y muestra una vista previa en el navegador. Los datos y el último borrado reversible se mantienen solo en memoria mientras la página está abierta. Copiar escribe en el portapapeles únicamente cuando la persona pulsa ese botón; si no está disponible, se ofrece texto seleccionable.
- No hay servidor de contacto, analítica, cookies, almacenamiento persistente, credenciales, integración de correo ni automatización de despliegue.
- Los servicios y el destino de contacto requieren confirmación antes de producción.
- Antes del lanzamiento: confirmar dominio y contacto, implementar y probar el envío real, definir los avisos de privacidad necesarios, configurar cabeceras de seguridad del alojamiento y completar revisión de accesibilidad y compatibilidad de navegadores.
- Este repositorio no activa GitHub Pages ni publica un sitio de producción.

## Licencias

Las fuentes de terceros se distribuyen con Apache-2.0 y OFL-1.1, según `THIRD_PARTY_NOTICES.md`. Las ilustraciones geométricas son recursos originales del prototipo, no fotografías de clientes ni reproducciones de textiles tradicionales específicos.

No se ha elegido una licencia de código abierto para el código, diseño o textos originales. La visibilidad pública del repositorio no sustituye esa decisión. Las licencias de las fuentes no se extienden al resto del proyecto.
