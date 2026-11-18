# MAC Tecnología

Sitio bilingüe de MAC Tecnología, con el diseño Monolito suave. El formulario de contacto permite revisar y copiar un mensaje; el envío real sigue pendiente.

## Especificación de lanzamiento

La [especificación técnica](docs/PROJECT_PLAN.md) define los requisitos del sitio bilingüe, el contrato de contacto, el consentimiento para GA4 y los criterios de aceptación para producción en AWS Amplify Hosting.

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

`npm test` usa las herramientas incorporadas de Node.js: valida sintaxis, referencias locales, contenido bilingüe aprobado, contraste de contacto, controles de vista previa, licencias de fuentes y límites del formulario. Son comprobaciones estáticas, no una auditoría completa de accesibilidad. `npm run build` copia `public/`, licencias y avisos a `dist/`; no publica ni despliega.

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
- No hay servidor de contacto, analítica, cookies, almacenamiento persistente, credenciales ni integración de correo.
- Los servicios y el destino de contacto requieren confirmación antes de producción.
- Antes del lanzamiento: confirmar dominio y contacto, implementar y probar el envío real, definir los avisos de privacidad necesarios, configurar cabeceras de seguridad del alojamiento y completar revisión de accesibilidad y compatibilidad de navegadores.
- AWS Amplify publica automáticamente los cambios de `main` después de ejecutar las pruebas y el build.

## Licencias

Las fuentes de terceros se distribuyen con Apache-2.0 y OFL-1.1, según `THIRD_PARTY_NOTICES.md`. Las ilustraciones geométricas son recursos originales del sitio, no fotografías de clientes ni reproducciones de textiles tradicionales específicos.

No se ha elegido una licencia de código abierto para el código, diseño o textos originales. La visibilidad pública del repositorio no sustituye esa decisión. Las licencias de las fuentes no se extienden al resto del proyecto.

## Despliegue en producción

Conectar `craguilar/mac-web`, rama `main`, directamente en AWS Amplify Hosting y habilitar los builds automáticos. Amplify utiliza `amplify.yml`: selecciona Node 24, verifica la rama, ejecuta `npm test` y `npm run build`, y publica `dist/` solo si ambos comandos terminan correctamente. El estado del despliegue se consulta en Amplify.

GitHub Actions conserva el CI de validación y se ejecuta de forma independiente; Amplify no espera su resultado. Para exigir CI antes de publicar, requerir **Test and build (Node 24)** antes de fusionar PR en `main` mediante la protección de la rama. No se necesitan variables `AMPLIFY_APP_ID`, `AWS_ROLE_ARN` o `AWS_REGION` en GitHub, ni variables de aprobación por commit en Amplify. La [guía de despliegue](docs/launch-runbook.md) describe la configuración y la reversión.
