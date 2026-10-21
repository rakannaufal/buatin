export function hasBinaryCharacters(value: string) {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 9 || (code >= 14 && code < 32)) return true;
  }
  return false;
}
