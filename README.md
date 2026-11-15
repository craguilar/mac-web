# mac-web
Web for MAC 

---

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

`npm test` usa las herramientas incorporadas de Node.js: valida sintaxis, referencias locales, contenido bilingüe aprobado y límites del prototipo. `npm run build` copia `public/` a `dist/`; no publica ni despliega.

## Estructura

- `public/index.html`: documento, metadatos y carga de recursos.
- `public/assets/content.js`: textos en español e inglés.
- `public/assets/app.js`: navegación, idioma, ilustración y vista previa del formulario.
- `public/assets/styles.css`: diseño adaptable y estilos de accesibilidad.
- `public/assets/fonts/`: fuentes locales con licencias incluidas.
- `licenses/` y `THIRD_PARTY_NOTICES.md`: avisos y procedencia de las fuentes.
- `tests/`: comprobaciones estáticas reproducibles.

## Alcance y pendientes

- El formulario **no envía ni guarda mensajes**. Valida los campos y muestra una vista previa en el navegador. Los datos se mantienen solo en memoria mientras la página está abierta.
- No hay servidor de contacto, analítica, cookies, almacenamiento persistente, credenciales, integración de correo ni automatización de despliegue.
- Los servicios y el destino de contacto requieren confirmación antes de producción.
- Antes del lanzamiento: confirmar dominio y contacto, implementar y probar el envío real, definir los avisos de privacidad necesarios, configurar cabeceras de seguridad del alojamiento y completar revisión de accesibilidad y compatibilidad de navegadores.
- Este repositorio no activa GitHub Pages ni publica un sitio de producción.

## Licencias

Las fuentes de terceros se distribuyen con Apache-2.0 y OFL-1.1, según `THIRD_PARTY_NOTICES.md`. Las ilustraciones geométricas son recursos originales del prototipo, no fotografías de clientes ni reproducciones de textiles tradicionales específicos.

No se ha elegido una licencia de código abierto para el código, diseño o textos originales. La visibilidad pública del repositorio no sustituye esa decisión. Las licencias de las fuentes no se extienden al resto del proyecto.
