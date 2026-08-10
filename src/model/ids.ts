/** 로컬 전용 id. 서버가 없으니 충돌 걱정 없이 시간+난수로 충분하다. */
export const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
