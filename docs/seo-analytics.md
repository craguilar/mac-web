# SEO bilingüe y analítica con consentimiento

## Páginas y dominio

- Español: `https://mactecnologia.com.mx/`; inglés: `https://mactecnologia.com.mx/en/`.
- El build genera contenido completo, títulos/descripciones, canonical, alternates ES/EN/x-default y metadatos sociales antes de ejecutar JavaScript. El selector conserva el borrador mientras cambia idioma y URL.
- `robots.txt` anuncia `sitemap.xml`, que contiene las dos páginas. Las imágenes sociales son PNG de 1200 × 630. Los controles del formulario se habilitan al iniciar la aplicación; sin JavaScript no se envían datos por GET.
- `infra/hosting-redirects.json` normaliza `www`, enlaces antiguos `?lang=…`, `/es/` e índices explícitos. Las rutas inexistentes deben devolver HTTP 404, no una copia del inicio con HTTP 200.
- El fallback usa `404-200` (**404 rewrite**) hacia el archivo real `/404.html`: la prueba HTTP en Amplify confirmó que conserva el estado 404 sin cambiar la URL. El tipo `404` (**404 redirect**) devolvía 302 hacia ese archivo y terminaba en 200. Las pruebas locales de configuración no pueden demostrar este comportamiento del proveedor.

Publicar primero el build que contiene `/en/index.html` y `/404.html`. Después, con el perfil AWS correcto:

```powershell
node scripts/configure-hosting.ts --app-id <APP_ID> --account <ACCOUNT_ID>
node scripts/configure-hosting.ts --app-id <APP_ID> --account <ACCOUNT_ID> --apply
```

El primer comando solo revisa. El segundo comprueba cuenta, repositorio, reglas previas conocidas y HTML inglés publicado, guarda las reglas anteriores en `.amplify/hosting-rules-<fecha>.json`, aplica únicamente redirects y comprueba la lectura posterior. No modifica DNS, secretos ni variables de entorno. Para revertir, usar `aws amplify update-app --app-id <APP_ID> --custom-rules file://<BACKUP> --region us-east-2 --query app.customRules` con el backup revisado.

Comprobar en producción raíz/inglés, recursos, `www/en/`, enlaces antiguos, sitemap, robots y una ruta aleatoria inexistente. Registrar status, Location y canonical; no basta con comprobar que responde la raíz. Si las nuevas reglas de query funcionan en el hostname de Amplify pero el dominio personalizado sigue sirviendo HTML almacenado, volver a desplegar para invalidar la caché y repetir las pruebas. Enviar el sitemap en Google Search Console cuando el propietario conecte/verifique el dominio.

## Crear y conectar GA4

