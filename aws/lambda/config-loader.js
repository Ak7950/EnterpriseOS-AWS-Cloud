// Loads runtime secrets from AWS Systems Manager Parameter Store at cold start.
//
// Secrets (JWT_SECRET, DATABASE_URL, ...) are stored as SecureString parameters
// under SSM_PARAMETER_PATH, e.g. /enterpriseos/dev/JWT_SECRET. They are never
// placed in the CloudFormation template, Lambda environment variables, Git, or
// the frontend. Only allow-listed names are copied into process.env, and values
// already present in the environment are never overwritten.

export const ALLOWED_PARAMETERS = Object.freeze(['JWT_SECRET', 'DATABASE_URL', 'CORS_ORIGIN']);

async function defaultClientFactory() {
  // AWS SDK v3 is pre-installed in the Lambda Node.js runtime.
  const { SSMClient, GetParametersByPathCommand } = await import('@aws-sdk/client-ssm');
  const client = new SSMClient({});
  return input => client.send(new GetParametersByPathCommand(input));
}

export function normalisePath(path) {
  if (!/^\/[A-Za-z0-9_.\-/]+$/.test(path)) throw new Error('SSM_PARAMETER_PATH must be an absolute parameter path such as /enterpriseos/dev/');
  return path.endsWith('/') ? path : `${path}/`;
}

export async function loadParameters({ env = process.env, getParametersByPath } = {}) {
  const rawPath = env.SSM_PARAMETER_PATH?.trim();
  if (!rawPath) return { loaded: [], source: 'environment' };

  const path = normalisePath(rawPath);
  const fetchPage = getParametersByPath ?? await defaultClientFactory();
  const loaded = [];
  let NextToken;
  do {
    const page = await fetchPage({ Path: path, Recursive: false, WithDecryption: true, NextToken });
    for (const parameter of page.Parameters ?? []) {
      const key = parameter.Name.slice(path.length);
      if (!ALLOWED_PARAMETERS.includes(key)) continue;
      if (env[key]) continue;
      env[key] = parameter.Value;
      loaded.push(key);
    }
    NextToken = page.NextToken;
  } while (NextToken);

  // Names only - values are never logged.
  return { loaded, source: 'ssm' };
}
