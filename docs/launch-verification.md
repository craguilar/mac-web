# Launch verification — 19 November 2026

This record supplements the older launch roadmap. Production uses Spanish at `/`, English at `/en/`, the apex canonical domain, Amplify Gen 2 contact delivery, and consent-gated GA4 (`G-6EZD2Y7G2D`). The owner confirmed real contact-email delivery, operational-alert receipt, and GA4 visits before this review.

## Security changes in PR #21

[PR #21](https://github.com/craguilar/mac-web/pull/21) adds HTTP CSP, HSTS, MIME, referrer, framing and permissions headers. CSP permits local assets, the exact production contact endpoint, Cloudflare Turnstile, and Google's documented analytics-only destinations. Inline scripts/styles and third-party framing are blocked. The same-origin analytics iframe remains allowed. HSTS applies to the current host without preloading or assuming every subdomain is HTTPS-ready. HTML `no-store` rules remain in place for the language-query redirects.

The overrides patch Handlebars 4.7.10, Lodash 4.18.1, Immutable 3.8.4, GraphQL Tools utils 12.1.0, Minimatch 11.0.9, Glob 14.0.6 where npm can replace them. Schema 10.1.5 and merge 9.2.8 accompany the GraphQL utility upgrade to preserve generator compatibility and GraphQL 15 support. Revisit overrides when Amplify/CDK ship patched dependency trees.

The full development audit is **not clean**. Do not dismiss these findings as fixed:

| Remaining upstream dependency | Advisory / scope | Follow-up |
| --- | --- | --- |
| CDK's bundled Minimatch 10.2.6 | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), moderate glob amplification DoS | The current CDK release bundles its own copy, unaffected by npm overrides. Monitor a patched CDK release. Build patterns are repository-controlled; do not feed untrusted patterns to build tooling. |
| Amplify's bundled OpenTelemetry core 2.0.0 | [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf), moderate unbounded baggage allocation | The current Amplify data constructs bundle nested copies that npm overrides cannot replace. Keep build tooling away from untrusted telemetry input and monitor upstream releases. |
| Amplify's Zod 3.x dependencies, including bundled copies | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), high memory exhaustion on oversized collections | No compatible Zod 3 fix was identified. A forced Zod 4 substitution would break Amplify's schema contract. Monitor upstream fixes; validate only trusted build/config inputs. |

These packages are build dependencies, not scripts served to visitors or dependencies of the SES Lambda handler. That limits the exposed path; it does not eliminate build-time risk. CI has read-only repository access, no AWS credentials and no deployment step. Production-only npm audit reported zero findings. The original 10 GitHub alerts include multiple advisories for the same packages; inherited npm audit rows are not independent vulnerabilities.

Run `npm ci`, `npm run check`, `npm test`, the backend synthesis/security checks and CloudFormation checks before merging. CI uses the official Playwright 1.65.1 Ubuntu 24.04 image, pinned by digest, with preinstalled Chromium/WebKit, and runs `npm run test:browser`. Those tests enforce the actual header policy against the real static build at mobile viewport sizes, with vendor scripts and API responses intercepted. They verify both languages, consent/rejection/withdrawal, validation, failed delivery, one accepted `generate_lead`, and exclusion of private fields. They do not prove delivery to SES, Google receipt, real Turnstile behavior or physical-device usability. Failure screenshots/traces are retained for seven days as CI artifacts and contain only synthetic test data. The first passing mobile run covered both languages in both engines (4 cases), alongside 61 regression tests, type checking, backend synthesis/security and CloudFormation validation. WebKit exposed a wrong-sender postMessage behavior; sending through the caller window's native method fixes it while retaining exact sender/origin checks. Analytics transport errors now fail closed without interrupting accepted-contact feedback.

Sources: [Amplify headers](https://docs.aws.amazon.com/amplify/latest/userguide/custom-header-YAML-format.html), [Turnstile CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/), [Google analytics-only CSP](https://developers.google.com/tag-platform/security/guides/csp).

## Privacy notice inputs still required

The [ES/EN notice draft](privacy-notice-draft.md) is prepared for review but is not published. The owner was asked for the legal controller name, publishable address, privacy-request email and contact-message retention policy. Do not substitute the private form-recipient address or invent these facts.

Verified implementation inventory for the notice:

- Required name, email and message; optional company and service topic. Purpose: answer an inquiry.
- AWS Amplify/API Gateway/Lambda/SES deliver to the fixed Google-hosted business inbox; Cloudflare verifies submissions against spam.
- Form drafts stay in page memory. The site does not persist the message in browser storage or a database.
- Lambda logging retention is one week; handlers avoid logging form bodies or secret values. This is separate from mailbox retention, which still needs confirmation.
- Optional Google Analytics receives allowlisted events and canonical language URLs, excluding form fields and URL query strings. Consent is required before loading Google. Enhanced measurement was turned off by the owner.
- Consent choices expire after 180 days. Analytics cookies are configured for 180 days and removed on withdrawal. Google property-level retention has not been inspected; do not infer it from the cookie lifetime.
- The final notice must explain rights/contact procedures, processors, retention and how to change analytics preferences in both languages, using the confirmed business details.

## Real lead and mobile acceptance check

After deployment, on a phone open the production site, accept analytics, complete Turnstile, and send one clearly labelled test inquiry using an address controlled by the tester. Confirm the success message and inbox receipt/Reply-To. In GA4 Realtime, confirm `generate_lead` appears once. Rejecting analytics must still allow contact delivery without a lead event.

In GA4 Admin → Data display → Events, find `generate_lead` and mark the existing event with the key-event star. Do not create another trigger from `page_view` or `form_submit`; the site already sends the event after API acceptance. Do not assign an invented monetary value. Key-event receipt and account configuration remain unverified until observed or confirmed by the owner. [Google instructions](https://support.google.com/analytics/answer/13128484).

## Search Console

The owner supplied a domain-verification TXT value. It was appended to the apex Route 53 TXT record without replacing existing values. Route 53 reported `INSYNC`, and Google's public DNS returned the verification value. The owner then confirmed **domain ownership verified and sitemap submitted successfully** for `https://mactecnologia.com.mx/sitemap.xml`.

The owner also confirmed both URL Inspection live tests passed for `https://mactecnologia.com.mx/` and `https://mactecnologia.com.mx/en/`, with indexing requested or already indexed. Sitemap submission and a successful live test do not guarantee indexing or ranking. Keep the ownership TXT record in place.

A manual CI run with `live_prod_checks=true` performs read-only Chromium/WebKit checks against the deployed site and saves mobile screenshots. It rejects analytics and aborts any contact API or Google measurement request; it never submits a message.
