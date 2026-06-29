# Changelog

## [0.1.1](https://github.com/QNSC-VN/rally-api/compare/rally-apiv0.1.0...rally-apiv0.1.1) (2026-06-29)


### ✨ Features

* **auth:** enterprise per-tenant SSO connection registry ([851150d](https://github.com/QNSC-VN/rally-api/commit/851150d7053ac54ac37ba31eeae6e3a12e98d3d0))
* **auth:** enterprise SSO refresh — authMethod in JWT + ssoProvider on sessions ([f80c466](https://github.com/QNSC-VN/rally-api/commit/f80c46690dd1ae6865679a835e5ea25fb5bd0d33))
* **auth:** global-identity phase 3 — POST /auth/switch-tenant ([e348218](https://github.com/QNSC-VN/rally-api/commit/e3482184144f3145047c298108f11c50deea1558))
* **auth:** include memberships in GET /auth/me and PATCH /auth/me responses ([3e586fd](https://github.com/QNSC-VN/rally-api/commit/3e586fd7a17ce2247d25073e722c7f5e7eb0e9a4))
* **auth:** Phase 0 super admin setup — break-glass alert + platform admin auto-grant ([342a261](https://github.com/QNSC-VN/rally-api/commit/342a261162599d7201d523dd913b5d7cec8e49b5))
* **auth:** remember me — session TTL 24h vs 30d based on user choice ([8aa4e3f](https://github.com/QNSC-VN/rally-api/commit/8aa4e3f053410f613ae47634d27550cea4861bb4))
* **auth:** self-serve signup with domain-aware tenant provisioning ([b15b72a](https://github.com/QNSC-VN/rally-api/commit/b15b72ad600c66286fa7c7279b7717ce1ceede68))
* **identity:** enterprise SSO with Entra ID, Phase 0+1 completion ([60cd2eb](https://github.com/QNSC-VN/rally-api/commit/60cd2eba987d2cbf2572203d51467ec0dc94e4f5))
* **identity:** implement auth vertical slice (login/refresh/logout/me) ([f2a972f](https://github.com/QNSC-VN/rally-api/commit/f2a972feb1e48170a0a4d9147681499d8abfbaef))
* labels, backlog reorder, password change, sprint move-unfinished ([202e5d7](https://github.com/QNSC-VN/rally-api/commit/202e5d7c5b98a55c5ae006d0357eee6a3c5010aa))
* **notifications:** notification preferences with per-type channel opt-out ([dedd70c](https://github.com/QNSC-VN/rally-api/commit/dedd70c9a5241e683af361d1c1424d392015f325))
* **observability:** enterprise OTEL hardening ([e4ed286](https://github.com/QNSC-VN/rally-api/commit/e4ed286ebca54e0d366dc64bccd5bf363de87b07))
* **openapi:** complete swagger documentation for all endpoints ([91b4323](https://github.com/QNSC-VN/rally-api/commit/91b432360c96f7ef6215363c90bf48f47a48729a))
* **phase-0:** complete Phase 0 implementation ([1d4f6a9](https://github.com/QNSC-VN/rally-api/commit/1d4f6a9f25ee884a8b722302edc1cbe439ab8344))
* **phase0:** complete all remaining Phase 0 SRS features ([f377da5](https://github.com/QNSC-VN/rally-api/commit/f377da57c564e4e14eeeda0d6f9e5d56445e08ae))
* **planning,releases,access:** implement planning, releases, and access modules ([c2a8b61](https://github.com/QNSC-VN/rally-api/commit/c2a8b61912ac56eb3229b23011394dcc3750a3f5))
* **platform:** add @Span() OTel decorator and ResilienceService ([b0a24f2](https://github.com/QNSC-VN/rally-api/commit/b0a24f222479e9a41734abb4906931f7967d90da))
* **platform:** adopt patterns from fin/brandmate codebase review ([5988093](https://github.com/QNSC-VN/rally-api/commit/598809362d88b2ebc8557f86c45dfc1074263142))
* **platform:** global rate-limiting guard backed by Valkey sliding window ([03aed28](https://github.com/QNSC-VN/rally-api/commit/03aed282d9636b91044b66dcaf9322dd4f141fa6))
* **platform:** RLS policies + EmailService ([1678cd1](https://github.com/QNSC-VN/rally-api/commit/1678cd1f936caed084cb4637a389eddb130c7c0d))
* **projects:** implement projects vertical slice ([f76d920](https://github.com/QNSC-VN/rally-api/commit/f76d92026116fe2b12a1d95b18420216c19b8dc0))
* **projects:** memberCount/leadName in list response; archive read-only enforcement ([e21b82d](https://github.com/QNSC-VN/rally-api/commit/e21b82dbf54dcb1b9192d5235c654f0aa5107865))
* scaffold rally-api NestJS modular monolith ([1592d05](https://github.com/QNSC-VN/rally-api/commit/1592d0533bd66f914b005f701298c3abb2091483))
* **seed:** auto-seed on every develop deploy via SEED_ON_DEPLOY flag ([a98af65](https://github.com/QNSC-VN/rally-api/commit/a98af65d756254d07b5878157a3c50e0429df6f0))
* **tenancy:** add listMembersWithProfile endpoint for user management UI ([376525b](https://github.com/QNSC-VN/rally-api/commit/376525b03fa68bd2c28c6d04c11885d083238645))
* **tenancy:** add tenant_members keycard table (phase 1, additive) ([1bf17d5](https://github.com/QNSC-VN/rally-api/commit/1bf17d5cb84a9b196516d4798161b7c91f8fde14))
* **tenancy:** enterprise permission hardening + role in memberships ([044b629](https://github.com/QNSC-VN/rally-api/commit/044b62935562621bec3f9663c0cfdad32e88f7d0))
* **tenancy:** global-identity phase 2 — tenant_members rewires login/invite/rls ([6b7ede3](https://github.com/QNSC-VN/rally-api/commit/6b7ede378732d94e16c641db988c2fe6bf330326))
* **tenancy:** global-identity phase 4 — drop users.tenant_id ([171de7a](https://github.com/QNSC-VN/rally-api/commit/171de7aee8a8579a11b89a5a330c3a931d45f2e2))
* **tenancy:** implement tenancy vertical slice (tenant/workspace/members) ([c93a177](https://github.com/QNSC-VN/rally-api/commit/c93a177738fa2e308857c909a25935ece9240b95))
* **work-items:** implement work-items vertical slice ([f6e17fa](https://github.com/QNSC-VN/rally-api/commit/f6e17fabc9f62aee2558bdd08c6925265785d6ef))
* **work-items:** resolve actor display name in revision history via LEFT JOIN users ([59fd542](https://github.com/QNSC-VN/rally-api/commit/59fd542c04b8391d6ee86149caf9a279c90c9d5e))
* **worker:** implement outbox relay, SQS consumers, and daily snapshot cron ([91c6294](https://github.com/QNSC-VN/rally-api/commit/91c6294910ac5f1e0e1e383aaa8216cba46df909))
* **workflow,collaboration,notifications,audit,reporting:** implement remaining modules ([3a1592b](https://github.com/QNSC-VN/rally-api/commit/3a1592bb40dd1d956ff9d2db6a1bff94d7e8ef87))


### 🐛 Bug Fixes

* **access:** remove work_item:edit:own from project_member role ([76473b8](https://github.com/QNSC-VN/rally-api/commit/76473b8e5fbea3b0601c29abd37e14b210f7ff75))
* add missing error codes ASSIGNEE_NOT_WORKSPACE_MEMBER and WORK_ITEM_PARENT_SCOPE_MISMATCH ([186c46d](https://github.com/QNSC-VN/rally-api/commit/186c46dadd04fdcf382a5c64b7a8cc1949dc6ce0))
* allow traceparent/tracestate/baggage CORS headers for W3C trace context ([a6c62b5](https://github.com/QNSC-VN/rally-api/commit/a6c62b538e15324a389fe9d21fa69e32b6f8d250))
* **auth:** auto-assign default role to JIT-provisioned SSO users ([fd747e0](https://github.com/QNSC-VN/rally-api/commit/fd747e046f984bfe19096521bf178faff8227461))
* **auth:** change JIT-provision default role to project_admin ([1fb2d02](https://github.com/QNSC-VN/rally-api/commit/1fb2d0210f406741757ab7f1ae759982425cf918))
* **auth:** revert JIT default role to project_member ([8d75912](https://github.com/QNSC-VN/rally-api/commit/8d75912f58de263ac47133f2de17aacbf744c4e5))
* **auth:** skip domain claim when domain already registered by another tenant ([7c1631f](https://github.com/QNSC-VN/rally-api/commit/7c1631f3c0250faca042f4c13c6d6f371ead4caa))
* **bootstrap:** graceful shutdown, compression, improved logger ([4ee65e6](https://github.com/QNSC-VN/rally-api/commit/4ee65e61d2d842d6726810aaaef0ee0d3c471931))
* **ci:** bump qnsc-gitops to v1.0.2 (fix SLSA attest subject-digest) ([632781c](https://github.com/QNSC-VN/rally-api/commit/632781cf4957f686bf9937ff14e28d5b56f01289))
* **ci:** bump qnsc-gitops to v1.0.3 (fix ecs-run-task network-config JSON) ([5b93079](https://github.com/QNSC-VN/rally-api/commit/5b93079edd702169cc9c8b914678d0ba773f232c))
* **ci:** bump qnsc-gitops to v1.0.4 (fix run-db-migration internal ref) ([deda6aa](https://github.com/QNSC-VN/rally-api/commit/deda6aae2c9eb94fad65fbb6bb8e47ca5ab1caf2))
* correct GitHub org in dependabot (nghiavt1802 → QNSC-VN) ([a387370](https://github.com/QNSC-VN/rally-api/commit/a387370a191a34fcfae382403ac512724a1327e1))
* **docker:** set HUSKY=0 for prod-deps stage to skip prepare script ([19f2936](https://github.com/QNSC-VN/rally-api/commit/19f2936de420b84c568f6ddda30a2d537effcab9))
* **docker:** set HUSKY=0 in deps stage too ([779bb7e](https://github.com/QNSC-VN/rally-api/commit/779bb7e5d737ac23535a77092939265a64556adc))
* **docker:** use --ignore-scripts for prod install (husky binary absent in --prod mode) ([d38a3ba](https://github.com/QNSC-VN/rally-api/commit/d38a3ba93e7ef416efa01f369ca3d4c6eafa71b2))
* harden logging defaults and bootstrap migrations ([03d4240](https://github.com/QNSC-VN/rally-api/commit/03d42403ab8d1c2eee22b004ba615fe1af0886c4))
* **jwt:** return factory as any to bypass EdDSA type gap in @types/jsonwebtoken ([95f2a9d](https://github.com/QNSC-VN/rally-api/commit/95f2a9d5d2e9ef86e3cd361a83da970f8906e80a))
* **jwt:** suppress @types/jsonwebtoken EdDSA gap with ts-expect-error; remove unused import ([8d4d2ad](https://github.com/QNSC-VN/rally-api/commit/8d4d2add67fe1f21ef9a294021b6de541a94a5a9))
* **jwt:** use EdDSA algorithm for Ed25519 keys (was ES256 causing Unknown key type error) ([7ab1209](https://github.com/QNSC-VN/rally-api/commit/7ab12099155fb1dfaf7df400c9da2e85bf56b07a))
* **jwt:** use ts-ignore for EdDSA; ts-expect-error unused in Docker tsconfig ([6a71cde](https://github.com/QNSC-VN/rally-api/commit/6a71cdeec0019156d055157a58cb1d6686711a6a))
* load .env in db:migrate/db:seed scripts, bump Node to 24 LTS ([94e43cd](https://github.com/QNSC-VN/rally-api/commit/94e43cd6824154297fc3621c94e1071a2df0bb78))
* local dev startup — RLS migration, path aliases, JWT base64, missing deps ([cf0d2ff](https://github.com/QNSC-VN/rally-api/commit/cf0d2ff8fd89c42c0dfcd26b19c1bee7f4ae5ae6))
* **notifications:** relay correctness + performance improvements ([28d2ed8](https://github.com/QNSC-VN/rally-api/commit/28d2ed84a0bc497feb27ef75fcc2b77ac6c06151))
* **otel:** ignore correct health endpoint /v1/healthz in span filter ([3e0305c](https://github.com/QNSC-VN/rally-api/commit/3e0305c3278bcc1fec12bc727af872da2803b6ca))
* **platform:** add sub to user type in idempotency interceptor ([6f39271](https://github.com/QNSC-VN/rally-api/commit/6f392713b89d36ac9c9ba6a27a9e04de665d98ff))
* **projects:** PRJ-FR-002/003 owner auto-assign and project_members insert ([378d1ae](https://github.com/QNSC-VN/rally-api/commit/378d1ae30703d8ba99899f9c31dc3eb8ed849cfc))
* **rate-limit:** handle Valkey unavailability gracefully in rate limiting ([3484173](https://github.com/QNSC-VN/rally-api/commit/348417330b158c616bed179c41d15fa60ec8134a))
* rename qncs → qnsc across all resource names ([da2b64c](https://github.com/QNSC-VN/rally-api/commit/da2b64cb3c9802bb7e808718540fd9e43797d878))
* resolve TypeScript errors from initial scaffold ([280228e](https://github.com/QNSC-VN/rally-api/commit/280228e4c77a26bba087ed9b82264ab524a40df3))
* **seed:** inline DEFAULT_WORKFLOW_STATUSES to remove libs/ dependency ([2890f79](https://github.com/QNSC-VN/rally-api/commit/2890f790fe7cf03dfbfc51aae8a0937554a3eea4))
* **seed:** real business flow — project + counter + member + workflow statuses ([d232f9d](https://github.com/QNSC-VN/rally-api/commit/d232f9d30eab95a9b81e19a3a2cefcb96a796a87))
* **seed:** remove tenantId from users inserts, add tenantMembers rows ([b0ecb44](https://github.com/QNSC-VN/rally-api/commit/b0ecb44331f461d39aa3d46d82a0de56f7b0937f))
* set refresh-token cookie path to /v1/auth/refresh ([dc6fda2](https://github.com/QNSC-VN/rally-api/commit/dc6fda2a5829efa544cebbd207bb5794cea39794))
* switch JWT algorithm from EdDSA to ES256 ([21e662b](https://github.com/QNSC-VN/rally-api/commit/21e662b603237041537c060b582bd1c74b547d1d))
* **tests:** add missing mock providers to auth and tenancy specs ([1fc8c17](https://github.com/QNSC-VN/rally-api/commit/1fc8c17ca67352d5e2f7dd53c31d195c17927cc8))
* use named wildcard route *path, remove obsolete docker-compose version key ([622dba4](https://github.com/QNSC-VN/rally-api/commit/622dba4ff836e6106f293721820c5a30e40c9199))
* **worker:** deduplication, idempotency, concurrency guards, graceful shutdown, DLQ ([68928ac](https://github.com/QNSC-VN/rally-api/commit/68928ac5bee79b5fc9ee1d8971fd0a76498e14c4))
* **worker:** use createApplicationContext instead of create ([b5956bc](https://github.com/QNSC-VN/rally-api/commit/b5956bc2241857f42ec466f71fdebe873742e7d5))


### ♻️ Refactors

* consolidate cursor pagination into [@platform](https://github.com/platform) ([bd85e26](https://github.com/QNSC-VN/rally-api/commit/bd85e267839b7c1eec214da3762bc13259ad1a96))
* DRY — centralise enums, domain types, and project constants ([aca7f26](https://github.com/QNSC-VN/rally-api/commit/aca7f268b1bf1159d34843149fa82e711a1d0aa4))
* tech-lead review fixes — security, patterns, enterprise hardening ([57d27d4](https://github.com/QNSC-VN/rally-api/commit/57d27d427ce313463f912cec79ccded2c31e9453))


### 🔒 Security

* enterprise hardening — RBAC, CSRF, rate limiting, multi-tenancy ([a29cb29](https://github.com/QNSC-VN/rally-api/commit/a29cb2969371dcf539ad38d294498e8a3cb15de1))

## Changelog

All notable changes to Rally API are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- Release Please updates this file automatically on every release. -->
<!-- Do not edit the sections below manually. -->
