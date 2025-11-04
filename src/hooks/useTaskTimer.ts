export function useTaskTimer() {
  return {
    tempoGasto: 0,
    estaRodando: false,
    iniciarTimer: () => {},
    pausarTimer: () => {},
    resetarTimer: () => {},
  };
}
