# Third-party services, licences and brand assets

RAN EmailOctopus for Jetpack Forms contains no bundled third-party PHP,
JavaScript, CSS or fonts. Its own source is GPL-2.0-or-later; see
[LICENSE](LICENSE).

At an administrator's option, it integrates with these independent services:

- **Jetpack Forms** is required and supplies the contact-form blocks.
- **EmailOctopus** receives authenticated administrative requests for account
  form or list configuration while an administrator edits a destination,
  resolves custom fields, or explicitly runs a profile health check. It receives
  an opted-in visitor's email address and explicitly mapped fields only when an
  eligible configured form is submitted.

Administrators must review and accept each provider's terms and privacy policy
before enabling it. The plugin does not bundle or redistribute provider code.

## Bundled brand assets

- `assets/emailoctopus-logo.svg` is derived from the EmailOctopus icon shipped
  with the official EmailOctopus WordPress plugin 3.1.10. EmailOctopus names and
  marks remain the property of EmailOctopus; the mark is used only to identify
  the service integrated by this plugin.
- `assets/jetpack-logo.svg` is derived from the Jetpack logo shipped with the
  official Jetpack WordPress plugin 16.1. Jetpack names and marks remain the
  property of Automattic; the mark is used only to identify the required form
  service.

Neither asset indicates sponsorship or endorsement of this plugin.
