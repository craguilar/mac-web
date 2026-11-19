# MAC Tecnología

Sitio bilingüe de MAC Tecnología, con el diseño Monolito suave. El formulario envía consultas mediante un backend de Amplify Gen 2 y Amazon SES. El destinatario se configura en AWS, nunca en el navegador.

## Especificación de lanzamiento

La [especificación técnica](docs/PROJECT_PLAN.md) define los requisitos del sitio bilingüe, el contrato de contacto, el consentimiento para GA4 y los criterios de aceptación para producción en AWS Amplify Hosting.

## Ejecutar localmente

El código de la interfaz, el backend, los scripts y las pruebas de Node está escrito en TypeScript con comprobación estricta. esbuild compila la interfaz a JavaScript estático en `dist/`, junto con HTML y CSS, sin añadir un framework. El envío local está desconectado y muestra un aviso si se intenta enviar.

```sh
npm ci
npm run build
python3 -m http.server 8000 --directory dist
```

Abrir `http://localhost:8000/` para español o `http://localhost:8000/en/` para inglés. Los enlaces antiguos `?lang=es` / `?lang=en` se reconocen; en Amplify se redirigen a las rutas canónicas. Servir `dist/` desde la raíz: navegación, sitemap y analítica utilizan esas rutas.

## SEO y analítica opcional

El build genera HTML completo ES/EN, canonical/hreflang, metadatos e imágenes sociales, sitemap y robots. La [guía de SEO y analítica](docs/seo-analytics.md) documenta redirects, configuración GA4, validación y un borrador de campaña. Analytics permanece desactivado hasta configurar `GA4_MEASUREMENT_ID` y `GA4_ENABLED=true` en Amplify. Al activarlo, Google se carga únicamente después del consentimiento y puede desactivarse desde preferencias. La configuración de una campaña Ads y su atribución requieren trabajo y aprobación propios.

## Verificar

Con Node.js 24:

```sh
npm ci
npm run check
npm test
npm run build
```

`npm test` compila la interfaz y verifica interfaz, licencias, validación compartida, envío con SES simulado, fallos, timeout y la infraestructura sintetizada de la API. `npm run check` valida los tipos de `src/`, `amplify/`, `scripts/` y las pruebas de Node. Los scripts y las pruebas se ejecutan con `tsx`; el control de rama anterior a `npm ci` utiliza el soporte nativo de TypeScript de Node 24. `npm run build` genera `dist/` sin desplegar; `npm run build -- --amplify` exige los outputs del backend y publica únicamente la URL del endpoint y la clave pública de Turnstile. No incluye los outputs completos, secretos, destinatario, fuentes TypeScript ni mapas de código en `dist/`. Estas pruebas no sustituyen comprobar la recepción real en el buzón.

## Diseño aprobado

La versión actual incorpora textos de servicios más concretos, contenido visible sin expansiones automáticas, un encabezado móvil más compacto y el texto aprobado de Nosotros. El formulario muestra nombre, correo y mensaje; empresa y tema son opcionales. Conserva el borrador tras un fallo, evita el doble clic durante el envío y permite deshacer un borrado manual. Solo confirma el envío cuando SES lo acepta; esto no garantiza su llegada a la bandeja de entrada.

## Estructura

- `src/seo-document.ts` y `src/render-site.ts`: HTML bilingüe y componentes compartidos entre build y navegador.
- `src/content.ts`: textos en español e inglés.
- `src/app.ts`: navegación, idioma, ilustración y estados de envío del formulario.
- `src/contact-*.ts`: contrato compartido, validación, cliente HTTP y verificación Turnstile.
- `scripts/*.ts`: compilación y controles de despliegue/repositorio.
- `tsconfig.json`: comprobación estricta común al proyecto.
- `public/assets/styles.css`: diseño adaptable y estilos de accesibilidad.
- `public/assets/fonts/`: fuentes locales con licencias incluidas.
- `licenses/` y `THIRD_PARTY_NOTICES.md`: avisos y procedencia de las fuentes.
- `amplify/`: una función de contacto y una API HTTP; sin base de datos ni autenticación.
- `infra/contact-prerequisites.yaml`: identidad SES/DKIM y rol de despliegue para la aplicación existente.
- `tests/*.test.ts`: pruebas reproducibles sin enviar correo real. `tests/deployment-security.test.py` conserva las comprobaciones de CloudFormation con las herramientas de Python.

## Alcance y pendientes

- Los borradores permanecen en memoria del navegador. Al enviar, AWS procesa el mensaje y SES lo entrega al buzón configurado; no se crea una base de datos ni se registran cuerpos o direcciones en los logs de la aplicación.
- El formulario incluye una explicación ES/EN de finalidad y proveedores. Sigue pendiente el aviso completo de privacidad revisado, con datos reales del responsable y conservación.
- Google Analytics está desactivado por defecto; con configuración explícita usa consentimiento básico. La elección puede guardarse localmente y las cookies propias de analítica aparecen solo al aceptar. No hay cuentas de visitantes ni autorespuestas.
- Antes de habilitar producción: completar el bootstrap de CDK, verificar identidad SES, revisar privacidad y comprobar recepción y Reply-To con un envío autorizado. La [guía de despliegue](docs/launch-runbook.md) contiene los pasos y límites operativos.
- Siguen pendientes cabeceras de seguridad, verificación de Search Console/indexación y revisión completa de accesibilidad/dispositivos del plan original. El SEO técnico bilingüe ya está implementado.

## Licencias

Las fuentes de terceros se distribuyen con Apache-2.0 y OFL-1.1, según `THIRD_PARTY_NOTICES.md`. Las ilustraciones geométricas son recursos originales del sitio, no fotografías de clientes ni reproducciones de textiles tradicionales específicos.

No se ha elegido una licencia de código abierto para el código, diseño o textos originales. La visibilidad pública del repositorio no sustituye esa decisión. Las licencias de las fuentes no se extienden al resto del proyecto.

## Despliegue en producción

Conectar `craguilar/mac-web`, rama `main`, directamente en AWS Amplify Hosting y habilitar los builds automáticos. Amplify utiliza `amplify.yml`: selecciona Node 24, verifica la rama, instala el lockfile y ejecuta tipos/pruebas antes de desplegar el backend con `ampx pipeline-deploy`. Después genera y publica `dist/` con el endpoint producido por ese backend. El estado del despliegue se consulta en Amplify.

GitHub Actions conserva el CI de validación y se ejecuta de forma independiente; Amplify no espera su resultado. Para exigir CI antes de publicar, requerir **Test and build (Node 24)** antes de fusionar PR en `main` mediante la protección de la rama. No se necesitan variables `AMPLIFY_APP_ID`, `AWS_ROLE_ARN` o `AWS_REGION` en GitHub, ni variables de aprobación por commit en Amplify. La [guía de despliegue](docs/launch-runbook.md) describe la configuración y la reversión.
