# MAC Tecnología: analítica y contacto antes del lanzamiento

## Estado de esta propuesta

Al 19 de noviembre de 2026, el contacto está desplegado con Amplify Gen 2 y SES; el propietario confirmó recepción desde el formulario real después del job 11. Reply-To y la matriz de dispositivos siguen pendientes de comprobación. La integración de consentimiento/GA4 del PR #16 está publicada pero la colección sigue desactivada: falta crear la propiedad y conectar su ID. Ya existen controles ES/EN, almacenamiento de la elección y un adaptador aislado que carga Google solo tras aceptar. Las pruebas de DOM/proveedor simulado no acreditan recepción en GA4; ver la [guía de activación](seo-analytics.md). La recepción de esta prueba tampoco garantiza la entrega de consultas futuras: falta seguimiento de rebotes y quejas.

## Decisiones y datos pendientes

| Área | Necesario para activar | Criterio de salida |
| --- | --- | --- |
| GA4 | Propiedad de Carlos, ID real y dominios de producción confirmados | Etiqueta solo después de consentimiento explícito y solo en producción |
| Contacto | Despliegue y recepción real confirmados; falta comprobar Reply-To, responsable y plazo de respuesta | Mantener entrega comprobada y éxito solo tras respuesta del servidor; completar validación móvil |
| Privacidad | Identidad y contacto del responsable, finalidades, proveedores, conservación y mecanismo de derechos confirmados | Aviso revisado y enlazado en español e inglés |
| Infraestructura | Backend y controles contra abuso desplegados; alarmas de API activas, suscripción SNS confirmada y recepción de la notificación TEST confirmada por el propietario | Probar el disparo controlado de alarmas; completar monitoreo de disponibilidad, rebotes y gasto |

No se inventarán correo, razón social, domicilio, periodos de conservación ni texto legal. No se habilitarán Ads, remarketing o datos proporcionados por usuarios por defecto.

## Analítica: activación siguiente

1. Crear la propiedad GA4 y flujo Web de `https://mactecnologia.com.mx`; desactivar Medición mejorada completa. Compartir solo el ID público `G-…`.
2. Configurar `GA4_MEASUREMENT_ID` y `GA4_ENABLED=true` en Amplify y publicar; los builds locales permanecen desactivados.
3. Verificar en un navegador real que pendiente/rechazo no carga Google, aceptar lo carga y retirar elimina el contexto, descarta colas y limpia cookies propias. La preferencia versionada dura hasta 180 días; sin almacenamiento la elección es solo para la visita.
4. Contrastar `page_view`, `contact_open`, `language_change` y `generate_lead` con Realtime. El último solo se emite tras aceptación de la API/SES, con consentimiento, y no acredita una venta ni entrega final.
5. Confirmar que no se transmiten datos del formulario, consultas, fragmentos ni referentes; mantener señales y personalización publicitarias desactivadas. `service_view` está permitido por la política pero no conectado a la interfaz.
6. Revisar y publicar el aviso completo con los datos reales del responsable y las finalidades/proveedores de analítica. Preparar cualquier integración Ads como trabajo separado, con consentimiento y atribución verificados.

## Contacto: contrato y verificación

- Usar el contrato y configuración de la [guía de despliegue](launch-runbook.md); el build local desconectado informa que no puede enviar.
- Recibir por HTTPS solo campos necesarios, con límites de longitud y validación en servidor. No confiar en validación del navegador.
- Configurar origen permitido exacto, control de frecuencia, mitigación de bots y límite de tamaño. No registrar el cuerpo ni datos personales en logs de errores o analítica.
- No poner credenciales de correo en JavaScript ni en variables exportadas al cliente.
- Distinguir validación, rate limit, fallo temporal y éxito. Conservar el texto mientras se reintenta; evitar doble envío; probar teclado/lector de pantalla y ES/EN.
- Responder éxito al aceptar el servicio de entrega y monitorear rebotes/fallos por separado. No prometer recepción en la bandeja solo por obtener HTTP 200.
- Si se usa SES, confirmar dominio/remitente y estado sandbox, SPF/DKIM/DMARC y destinatario antes de abrir al público. No crear recursos con costo sin alcance aprobado.

## Pruebas de aceptación antes de producción

- Perfil limpio, rechazo y consentimiento pendiente: cero solicitudes Google.
- Aceptación: etiqueta solo en host de producción, eventos con campos permitidos, sin datos personales.
- Revocación: sin nuevos eventos; recarga y retorno mantienen la decisión.
- URLs con correo o tokens: nada de consulta/fragmento en analítica.
- Formulario real: éxito, fallo, timeout, doble clic, límites, reintento, móvil y teclado; evidencia de recepción.
- La vista previa nunca genera leads. No atribuir conversiones a clics sin envío.

## Referencias técnicas

- Google, modos de consentimiento: https://developers.google.com/tag-platform/security/concepts/consent-mode
- Google, evitar información personal: https://support.google.com/analytics/answer/6366371
- Google, configuración GA4: https://developers.google.com/analytics/devguides/collection/ga4/reference/config

Este documento es un checklist técnico, no un aviso de privacidad ni asesoría legal.

## Componentes implementados en el seguimiento

- `consent-controller.ts` y `analytics-policy.ts`: estado y filtrado de eventos permitidos; el rechazo o una configuración inválida impiden colección.
- `analytics-ui.ts` y `consent-storage.ts`: aceptar/rechazar/retirar en ES/EN, elección versionada y revocación entre pestañas.
- `analytics-adapter.ts` y `analytics-frame.ts`: contexto separado, carga de Google tras consentimiento, descarte de eventos pendientes y eliminación de cookies propias al retirar.
- `contact-validation.ts`: contrato compartido por formulario y Lambda: nombre (160), correo (254), mensaje (3000), empresa opcional (160), tema enumerado e idioma ES/EN. No sustituye controles de servidor ni verificación de entrega.
- Las pruebas automatizadas usan un DOM y proveedor simulados, sin Google ni correo real. La recepción real del contacto fue confirmada por el propietario; GA4 y presentación móvil siguen pendientes de verificación.
