function parseAdminKakaoIds(value: string | undefined) {
  if (!value) {
    return new Set<string>();
  }

  return new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
}

export function isAdminKakaoId(kakaoId: string) {
  return parseAdminKakaoIds(process.env.ADMIN_KAKAO_IDS).has(kakaoId);
}
