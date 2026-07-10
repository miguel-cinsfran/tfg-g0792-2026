// Utilidades de regiones aria-live. Las regiones globales van pre-renderizadas
// en +layout.svelte.

const YIELD_MS = 50;
// El mensaje se borra un rato despues: si queda en el DOM, TalkBack lo
// encuentra al explorar por tacto arriba del contenido y engorda el arbol
// de accesibilidad que el WebView reprocesa en cada gesto.
const LIMPIEZA_MS = 10_000;

const timers = new Map<string, ReturnType<typeof setTimeout>[]>();

function anunciar(id: string, msg: string): void {
	const region = document.getElementById(id);
	if (!region) return;
	for (const t of timers.get(id) ?? []) clearTimeout(t);
	region.textContent = '';
	const escritura = setTimeout(() => {
		region.textContent = msg;
	}, YIELD_MS);
	const limpieza = setTimeout(() => {
		region.textContent = '';
	}, YIELD_MS + LIMPIEZA_MS);
	timers.set(id, [escritura, limpieza]);
}

/** Anuncia un mensaje en la region aria-live polite. */
export function anunciarPolite(msg: string): void {
	anunciar('live-polite', msg);
}

/** Anuncia un mensaje en la region aria-live assertive (role=alert). */
export function anunciarAssertive(msg: string): void {
	anunciar('live-assertive', msg);
}