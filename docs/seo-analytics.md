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

Comprobar en producción raíz/inglés, recursos, `www/en/`, enlaces antiguos, sitemap, robots y una ruta aleatoria inexistente. Registrar status, Location y canonical; no basta con comprobar que responde la raíz. El archivo `customHttp.yml` evita almacenar únicamente las entradas HTML `/` y `/en/` (y sus índices explícitos): la caché estática de Amplify no incluye queries en su clave y puede omitir los redirects antiguos cuando ya hay HTML almacenado. Los recursos estáticos conservan su caché. Desplegar los cambios de cabeceras y probar primero las URLs canónicas y después `?lang=…`, para cubrir la caché caliente. Enviar el sitemap en Google Search Console cuando el propietario conecte/verifique el dominio.

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

## Primera campaña: piloto de Search en Tuxtla Gutiérrez

El 19 de noviembre de 2026, el propietario confirmó **Tuxtla Gutiérrez**, un límite mensual de **MX$1,000 incluyendo impuestos** y que necesita crear la cuenta de Google Ads. Este documento es el borrador para configurar un primer piloto de 30 días. El alta de la cuenta está en curso y falta comprobar su facturación; la campaña aún no está activada. El piloto no se renueva automáticamente.

### Presupuesto del piloto

| Concepto | Importe MXN |
| --- | ---: |
| Presupuesto total de medios | 850.00 |
| Reserva de IVA, calculada al 16% | 136.00 |
| Total previsto con ese IVA | 986.00 |
| Margen hasta el límite del propietario | 14.00 |

El importe que se configura en **Presupuesto total de la campaña** es **850**, no 1,000. Google documenta IVA del 16% para México; comprobar país real de facturación, impuestos y cualquier cargo mostrado en la cuenta antes de activar. Si el total excede MX$1,000, reducir medios para respetar el límite. Los depósitos de prepago financian el mismo presupuesto; no son presupuesto adicional. No contar créditos promocionales como dinero disponible ni comprometer gasto para conseguirlos.

Usar un presupuesto total para una campaña nueva de Search con fecha inicial pendiente de aprobación y fecha final 29 días después, en la zona horaria de la cuenta. Google admite este tipo de presupuesto para Search y Maximize clicks; limita el importe de medios facturado para el periodo, pero no impone un máximo diario. No extender fechas, aumentar el presupuesto ni reiniciar el piloto automáticamente. Si la cuenta no ofrece presupuesto total, revisar la alternativa antes de activar: un presupuesto diario medio no garantiza el mismo tope para un periodo de 30 días que cruza meses.

### Configuración para cargar en Google Ads

| Ajuste | Valor del borrador |
| --- | --- |
| Nombre | `MAC - Search - Tuxtla - Software a medida - Piloto` |
| Estado inicial | Borrador o pausada; activación pendiente de revisión final |
| Tipo / objetivo de puja | Search; visitas al sitio mediante Maximizar clics |
| Red | Solo Búsqueda de Google; socios de búsqueda y expansión a Display desactivados |
| Ubicación | Ciudad de Tuxtla Gutiérrez, Chiapas, México; seleccionar y verificar el resultado de ciudad en Ads |
| Opción de ubicación | Presencia: personas que están o suelen estar en la ubicación; quitar objetivos predeterminados más amplios |
| Idioma | Español |
| Grupo de anuncios | `Software para empresas` |
| Oferta | Crear software a medida o mejorar una aplicación de negocio existente |
| Destino | `https://mactecnologia.com.mx/` |
| Presupuesto / duración | MX$850 total de medios; 30 días con inicio por definir |
| Límite inicial de puja CPC | MX$10; sin ajustes de puja adicionales |
| Dispositivos / horario | Todos los dispositivos; todos los días, sin restricciones iniciales de horario |
| Audiencias | Sin remarketing ni exclusiones demográficas iniciales |
| Expansiones | AI Max, concordancia amplia, expansión de URL y personalización automática de textos desactivadas |
| Recomendaciones automáticas | No aplicar automáticamente aumentos de presupuesto, ampliaciones de segmentación ni cambios de puja |

El CPC de MX$10 es una propuesta para controlar costo, **no una estimación del mercado**. Revisar las seis palabras en Keyword Planner con Tuxtla, español y Google Search cuando la cuenta esté disponible. Registrar fecha, volumen, CPC estimado y previsión de clics/gasto antes de decidir si el límite permite participar. Una puja baja puede impedir la entrega; no ampliarla ni cambiar de ciudad sin revisar el plan. Este presupuesto puede producir pocas visitas y ninguna consulta; no hay una promesa de volumen, ventas o retorno.

### Palabras clave iniciales

Un solo grupo con seis términos. Los corchetes indican concordancia exacta y las comillas concordancia de frase; ambas pueden incluir variantes cercanas, por lo que hay que revisar búsquedas reales.

```text
[desarrollo de software a medida]
"desarrollo de software para empresas"
[empresa de desarrollo de software]
"software a medida para empresas"
[desarrollo de sistemas a medida]
"desarrollo de sistemas para empresas"
```

Negativas de campaña: cargar cada término de una palabra como negativa amplia y las dos expresiones entre comillas como negativas de frase. Las variantes se enumeran porque las negativas no cubren automáticamente todas las variantes cercanas.

```text
empleo
empleos
vacante
vacantes
sueldo
salario
curso
cursos
tutorial
tutoriales
diplomado
universidad
licenciatura
tesis
tarea
descargar
descarga
crack
pirata
"software gratis"
"software gratuito"
```

### Anuncio adaptable de búsqueda

