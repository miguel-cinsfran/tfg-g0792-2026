// Frontera entre el deslizador de la UI (0..100) y los modulos de sonido
// ([0, 1]). Puras: no tocan DOM, no leen storage, no instancian Audio.

export function volumenAPorcentaje(v: number): number {
	if (!Number.isFinite(v)) return 0;
	return Math.round(clamp(v, 0, 1) * 100);
}

export function porcentajeAVolumen(p: number): number {
	if (!Number.isFinite(p)) return 0;
	return clamp(p, 0, 100) / 100;
}

// "50 por ciento" suena natural en espanol (no "50 %" ni "50/100").
export function formatoPorcentaje(p: number): string {
	const n = Math.round(clamp(p, 0, 100));
	return `${n} por ciento`;
}

function clamp(n: number, min: number, max: number): number {
	if (n < min) return min;
	if (n > max) return max;
	return n;
}
