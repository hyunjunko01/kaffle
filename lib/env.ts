function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function getSessionSecret() {
  return required("SESSION_SECRET");
}

export function getKakaoConfig() {
  return {
    restApiKey: required("KAKAO_REST_API_KEY"),
    clientSecret: process.env.KAKAO_CLIENT_SECRET ?? "",
    redirectUri:
      process.env.KAKAO_REDIRECT_URI ?? `${getAppUrl()}/auth/kakao/callback`,
  };
}

export function getWeb3AuthJwtConfig() {
  return {
    privateKeyPem: required("WEB3AUTH_JWT_PRIVATE_KEY").replace(/\\n/g, "\n"),
    kid: process.env.WEB3AUTH_JWT_KID ?? "kaffle-1",
    issuer: process.env.WEB3AUTH_JWT_ISSUER ?? getAppUrl(),
    audience: process.env.WEB3AUTH_JWT_AUDIENCE ?? "kaffle",
  };
}
