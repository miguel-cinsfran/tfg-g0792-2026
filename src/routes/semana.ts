// Semana natural desde la primera sesion: la primera cuenta como
// "Semana 1" (no 0). Vive fuera del componente para poder testearla
// sin montar Svelte y para que el `ahora` sea un argumento explicito
// (regla del proyecto: no Date.now() en logica testeable).
export function numeroSemana(primeraSesionMs: number, ahora: number): number {
	return Math.floor((ahora - primeraSesionMs) / (7 * 86_400_000)) + 1;
}
