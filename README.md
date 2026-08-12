# RAN EmailOctopus for Jetpack Forms

RAN EmailOctopus for Jetpack Forms connects selected saved Jetpack Forms to
EmailOctopus.

It exists to keep newsletter subscription routing separate from form delivery
and visitor verification. It is designed as a companion to RAN Turnstile for
Jetpack Forms, but either plugin can be used independently.

This plugin handles opt-in subscription behaviour. Jetpack remains responsible
for the form, notifications and feedback storage. RAN Turnstile can protect the
same forms without taking over their EmailOctopus configuration.

## What it does

- Groups selected saved Jetpack forms into independent integration profiles.
- Connects each profile to an EmailOctopus list or form.
- Maps compatible Jetpack fields to EmailOctopus fields.
- Sends only opted-in submissions to EmailOctopus.
- Redirects successful submissions to a configured success page.
- Displays profile-specific subscription results and visitor messages.
- Provides profile health checks without affecting unrelated integrations.

Unassigned forms continue through Jetpack without EmailOctopus subscription
behaviour. A saved form can belong to only one integration profile.

## Requirements

- WordPress 6.8 or later.
- PHP 8.0 or later.
- Jetpack with saved Jetpack Forms.
- An EmailOctopus account when subscriptions are enabled.

The plugin reads the API key configured by the official EmailOctopus WordPress
plugin. It does not provide a second credential field.

## Setup

1. Install and activate Jetpack.
2. Install and activate the official EmailOctopus WordPress plugin, then connect
   it to the required EmailOctopus account.
3. Install and activate RAN EmailOctopus for Jetpack Forms.
4. Create or choose compatible published saved Jetpack forms.
5. Open **Settings > RAN EmailOctopus for Jetpack Forms**.
6. Create an integration profile and assign its saved forms.
7. Select an EmailOctopus destination and save the profile.
8. Configure the email and consent sources, field mappings, success page and
   visitor messages.
9. Add `[ran_emailoctopus_jetpack_forms_subscription_message]` to the configured
   success page in a Shortcode block.
10. Run the profile health check and test an opted-in submission.

Jetpack's native **Form notifications** settings continue to control email
recipients. This plugin does not replace WordPress mail handling.

## Success pages and the shared shortcode

The plugin registers one canonical success-page shortcode, shared by every
integration profile:

`[ran_emailoctopus_jetpack_forms_subscription_message]`

The shortcode is not unique to a form or profile and does not need a form or
profile attribute. Add the same shortcode to every page selected as a profile's
success page.

- One profile may own one or more saved Jetpack forms. Those forms share that
  profile's success page and visitor messages.
- Forms that need different success pages or messages must use separate
  profiles.
- Separate profiles may use different success pages or share one success page.
  A one-time result token selects the correct profile and message after each
  submission.

Without a valid result token, or when viewed on a page other than the resolved
profile's success page, the shortcode displays nothing.

## Using it with RAN Turnstile

RAN EmailOctopus and RAN Turnstile can operate on the same Jetpack forms because
they have different responsibilities:

- RAN Turnstile verifies the visitor.
- Jetpack processes and stores the form submission.
- RAN EmailOctopus handles configured newsletter subscriptions.

Akismet can also remain enabled alongside both plugins.

## Extension points

Profile-aware integrations can adjust the effective configuration through these
filters. Each receives the effective value followed by the immutable profile ID:

- `ran_emailoctopus_jetpack_forms_contact_success_url`
- `ran_emailoctopus_jetpack_forms_emailoctopus_form_id`
- `ran_emailoctopus_jetpack_forms_emailoctopus_list_id`
- `ran_emailoctopus_jetpack_forms_emailoctopus_email_source`
- `ran_emailoctopus_jetpack_forms_emailoctopus_field_map`
- `ran_emailoctopus_jetpack_forms_newsletter_source`

## External services

Jetpack Forms is a required local plugin dependency. EmailOctopus is contacted
only when an administrator requests provider information or runs a health check,
and when an eligible visitor opts in through a configured form.

An opted-in subscription sends the visitor's email address and only the fields
deliberately mapped by the administrator. Site administrators remain responsible
for provider accounts, consent and appropriate privacy notices.

See [THIRD-PARTY.md](THIRD-PARTY.md) for the dependency and external-service
inventory.

## Development

```sh
pnpm install --frozen-lockfile
composer install --no-interaction
pnpm check
pnpm check:generated
pnpm lint:php
WP_TESTS_DIR=/path/to/wordpress-tests-lib pnpm test:php
pnpm release:verify
```

See [AGENTS.md](AGENTS.md) for the complete contributor workflow and
[RELEASE.md](RELEASE.md) for release management.

## Support

Report bugs and reproducible problems through
[GitHub Issues](https://github.com/RocketsAreNostalgic/ran-emailoctopus-jetpack-forms/issues).

RAN EmailOctopus for Jetpack Forms is licensed under
[GPL-2.0-or-later](LICENSE).
