// Consultas reactivas de la UI: centralizan el wiring de liveQuery y el
// mapeo de error que cada ruta repetia a mano. Sin runes: cada
// consumidor conserva su $effect y la funcion de desuscripcion (ADR-0006).
import { liveQuery } from 'dexie';
import { obtenerPerfil } from './perfil';
import { obtenerEstadosBloqueados } from './estado';
import { mensajePara } from '$lib/errores/mensajes';
import type { Perfil, EstadoEjercicio } from '$lib/motor/schema';

export function suscribirPerfil(
	alRecibir: (perfil: Perfil | null) => void,
	alFallar: (mensaje: string) => void,
): () => void {
	const sub = liveQuery(() => obtenerPerfil()).subscribe({
		next: (v) => alRecibir(v ?? null),
		error: (e) => alFallar(mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ')),
	});
	return () => sub.unsubscribe();
}

export function suscribirBloqueados(
	alRecibir: (bloqueados: EstadoEjercicio[] | undefined) => void,
	alFallar: (mensaje: string) => void,
): () => void {
	const sub = liveQuery(() => obtenerEstadosBloqueados()).subscribe({
		next: (v) => alRecibir(v),
		error: (e) => alFallar(mensajePara((e as { code?: string }).code ?? 'ERR-DB-READ')),
	});
	return () => sub.unsubscribe();
}
