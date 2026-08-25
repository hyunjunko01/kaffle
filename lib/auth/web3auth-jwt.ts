import { createPublicKey } from "crypto";
import { importPKCS8, SignJWT } from "jose";
import { getWeb3AuthJwtConfig } from "@/lib/env";

async function privateKey() {
  const { privateKeyPem } = getWeb3AuthJwtConfig();
  return importPKCS8(privateKeyPem, "RS256");
}

export async function getJwks() {
  const { kid, privateKeyPem } = getWeb3AuthJwtConfig();
  const jwk = createPublicKey(privateKeyPem).export({ format: "jwk" });
  return {
    keys: [
      {
        kty: jwk.kty,
        n: jwk.n,
        e: jwk.e,
        kid,
        use: "sig",
        alg: "RS256",
      },
    ],
  };
}

export async function signWeb3AuthIdToken(kakaoId: string) {
  const { kid, issuer, audience } = getWeb3AuthJwtConfig();
  const key = await privateKey();

  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid, typ: "JWT" })
    .setSubject(kakaoId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}
