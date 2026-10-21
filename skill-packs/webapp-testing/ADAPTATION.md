# Adaptation for Buatin

Derived from Anthropic webapp-testing at ef740771ac901e03fbca3ce4e1c453a96010f30a.
Apache-2.0. Original attribution and license retained.
Python helper execution replaced with specification guidance; no downloaded code runs.

Specify Playwright browser tests for the critical user journeys. Inspect the rendered interface before choosing selectors; prefer accessible roles and stable labels. Wait for visible application readiness rather than arbitrary delays or network-idle on polling pages. Cover validation, permissions, network errors, mobile widths and keyboard focus. Capture screenshots and browser errors. Use isolated test accounts and synthetic fixtures, clean them up, never claim tests passed until they run. Third-party helper scripts are not executed by Buatin.
