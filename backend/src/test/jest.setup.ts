const setEnvDefault = (key: string, value: string) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
};

setEnvDefault('NODE_ENV', 'test');
setEnvDefault('DATABASE_URL', 'postgresql://user:pass@localhost:5432/testdb');
setEnvDefault('JWT_SECRET', 'test-secret-please-change-000000000000');
setEnvDefault('JWT_EXPIRES_IN', '12h');
setEnvDefault('CORS_ORIGIN', 'http://localhost:5173');
setEnvDefault('COOKIE_SECURE', 'false');
