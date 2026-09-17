Deploy this API as a Render **Web Service** using the Node runtime. Node 24.x runs the TypeScript source directly; `package.json` selects that version through `engines.node`. Remove any older `NODE_VERSION` override in Render, or set it to `24.x`, because that variable takes precedence over `package.json`. See [Render's Node version rules](https://render.com/docs/node-version).

For an existing service, update these values in its Render Dashboard settings, then redeploy the updated repository:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Root directory | Repository root |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check path | `/api/health` |

The server binds to `0.0.0.0` and uses Render's supplied `PORT`; leave that variable at its Render default. The build installs the committed lockfile's production dependencies. See [Render web service settings and port binding](https://render.com/docs/web-services).

Set these values in the service's **Environment** page:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | The intended deployment database URL, beginning with `postgres://` or `postgresql://` |
| `JWT_SECRET` | A secret random string of at least 32 characters |
| `APP_STAGE` | Optional; inferred from `NODE_ENV`. If already configured, set it to `production`. |

Keep credentials in Render's environment settings. Save the changes and deploy. See [Render environment variables](https://render.com/docs/configure-environment-variables).

For a new deployment, select **New > Blueprint**, connect the repository, review the resources from `render.yaml`, and deploy. The Blueprint uses the settings above, prompts for `DATABASE_URL`, and generates `JWT_SECRET`. It does not create a database. Adding `render.yaml` to a repository does not automatically update an existing manually configured service; update that service's Dashboard settings as described above. See [creating a Render Blueprint](https://render.com/docs/infrastructure-as-code) and [Blueprint secret configuration](https://render.com/docs/blueprint-spec).

A new, empty database needs the committed migration before database-backed routes can work. Deployment does not run migrations automatically. Review `migrations/0000_neat_morbius.sql`, then install the migration tooling in a local checkout using Node 24.x:

```sh
npm ci --include=dev
```

Explicitly set `NODE_ENV=production`, `APP_STAGE=production`, `DATABASE_URL`, and `JWT_SECRET` in that terminal's environment using the intended deployment values. Confirm the database host and name before proceeding. For Render Postgres, use its internal URL for a Render service in the same account and region; local migration commands need its external URL with `sslmode=require`. See [Render Postgres connections](https://render.com/docs/postgresql-creating-connecting).

Apply the reviewed migration:

```sh
npm run db:migrate
```

For an existing database, reconcile its schema and migration history before applying the initial migration. Do not run `npm test` or `npm run db:seed` against production: the existing test helpers and seed script delete application data.

To check deployment startup in a disposable local checkout, use Node 24.x and run:

```sh
npm ci --omit=dev
npm run test:deploy
```

These checks supply placeholder credentials and verify environment validation, server startup, `/api/health`, and rejection of unauthenticated requests. They do not connect to a database or verify migrations. Likewise, a successful `/api/health` response confirms HTTP availability only; verify database-backed behavior separately against a disposable database before release.
