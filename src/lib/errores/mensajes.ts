// mensajesPara: traduce un codigo ERR-* a mensaje para el usuario.
// Fallback: incluye el code para que pueda reportarlo.

const mensajes: Record<string, string> = {
	'ERR-BOOT-CATALOGO':
		'No se pudo cargar el catálogo de ejercicios. Reinstala la aplicación.',
	'ERR-BOOT-DEXIE':
		'La base de datos local no responde. Cierra la aplicación y vuelve a abrirla.',
	'ERR-BOOT-CONSTANTES':
		'Error interno al cargar las reglas de entrenamiento. Reinstala la aplicación.',
	'ERR-DB-WRITE':
		'No se pudieron guardar los datos. Inténtalo de nuevo.',
	'ERR-DB-READ':
		'No se pudieron leer los datos. Inténtalo de nuevo.',
	'ERR-IMPORT-INVALID':
		'El archivo no tiene el formato esperado. Revísalo e inténtalo de nuevo.',
	'ERR-IMPORT-VERSION':
		'El archivo corresponde a una versión anterior de la aplicación. Genera una exportación nueva.',
	'ERR-IMPORT-NO-BACKUP':
		'El archivo no es una copia de seguridad de la aplicación. Elige el archivo que generaste desde Exportar mis datos.',
};

// Codigos de fallback que las rutas usan al traducir un error: la
// constante es la fuente unica, no el string repetido en cada ruta.
export const CODIGO_LECTURA_FALLIDA = 'ERR-DB-READ';
export const CODIGO_ESCRITURA_FALLIDA = 'ERR-DB-WRITE';

export function mensajePara(code: string): string {
	return mensajes[code] ?? `Se produjo un error inesperado. Código: ${code}`;
}
