import { defineRailway, project, service, github, volume, preserve } from 'railway/iac';

// Run railway config pull/plan against the existing project before applying.
// Secrets use preserve(); they must already exist in Railway.
export default defineRailway(() => {
  const home = volume('agy-home');
  const workspace = service('workspace', {
    source: github('xtenrore/studious-disco', { branch: 'main' }),
    healthcheck: '/health',
    replicas: 1,
    build: { builder: 'DOCKERFILE', dockerfilePath: 'docker/workspace.Dockerfile' },
    deploy: { sleepApplication: false, restartPolicyType: 'ON_FAILURE', restartPolicyMaxRetries: 3 },
    volumeMounts: { '/home/agy': home },
    env: { PORT: '3001', NODE_ENV: 'production', WORKSPACE_TOKEN: preserve(), BROWSERBASE_API_KEY: '${{shared.BROWSERBASE_API_KEY}}' },
  });
  const web = service('web', {
    source: github('xtenrore/studious-disco', { branch: 'main' }),
    healthcheck: '/health',
    replicas: 1,
    build: { builder: 'DOCKERFILE', dockerfilePath: 'docker/web.Dockerfile' },
    deploy: { sleepApplication: false, restartPolicyType: 'ON_FAILURE', restartPolicyMaxRetries: 3 },
    env: {
      PORT: '3000', NODE_ENV: 'production',
      WORKSPACE_URL: 'http://workspace.railway.internal:3001',
      APP_ORIGIN: preserve(), SESSION_SECRET: preserve(), PASSWORD_HASH: preserve(), WORKSPACE_TOKEN: preserve(),
    },
  });
  return project('studious-disco', { resources: [web, workspace, home] });
});
