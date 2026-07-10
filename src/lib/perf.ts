// Medicion de latencia RNF09. Gated por import.meta.env.DEV: en build
// de produccion Vite reemplaza el flag por false y el minificador
// elimina los cuerpos como dead code.

export function marcar(): number {
	if (!import.meta.env.DEV) return 0;
	return performance.now();
}

export function medir(etiqueta: string, t0: number): void {
	if (!import.meta.env.DEV) return;
	const delta = performance.now() - t0;
	const flag = delta > 300 ? ' [SUPERA RNF09]' : '';
	console.log(`[perf] ${etiqueta}: ${delta.toFixed(1)}ms${flag}`);
}
