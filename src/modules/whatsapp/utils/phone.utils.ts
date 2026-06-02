// src/modules/whatsapp/utils/phone.utils.ts

/**
 * Normaliza número brasileiro pra formato E.164 sem o +
 * Regras:
 * - Remove tudo que não é número
 * - Garante DDI 55
 * - Celulares brasileiros com DDD: adiciona o 9 se necessário
 */
export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  // remove DDI se tiver
  const withoutCountryCode =
    digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  // número brasileiro com DDD (10 ou 11 dígitos sem DDI)
  if (withoutCountryCode.length === 10) {
    const ddd = withoutCountryCode.slice(0, 2);
    const number = withoutCountryCode.slice(2);

    // celular: começa com 6, 7, 8 ou 9 — adiciona o 9
    const isMobile = ["6", "7", "8", "9"].includes(number[0]);
    if (isMobile) {
      return `55${ddd}9${number}`;
    }
  }

  // já tem 11 dígitos sem DDI (já tem o 9) ou número fixo
  return `55${withoutCountryCode}`;
}
