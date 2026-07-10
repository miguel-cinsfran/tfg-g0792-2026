import type { Perfil } from '$lib/motor/schema';
import { popularCatalogo } from '$lib/catalogo/cargar';
import { obtenerPerfil } from '$lib/db/perfil';
import { db } from '$lib/db/db';
import { crearError } from '$lib/errores/crear';
import { marcar, medir } from '$lib/perf';

interface ResultadoBootstrap {
	perfil: Perfil | null;
}

let iniciada = false;
let perfilCache: Perfil | null = null;

export async function iniciarApp(): Promise<ResultadoBootstrap> {
	if (iniciada) {
		return { perfil: perfilCache };
	}
	const t0 = marcar();

	const data = import.meta.glob('/static/data/*.json', { eager: true }) as Record<
		string,
		{ default: unknown }
	>;
	const catalogoRaw = data['/static/data/catalogo.json']?.default;

	popularCatalogo(catalogoRaw);

	try {
		await db.perfil.count();
	} catch (e) {
		throw crearError('ERR-BOOT-DEXIE', 'No se pudo abrir la base de datos', e);
	}

	let resultado: Perfil | undefined;
	try {
		resultado = await obtenerPerfil();
	} catch (e) {
		throw crearError('ERR-BOOT-DEXIE', 'No se pudo leer el perfil', e);
	}

	// Sin perfil: null es la senal de "primera vez" para el caller.
	perfilCache = resultado ?? null;
	iniciada = true;
	medir('bootstrap', t0);
	return { perfil: perfilCache };
}
