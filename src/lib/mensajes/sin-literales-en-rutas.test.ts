import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const RAIZ = 'src/routes';

// Lista de exclusion explicita. Sale de la lista cuando su tanda de
// migracion correspondiente mueve sus literales al modulo de mensajes.
const EXCLUIDOS = new Set<string>([
	// Las doce rutas de configuracion y perfil migraron su copy y
	// salieron de la lista. La portada y la lista de ejercicios tambien.
	// Sesion: la maquina de fases tiene 24 literales repartidos entre
	// anuncios y ternarios; su migracion merece su propia tanda
	// (mover el anuncio de "Hoy no hay ejercicios para algunos
	// patrones" exige revisar el momento del anuncio, y el ternario
	// de CIERRE/REANUDAR/EJERCICIO exige revisar la maquina pura).
	// turno de: <encargo-sesion>.
	'sesion/+page.svelte',
	// Onboarding: tanda pendiente (entrada y subpasos).
	'onboarding/+page.svelte',
	'onboarding/datos/+page.svelte',
	'onboarding/disponibilidad/+page.svelte',
	'onboarding/equipamiento/+page.svelte',
	'onboarding/objetivo/+page.svelte',
	'onboarding/dolor-preexistente/+page.svelte',
	// Disclaimer: una violacion ('error-disclaimer') dentro de un
	// ternario. La exclusion de onboarding lo cubre cuando la tanda
	// del bloque se ejecute; se lista aparte para que el lector del
	// invariante vea que esta pendiente.
	// turno de: <encargo-onboarding-disclaimer>.
	'onboarding/disclaimer/+page.svelte',
	'onboarding/evaluacion/pull/+page.svelte',
	'onboarding/evaluacion/legs/+page.svelte',
	'onboarding/evaluacion/push/+page.svelte',
	'onboarding/evaluacion/core/+page.svelte',
	'onboarding/resumen/+page.svelte',
	// Detalle de ejercicio: tanda pendiente.
	'biblioteca/[id]/+page.svelte',
]);

function* enlistar(raiz: string): Generator<string> {
	for (const entrada of readdirSync(raiz)) {
		const rutaCompleta = join(raiz, entrada);
		if (statSync(rutaCompleta).isDirectory()) {
			yield* enlistar(rutaCompleta);
		} else if (entrada === '+page.svelte') {
			yield rutaCompleta;
		}
	}
}

// Antes: limpiar() borraba el bloque <script> y todo lo que iba entre
// llaves. Las dos suposiciones que justificaban el borrado eran falsas:
// los anuncios al lector son el texto que la persona escucha, y un
// ternario con cadenas literales es un literal puro. Ahora limpiar()
// conserva ambos; el escaneo del script y de las llaves lo hacen las
// regexes de la prueba. Lo que sigue igual: comentarios HTML
// (decorativos) y contenido aria-hidden (decorativo para el lector).
function limpiar(src: string): string {
	src = src.replace(/<!--[\s\S]*?-->/g, '');
	src = src.replace(/<(\w+)[^>]*aria-hidden[^>]*>[\s\S]*?<\/\1>/g, '<$1></$1>');
	return src;
}

const RE_LITERAL = />\s*([A-Za-zÁÉÍÓÚáéíóú¿¡][^<>{}]{6,})</g;

// Cifras, espacios y simbolos comunes sin mas letras: no es una
// frase, es un dato. La primera letra la exige el regex.
const RE_EXENTO = /^[\d\s.,:/°%+\-×]*$/;