1. En [Google Analytics](https://analytics.google.com/), entrar con la cuenta propietaria. En Administrar, crear una cuenta si aún no existe y una propiedad **MAC Tecnología**. Elegir zona horaria de informes y moneda del negocio; usar MXN si corresponde.
2. Crear un flujo **Web** para `https://mactecnologia.com.mx`, nombre **MAC Tecnología web**. Desactivar **Medición mejorada** completa, incluidos cambios de historial y formularios. No instalar otro fragmento automático ni otro contenedor de Tag Manager.
3. Copiar el **ID de medición `G-…`** del flujo. Es público. No se necesita una clave privada ni un secreto de Measurement Protocol.
4. En variables de la rama `main` de Amplify, configurar `GA4_MEASUREMENT_ID` y `GA4_ENABLED=true`, y desplegar. Sin esta activación explícita, el sitio no carga Google ni muestra una solicitud de consentimiento innecesaria. Los builds locales permanecen desactivados aunque el entorno contenga un ID.
5. Revisar la configuración del Google tag: no habilitar destinos adicionales, datos proporcionados por usuarios, señales publicitarias ni personalización en esta entrega. La política de privacidad debe explicar proveedores, finalidades y decisiones de analítica con datos reales aprobados.
6. Verificar colección en GA4 Realtime. Confirmar un `page_view` después de aceptar y un `generate_lead` después de un envío real autorizado. Marcar `generate_lead` como evento clave cuando se haya verificado. Representa aceptación por el endpoint/SES, no una venta ni un lead comercialmente calificado.

## Comportamiento implementado

El consentimiento básico ofrece aceptar/rechazar con el mismo énfasis y un control permanente de preferencias. Guarda únicamente elección, versión y fecha en almacenamiento local por hasta 180 días; nunca guarda el borrador del formulario. Si el navegador impide guardar, la elección se aplica solo a la visita y se informa de ello.

Google se carga dentro de un contexto de analítica separado únicamente después de aceptar y solo en el host canónico HTTPS. Ese contexto no contiene el formulario. Rechazar o retirar destruye el contexto, descarta eventos pendientes y elimina las cookies propias con prefijo `mac_ga`. Una retirada en otra pestaña también detiene la colección. No puede retirarse información ya transmitida antes de la revocación.

Los eventos conectados son `page_view`, `language_change`, `contact_open` y `generate_lead`. Solo pasan valores enumerados; `generate_lead` requiere éxito de la API. No se incluyen nombre, correo, empresa, mensaje, token, consultas/fragments de URL ni referrers. Las páginas se informan con sus URLs canónicas. La configuración desactiva page views automáticos y publicidad; las opciones remotas de Medición mejorada deben permanecer desactivadas.

La prueba automatizada ejecuta el bundle contra un DOM de pruebas, simula el proveedor y comprueba que un fallo o doble clic no genera leads adicionales. También prueba el aislamiento de mensajes, la configuración de Google, el rechazo previo, la persistencia y la revocación. Estas pruebas no acreditan recepción en GA4 ni sustituyen revisar red y presentación en un navegador real.

### Verificación en navegador

- Perfil nuevo, pendiente y rechazo: cero solicitudes a Google; navegación y contacto siguen disponibles.
- Aceptación: aparece Google solo entonces; las URLs de medición son canónicas, sin parámetros de consulta ni datos de contacto.
- Retirada: sin eventos posteriores, sin contexto de analítica ni cookies `mac_ga`; recargar mantiene la negativa. Probar también revocación durante una carga lenta y entre pestañas.
- ES/EN: contenido, enlaces, metadatos, texto de consentimiento, teclado, zoom y formulario en iOS/Android. Comprobar que el borrador persiste al cambiar idioma.
- Previews/local: cero colección, incluso con consentimiento almacenado.

## Primera campaña: propuesta pendiente de cuenta y presupuesto

Objetivo inicial: consultas de empresas que necesitan desarrollar o mejorar software. Propuesta de partida: Search en español; Chiapas y Ciudad de México son las zonas del plan previo, pendientes de ratificación. Usar ubicación por presencia, grupos por intención y términos de búsqueda revisados. No se han creado anuncios ni autorizado gasto.

| Grupo propuesto | Palabras iniciales para revisar en Keyword Planner | URL |
| --- | --- | --- |
| Software para empresas | «desarrollo de software para empresas», «software a medida», «mejorar sistema empresarial» | `https://mactecnologia.com.mx/#services` |
| Arquitectura y mejora | «consultoría de software», «revisión de arquitectura de software» | `https://mactecnologia.com.mx/#services` |

Empezar con concordancia exacta/de frase y revisar consultas reales. Negativas propuestas: empleo, vacantes, sueldo, cursos, tutorial, universidad, gratis y descargar. Validarlas frente a la oferta; no hay estimación de volumen, CPC o retorno comprobada.

Titulares de borrador (máximo 30 caracteres): **Software para tu negocio**, **Desarrollo de software**, **Mejora tus sistemas**, **Consultoría de software**, **Tecnología útil en Chiapas**, **MAC Tecnología**.

Descripciones de borrador (máximo 90 caracteres):

- Desarrollamos herramientas para tu negocio y mejoramos sistemas existentes. Hablemos.
- Software, arquitectura y pruebas con un equipo chiapaneco. Cuéntanos tu proyecto.
- Un primer paso claro, con alcance y prioridades definidos para tu negocio.

Antes de lanzar faltan cuenta Google Ads, presupuesto mensual/tope, ubicaciones, responsable de responder y aprobación de creatividades. También falta verificar medición de Ads: esta entrega mantiene `ad_storage`, `ad_user_data` y `ad_personalization` denegados y elimina parámetros de campañas/clics. No debe suponerse atribución publicitaria por tener GA4 o importar un evento. Definir y probar esa integración/consentimiento por separado, con la política de privacidad correspondiente, antes de optimizar por conversiones.

## Referencias

- [Redirects de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html).
- [Crear propiedad y flujo GA4](https://support.google.com/analytics/answer/14183469?hl=es).
- [Consentimiento básico de Google](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic).
- [Configuración de GA4](https://developers.google.com/analytics/devguides/collection/ga4/reference/config).
- [Medición mejorada](https://support.google.com/analytics/answer/9216061?hl=es).
- [Especificaciones de anuncios Search](https://support.google.com/google-ads/answer/17092074?hl=es).
