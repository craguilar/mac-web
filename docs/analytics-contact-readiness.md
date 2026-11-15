# MAC Tecnología: analítica y contacto antes del lanzamiento

## Estado de esta propuesta

Preparación, no activación. La página continúa sin enviar formularios ni cargar Google Analytics. `analytics-policy.js` es una política pura, probada y **no incluida en index.html**; no instala etiquetas, cookies ni almacena decisiones. No representa una integración terminada. La vista previa de contacto nunca equivale a una consulta enviada.

## Decisiones y datos pendientes

| Área | Necesario para activar | Criterio de salida |
| --- | --- | --- |
| GA4 | Propiedad de Carlos, ID real y dominios de producción confirmados | Etiqueta solo después de consentimiento explícito y solo en producción |
| Contacto | Correo real destinatario, responsable, canal y plazo de respuesta | Envío de prueba recibido y respuesta visible solo tras éxito del servidor |
| Privacidad | Identidad y contacto del responsable, finalidades, proveedores, conservación y mecanismo de derechos confirmados | Aviso revisado y enlazado en español e inglés |
| Infraestructura | Cuenta/región AWS y arquitectura del envío aprobadas | Secretos solo del lado servidor; controles contra abuso y monitoreo |

No se inventarán correo, razón social, domicilio, periodos de conservación ni texto legal. No se habilitarán Ads, remarketing o datos proporcionados por usuarios por defecto.

## Analítica: integración siguiente

1. Implementar consentimiento **básico**: no descargar Google ni enviar solicitudes antes de aceptar. Rechazar debe ser tan sencillo como aceptar, sin impedir navegar o contactar.
2. Guardar preferencia/versionado únicamente al implementar la interfaz real. Añadir un control permanente para retirar consentimiento y probar eliminación de cookies propias aplicables, bloqueo de eventos y comportamiento tras recargar.
3. Usar la política de este PR como condición necesaria, no suficiente: aún faltan interfaz, carga de etiqueta, gestión de revocación y pruebas en navegador.
4. Desactivar page_view automático y medición mejorada que recopile URLs/referrers o interacciones no auditadas. Enviar solo rutas canónicas sin consultas ni fragmentos, si se añaden vistas de página después.
5. Permitir eventos enumerados (`contact_open`, `language_change`, `service_view`) sin campos libres. El vocabulario de servicios deberá mapearse a los servicios definitivos, no copiar sus etiquetas libres.
6. No enviar nombres, correo, teléfono, texto del mensaje ni parámetros de URL. `generate_lead` permanece excluido hasta implementar envío real verificado, sin duplicados.
7. No medir previews de Amplify, localhost ni ramas de desarrollo. El dominio exacto debe estar en lista permitida; un ID válido no basta.

## Contacto: contrato a implementar

- Mantener el formulario marcado como vista previa hasta conectar un servicio real.
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