// Cadenas literales dentro de llaves en la plantilla: comilla simple,
// doble o backtick. Se exige primera letra letra y longitud >= 6.
const RE_CADENA = /['"`]([A-Za-zÁÉÍÓÚáéíóú¿¡][^'"`\n]{5,})['"`]/g;

// Encuentra el contenido de las llaves (no anidadas). Los Svelte
// snippets y las directivas {#if X}, {#each X} no entran: la regex
// del parser distingue esos casos. Esta solo mira expresiones.
const RE_LLAVES = /\{([^{}]*)\}/g;

// Cadenas literales dentro de <script> pasadas a funciones que llevan
// texto al usuario o al lector. Solo se captura la cadena del primer
// argumento que sea literal.
const FUNCIONES_ANUNCIO = [
	'anunciarPolite',
	'anunciarAssertive',
	'avisar',
	'mensajePara',
];
// En el regex, \x60 representa el backtick (escapa el caracter para
// no cerrar el template literal del new RegExp).
const RE_FUNCIONES_ANUNCIO = new RegExp(
	`\\b(${FUNCIONES_ANUNCIO.join('|')})\\s*\\(\\s*(['"\\x60])([A-Za-zÁÉÍÓÚáéíóú¿¡][^'"\\x60\\n]{5,})\\2`,
	'g'
);

function esCadenaLiteralViolable(texto: string): boolean {
	if (!/^[A-Za-zÁÉÍÓÚáéíóú¿¡]/.test(texto)) return false;
	if (RE_EXENTO.test(texto)) return false;
	return texto.length >= 6;
}

// Atributos que llevan texto que el usuario ve o que el lector de
// pantalla pronuncia. Se separan en dos listas: los que matchean por
// nombre EXACTO (el nombre debe estar completo, sin sufijos) y los
// que matchean por INICIO de nombre (prefijo). Solo `etiqueta` lleva
// prefijo, porque la app tiene `etiquetaGrupo`, `etiquetaMenos` y
// `etiquetaMas` como compuestos por camelCase. Los `aria-*` son
// exactos: si fueran prefijos, `aria-label` matchearia
// `aria-labelledby` (cuyo valor es un id tecnico, no texto al
// usuario).
const ATRIBUTOS_CON_TEXTO_EXACTO = [
	'titulo',
	'subtitulo',
	'etiquetaBoton',
	'leyenda',
	'descripcion',
	'mensaje',
	'placeholder',
	'title',
	'alt',
	'aria-label',
	'aria-roledescription',
	'aria-placeholder',
];

const ATRIBUTOS_CON_TEXTO_PREFIJO = ['etiqueta'];

const RE_ATRIBUTO_EXACTO = new RegExp(
	`(?<![\\w-])(${ATRIBUTOS_CON_TEXTO_EXACTO.join('|')})="([^"]{6,})"`,
	'g'
);
const RE_ATRIBUTO_PREFIJO = new RegExp(
	`(?<![\\w-])(${ATRIBUTOS_CON_TEXTO_PREFIJO.join('|')})\\w*="([^"]{6,})"`,
	'g'
);

describe('invariante: sin literales visibles en rutas', () => {
	it('no hay texto visible escrito a mano en src/routes/**/+page.svelte', () => {
		const violaciones: { archivo: string; texto: string; origen: string }[] = [];
		for (const archivo of enlistar(RAIZ)) {
			const relativa = archivo.slice(RAIZ.length + 1);
			if (EXCLUIDOS.has(relativa)) continue;
			const limpio = limpiar(readFileSync(archivo, 'utf8'));
			const bloquesScript = [...limpio.matchAll(/<script\b[\s\S]*?<\/script>/g)].map((m) => m[0]);
			const plantilla = bloquesScript.reduce(
				(acc, bloque) => acc.replace(bloque, ''),
				limpio
			);

			// Texto entre tags.
			for (const match of limpio.matchAll(RE_LITERAL)) {
				const texto = match[1];
				if (!RE_EXENTO.test(texto.slice(1))) {
					violaciones.push({ archivo: relativa, texto, origen: 'tag' });
				}
			}

			// Cadenas literales dentro de llaves en la plantilla.
			for (const match of plantilla.matchAll(RE_LLAVES)) {
				const contenido = match[1];
				for (const cadenaMatch of contenido.matchAll(RE_CADENA)) {
					const texto = cadenaMatch[1];
					if (esCadenaLiteralViolable(texto)) {
						violaciones.push({ archivo: relativa, texto, origen: 'llaves' });
					}
				}
			}

			// Cadenas literales en <script> pasadas a funciones de anuncio.
			// Los comentarios // y /* */ se quitan antes: una cadena
			// dentro de un comentario no es codigo.
			for (const bloque of bloquesScript) {
				const sinComentarios = bloque
					.replace(/\/\*[\s\S]*?\*\//g, '')
					.replace(/\/\/[^\n]*/g, '');
				for (const match of sinComentarios.matchAll(RE_FUNCIONES_ANUNCIO)) {
					const texto = match[3];
					if (esCadenaLiteralViolable(texto)) {
						violaciones.push({
							archivo: relativa,
							texto,
							origen: `script:${match[1]}`,
						});
					}
				}
			}
		}
		expect(violaciones).toEqual([]);
	});

	it('no hay texto visible escrito a mano en atributos de rutas', () => {
		const violaciones: { archivo: string; atributo: string; texto: string }[] = [];
		for (const archivo of enlistar(RAIZ)) {
			const relativa = archivo.slice(RAIZ.length + 1);
			if (EXCLUIDOS.has(relativa)) continue;
			const limpio = limpiar(readFileSync(archivo, 'utf8'));
			for (const match of limpio.matchAll(RE_ATRIBUTO_EXACTO)) {
				const texto = match[2];
				if (RE_EXENTO.test(texto)) continue;
				violaciones.push({ archivo: relativa, atributo: match[1], texto });
			}
			for (const match of limpio.matchAll(RE_ATRIBUTO_PREFIJO)) {
				const texto = match[2];
				if (RE_EXENTO.test(texto)) continue;
				violaciones.push({ archivo: relativa, atributo: match[1], texto });
			}
		}
		expect(violaciones).toEqual([]);
	});
});
