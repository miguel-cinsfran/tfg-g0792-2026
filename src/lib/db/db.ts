// Singleton Dexie para las tablas del MVP.
import Dexie from 'dexie';
import type { SchemaDB, SesionEnCurso } from '$lib/motor/schema';

// Respaldo de la sesion en curso: Android mata el WebView en background
// y la sesion vive solo en memoria. Un solo registro con id = 1. La
// fuente de verdad sigue siendo el store en memoria; esto es solo el
// respaldo para reanudar.
export interface SesionEnCursoGuardada {
	id: number;
	sesion: SesionEnCurso;
	guardada_en: number;
}

export class CalisteniaDB extends Dexie {
	perfil!: Dexie.Table<SchemaDB['perfil'], number>;
	estado_ejercicios!: Dexie.Table<SchemaDB['estado_ejercicios'], string>;
	sesiones!: Dexie.Table<SchemaDB['sesiones'], string>;
	historial_dolor!: Dexie.Table<SchemaDB['historial_dolor'], string>;
	sesion_en_curso!: Dexie.Table<SesionEnCursoGuardada, number>;

	constructor() {
		super('calistenia');
		this.version(1).stores({
			perfil: 'id',
			estado_ejercicios: 'ejercicio_id, bloqueado',
			sesiones: 'id, fecha',
			historial_dolor: 'id, ejercicio_id, fecha',
		});
		this.version(2).stores({
			sesion_en_curso: 'id',
		});
	}
}

export const db = new CalisteniaDB();

export function generarId(): string {
	return crypto.randomUUID();
}