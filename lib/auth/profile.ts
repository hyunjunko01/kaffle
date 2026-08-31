import { prisma } from "@/lib/db";

export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

export function validateNickname(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("invalid nickname");
  }

  const nickname = value.trim();
  const length = Array.from(nickname).length;

  if (
    length < NICKNAME_MIN_LENGTH ||
    length > NICKNAME_MAX_LENGTH ||
    !/^[\p{L}\p{N}_ -]+$/u.test(nickname)
  ) {
    throw new Error("invalid nickname");
  }

  return nickname;
}

export async function updateNickname(userId: string, nickname: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("user not found");
  }

  if (user.nickname === nickname) {
    return user;
  }

  if (user.postSignupNicknameChanged) {
    throw new Error("nickname change exhausted");
  }

  const result = await prisma.user.updateMany({
    where: { id: userId, postSignupNicknameChanged: false },
    data: {
      nickname,
      postSignupNicknameChanged: true,
    },
  });

  if (result.count === 0) {
    throw new Error("nickname change exhausted");
  }

  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}
