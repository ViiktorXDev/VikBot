// utils/delay.ts
function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

// Pausa longa a cada N mensagens — simula comportamento humano
export async function smartDelay(index: number): Promise<void> {
  const isEvery10 = index > 0 && index % 10 === 0;
  const isEvery50 = index > 0 && index % 50 === 0;

  if (isEvery50) {
    // A cada 50 mensagens: pausa de 2-4 minutos
    await randomDelay(2 * 60_000, 4 * 60_000);
  } else if (isEvery10) {
    // A cada 10 mensagens: pausa de 30-60 segundos
    await randomDelay(30_000, 60_000);
  } else {
    // Entre cada mensagem: 10-25 segundos
    await randomDelay(10_000, 25_000);
  }
}
