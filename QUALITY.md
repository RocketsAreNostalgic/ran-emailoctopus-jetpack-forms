# PHP quality acceptance

This repository retains WordPress 6.8+ / PHP 8.0+ and its existing installed
Jetpack/WordPress, generated POT, immutable Admin Shell, archive/install and
Plugin Check evidence. Issue #36 owns residual quality after completed release
migration; new quality work does not reopen that migration.

## Blocking analysis

`composer analyze` runs PHPStan at an initial blocking level 3, PHP 8.0 target
and 1 GB ceiling. A measured 512 MB run exhausted memory; the 1 GB run completed.
Direct analysis covers the plugin entrypoint and every PHP file in `includes/`,
including the generated Admin Shell copy. Locked WordPress 6.8-generation stubs
provide symbols; analysis-only bootstrap constants model runtime-derived paths
and the WordPress duration constant without executing hooks. There is no baseline,
ignored diagnostic, runtime change or change to existing locked package entries.
`composer check` adds this non-mutating analysis to syntax and standards.

A higher-level probe is retained as follow-up, not silently suppressed: level 4/5
encounters defensive checks of external/PHPDoc-shaped data, optional Jetpack
`method_exists` contracts without the installed host, and integer values passed
to WordPress escaping functions. Resolve those with the existing installed-host
behavior tests before changing source or raising the floor. Do not remove
runtime guards to satisfy an analyzer. This initial floor does not claim level 5.

## Scope and retained tests

PHPCS/PHPCBF select the same entrypoint, includes, tests and installed-host smoke script with the shared
RANWordPressPlugin rules, local identity and compatibility range. There is no
PHP-CS-Fixer to retire. The generated Admin Shell also retains its immutable
package/provenance check; its locked source reference does not move here.

PHPUnit and `scripts/smoke-saved-form.php` require installed WordPress/Jetpack;
they retain syntax and native integration/smoke execution rather than being
represented as isolated production analysis. Runtime analysis covers all shipped
PHP. Syntax failure controls, formatter repeatability and final native/review/
merge evidence are separately recorded in #36; UI work remains deferred.

## Syntax and formatter acceptance

The syntax runner now rejects an empty selection and remains NUL-delimited.
`test:quality` uses the real runner/parser in disposable fixtures to prove malformed
PHP, shell-sensitive filenames, dependency/Git pruning, partial-discovery failure
and PHP-process failure behavior. Config-driven PHPCS/PHPCBF tests cover the
entrypoint, runtime, tests and installed-host smoke script, prove formatting
failures and repairs, and verify byte-stable repeated fixes. Python 3 is required
for these ordinary controls; the native runners already provide it.

The smoke script now joins the shared standards scope without exceptions. Its
execution remains in installed WordPress/Jetpack, separate from the ordinary
quality regressions. The existing installed behavior suites, generated POT,
immutable Admin Shell and release/archive gates remain required. Final native
CI/review and main evidence are recorded in #36.
