export function generateKeyCode(): string {
  const segment = () =>
    Math.random().toString(36).substring(2, 5).toUpperCase();

  return `${segment()}-${segment()}-${segment()}`; // "ABC-123-XYZ"
}
