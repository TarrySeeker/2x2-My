// Characters without ambiguous glyphs (0/O, 1/I)
export const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}
