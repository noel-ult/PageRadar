# PageRadar: verification and operations

Reviewed against [default-branch commit aff652d9bb4c](https://github.com/noel-ult/PageRadar/commit/aff652d9bb4c08a1d86fa79afe43e17c34df3800) on 2026-10-28. Start with the [developer guide](PROJECT_GUIDE.md) for installation and architecture, and the [source reference](REFERENCE.md) for exact scripts, configuration readers, routes, and source locations.

## Monitoring lifecycle

Use isolated PostgreSQL/Redis and fixture targets to verify signup, watch baseline, a changed page, a failed check retaining baseline, and consent-aware notification delivery. Run the declared API/GraphQL checks.

These are acceptance scenarios for a maintainer to run in the documented environment. Their inclusion is not a claim that live integrations or production credentials were tested during this documentation update.

## Deployment and failure diagnosis

Deploy API, scheduler, and worker roles with durable state. A responding frontend does not run monitoring jobs. Use isolated restored services when checking backup recovery.

## Maintaining the contract

When behavior changes, update the guide and examples in the same PR. Check the entry point and working directory before copying commands. Use the linked source readers to distinguish build-time configuration from process environment. For failures, capture the first application error, runtime version, selected mode, and redacted configuration names before later proxy or port errors.

Keep changes tied to evidence: a declared command is not proof it passes, a process health response is not a successful end-to-end workflow, and a historical report describes its own revision. Record actual check results and any unavailable external services in the PR.
