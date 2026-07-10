// Seleccion determinista: ordena ascendente por fecha_ultimo_uso (sin
// estado o con fecha null cuenta como mas antiguo), desempate por id.
// Toda eleccion del motor pasa por aca.

import type { Ejercicio, EstadoEjercicio } from './schema.js';

// Los estados llegan aparte porque fecha_ultimo_uso vive en EstadoEjercicio,
// no en Ejercicio (catalogo inmutable). Sin entrada -> nunca usado.
export function ordenarParaSeleccion(
	candidatos: Ejercicio[],
	estados: EstadoEjercicio[],
): Ejercicio[] {
	const fechaPorId = new Map(estados.map((e) => [e.ejercicio_id, e.fecha_ultimo_uso]));
	return [...candidatos].sort((a, b) => {
		const fechaA = fechaPorId.get(a.id) ?? null;
		const fechaB = fechaPorId.get(b.id) ?? null;
		if (fechaA !== fechaB) {
			if (fechaA === null) return -1;
			if (fechaB === null) return 1;
			return fechaA - fechaB;
		}
		return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
	});
}