Descripción del negocio para el asistente de Google: **MAC Tecnología desarrolla software a medida para empresas. Creamos herramientas internas, integramos sistemas y mejoramos aplicaciones existentes. Somos un equipo de Chiapas y trabajamos con alcance y prioridades claros.** Categoría de servicio inicial: **Desarrollo de software a medida**. Revisar los recursos que Google genere antes de incorporarlos al anuncio.

Un anuncio inicial; Google combinará los textos, sin posiciones fijadas. No se ofrecen precios, descuentos ni resultados que no estén publicados en el sitio. Ruta visible: `software` / `empresas`; la URL final sigue siendo la raíz en español.

Titulares (máximo 30 caracteres cada uno):

- Software para tu negocio
- Desarrollo de software
- Software a medida
- Mejora tus sistemas
- Herramientas para empresas
- De la idea al primer paso
- Un alcance claro
- Trabajemos por etapas
- Cuéntanos tu proyecto
- Tecnología útil
- Equipo de Chiapas
- MAC Tecnología

Descripciones (máximo 90 caracteres cada una):

- Desarrollamos software a medida para tu negocio. Cuéntanos qué necesitas resolver.
- Mejora una aplicación existente o crea una herramienta útil para tu empresa.
- Definimos contigo un primer paso, con alcance y prioridades claros.
- Un equipo de Chiapas para trabajar por etapas y avanzar con objetivos concretos.

Textos destacados opcionales (máximo 25 caracteres): **Alcance claro**, **Trabajo por etapas**, **Software para negocios**, **Equipo de Chiapas**. El contacto se realiza en el formulario del sitio; este borrador no añade formularios alojados en Google, teléfono ni ubicación física.

### Medición y revisión

El propietario ya confirmó un envío real con mensaje de éxito, recepción de `generate_lead` en GA4 y su marcado como evento clave. Eso verifica la medición del sitio; **no acredita atribución de conversiones a Google Ads**. La implementación mantiene `ad_storage`, `ad_user_data` y `ad_personalization` denegados, elimina parámetros de campañas/clics y no transmite referrers. No basta con vincular GA4 o importar un evento para dar por resuelta esa atribución.

En este piloto, revisar impresiones, clics, términos, ubicación y gasto en Ads; revisar las consultas consentidas de GA4 y las consultas reales del inbox por separado. Un clic no es una consulta ni una venta. No presentar leads totales del sitio como conversiones de Ads ni calcular un costo por lead publicitario sin atribución verificada. Conservar los consentimientos actuales; definir y probar una integración publicitaria por separado antes de usar pujas por conversiones. La finalización del aviso de privacidad quedó aplazada por el propietario y conserva su borrador pendiente.

Después de los primeros 3 días de entrega y semanalmente, revisar gasto con impuestos, búsquedas irrelevantes, ubicación y calidad de las consultas. Añadir negativas justificadas y pausar ante un formulario roto o tráfico claramente ajeno a la oferta. Si no hay impresiones, revisar aprobación, volumen y puja antes de proponer cambios. Al cerrar los 30 días, registrar medios/impuestos, impresiones, clics, CPC, términos y consultas verificadas, distinguiendo origen confirmado de desconocido. Mantener la campaña detenida al terminar y decidir la siguiente inversión con esos datos.

### Crear la cuenta y completar el lanzamiento

1. Abrir [Google Ads](https://ads.google.com/) con la cuenta del negocio, preferiblemente la misma que administra GA4. Nombre: **MAC Tecnología**; sitio: `https://mactecnologia.com.mx/`. Elegir crear cuenta sin campaña si aparece; si el alta obliga a preparar una campaña, guardar el borrador sin activar.
2. Confirmar **MXN**, la zona horaria del negocio y el país real de la dirección de facturación. Para operaciones en Tuxtla, la zona propuesta es Ciudad de México; no deducir la dirección fiscal a partir de la ciudad objetivo. El propietario introduce datos fiscales y de pago directamente en Google, sin enviarlos al chat ni al repositorio.
3. Completar lo necesario para acceder a Keyword Planner y revisar las previsiones. Google exige completar el alta y facturación para sus funciones básicas. No añadir un segundo tag al sitio durante el asistente.
4. Cargar el borrador anterior, verificar presupuesto total e impuestos, revisar anuncio y destino, y confirmar quién atenderá las consultas del inbox. No hay una promesa de tiempo de respuesta en los anuncios.
5. Presentar la campaña concreta, fechas, cargos y ajustes finales para aprobar su activación. Registrar el identificador de campaña y el estado solo después de comprobarlos en Google Ads. Este documento por sí solo no crea ni publica anuncios.

## Referencias

- [Redirects de Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html).
- [Crear propiedad y flujo GA4](https://support.google.com/analytics/answer/14183469?hl=es).
- [Consentimiento básico de Google](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic).
- [Configuración de GA4](https://developers.google.com/analytics/devguides/collection/ga4/reference/config).
- [Medición mejorada](https://support.google.com/analytics/answer/9216061?hl=es).
- [Especificaciones de anuncios Search](https://support.google.com/google-ads/answer/17092074?hl=es).
- [Crear una cuenta de Google Ads](https://support.google.com/google-ads/answer/6366720?hl=es).
- [Presupuestos totales de campaña](https://support.google.com/google-ads/answer/10486938?hl=es).
- [IVA y facturación por país](https://support.google.com/google-ads/answer/2375370?hl=es-la).
- [Maximizar clics y límite CPC](https://support.google.com/google-ads/answer/6268626?hl=es).
- [Opciones avanzadas de ubicación](https://support.google.com/google-ads/answer/1722038?hl=es).
- [Keyword Planner y requisitos de cuenta](https://support.google.com/google-ads/answer/7337243?hl=es).
