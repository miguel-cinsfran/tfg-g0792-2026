import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const RAIZ_RUTAS = 'src/routes';
const RAIZ_COMPONENTES = 'src/lib/components';

// Lista de exclusion explicita, vacia: todas las rutas toman su texto
// del modulo de mensajes.
const EXCLUIDOS = new Set<string>([]);

function* enlistarRutas(raiz: string): Generator<string> {
	for (const entrada of readdirSync(raiz)) {
		const rutaCompleta = join(raiz, entrada);
		if (statSync(rutaCompleta).isDirectory()) {
			yield* enlistarRutas(rutaCompleta);
		} else if (entrada === '+page.svelte' || entrada === '+layout.svelte') {
			yield rutaCompleta;
		}
	}
}

// Componentes helper de tests (solo se montan desde .test.ts): su texto
// es dato de prueba, el invariante gobierna lo que el usuario lee.
function* enlistarComponentes(raiz: string): Generator<string> {
	for (const entrada of readdirSync(raiz)) {
		if (!entrada.endsWith('.svelte') || entrada.endsWith('Test.svelte')) continue;
		yield join(raiz, entrada);
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

// Deja la plantilla sola: quita los bloques <script> y <style> (CSS no
// es texto al usuario) y las directivas de bloque ({#each}, {/each},
// {:else}, {@const}, {@render}). Las directivas llevan condiciones o
// nombres de variable; solo quedan las expresiones {expr} de la
// plantilla.
const RE_DIRECTIVAS =
	/\{#(?:[^{}]|\$\{[^{}]*\})*\}|\{\/(?:[^{}]|\$\{[^{}]*\})*\}|\{:else[^{}]*\}|\{@(?:[^{}]|\$\{[^{}]*\})*\}/g;

function plantillaDe(limpio: string): string {
	const sinScript = limpio.replace(/<script\b[\s\S]*?<\/script>/g, '');
	return sinScript.replace(/<style\b[\s\S]*?<\/style>/g, '');
}

const RE_LITERAL = />\s*([A-Za-zÁÉÍÓÚáéíóú¿¡][^<>{}]{6,})</g;

// Cifras, espacios y simbolos comunes sin mas letras: no es una
// frase, es un dato. La primera letra la exige el regex.
const RE_EXENTO = /^[\d\s.,:/°%+\-×]*$/;

// Un codigo de error (ERR-{DOMINIO}-{CAUSA}, ADR-0010) es un
// identificador tecnico, no texto al usuario.
const RE_CODIGO_ERROR = /^ERR-[A-Z0-9-]+$/;

function esCadenaViolable(texto: string, minimo = 6): boolean {
	if (!/^[A-Za-zÁÉÍÓÚáéíóú¿¡]/.test(texto)) return false;
	if (RE_EXENTO.test(texto)) return false;
	if (RE_CODIGO_ERROR.test(texto)) return false;
	return texto.length >= minimo;
}

// Cadenas literales dentro de llaves en la plantilla: comilla simple,
// doble o backtick. Se exige primera letra letra y longitud >= 6.
const RE_CADENA = /['"`]([A-Za-zÁÉÍÓÚáéíóú¿¡][^'"`\n]{5,})['"`]/g;

// Encuentra el contenido de las llaves (no anidadas). Los Svelte
// snippets y las directivas {#if X}, {#each X} no entran: la regex
// del parser distingue esos casos. Esta solo mira expresiones.
const RE_LLAVES = /\{([^{}]*)\}/g;

// Regiones de texto de la plantilla: entre el cierre de un tag y la
// apertura del siguiente. El lookbehind salta el ">" de "=>" dentro de
// los atributos.
const RE_REGION_TEXTO = /(?<!=)>([^<>]*?)(?=<)/g;

// Cadenas literales dentro de <script> pasadas a funciones que llevan
// texto al usuario o al lector. Solo se captura la cadena del primer
// argumento que sea literal. mensajePara recibe codigos de error: el
// RE_CODIGO_ERROR los exime.
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

// (a) Valor por defecto de una propiedad de texto en el <script>.
// Los nombres de prop de texto son los mismos de ATRIBUTOS_CON_TEXTO
// mas el prefijo `etiqueta`. La minlongitud es 4 para no dejar pasar
// palabras cortas como "Atrás" o "Parar".
const RE_PROPS_TEXTO = new RegExp(
	`\\b(etiqueta\\w*|titulo|subtitulo|leyenda|descripcion|mensaje|placeholder|title|alt)(?:\\?)?\\s*=\\s*(['"\\x60])([A-Za-zÁÉÍÓÚáéíóú¿¡][^'"\\x60\\n]{3,})\\2`,
	'g'
);

// (b) Literal dentro de un objeto que vive en un ternario: un objeto
// tras "?" o ":" de una rama. Dentro, se capturan los valores string
// de cada clave (con un "clave ?? 'texto'" opcional de por medio).
const RE_TERNARIO_OBJETO = /(?<![=!])[:?]\s*\{([^{}]*)\}/g;
const RE_VALOR_OBJETO = /([\w$]+)\s*:\s*(?:[\w$.]+\s*\?\?\s*)?(['"`])([A-Za-zÁÉÍÓÚáéíóú¿¡][^'"`\n]{3,})\2/g;

// (d) Objeto literal fuera de un ternario: lo que RE_TERNARIO_OBJETO no
// ve. El lookbehind variable salta el ? o : que ya cubre (b); los
// bloques de control (if/else/while/for) no entran porque adentro no
// hay pares `clave: 'valor'`, y los type annotations no llevan literales.
const RE_OBJETO_LIBRE = /(?<![?:])\s*\{([^{}]*)\}/g;

// (e) Arreglo literal de cadenas: cualquier [...] que contenga al
// menos una cadena rodeada de comillas. El indice `array[i]` no entra
// porque la cadena adentro es un identificador, no un literal.
const RE_ARREGLO = /\[([^[\]]*)\]/g;
const RE_CADENA_ARREGLO = /(['"`])([A-Za-zÁÉÍÓÚáéíóú¿¡][^'"`\n]{3,})\1/g;

// (f) Asignacion de literal a una variable o a una propiedad con punto,
// con o sin const/let/var delante. Sin ancla de linea: la asignacion
// puede vivir tras un if o un else en la misma linea. La etiqueta de
// apertura del <script> se quita antes de escanear (ver escanear), o un
// generics="V extends string" entraria como si fuera una asignacion.
const RE_ASIGNACION =
	/(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*=\s*(['"`])([A-Za-zÁÉÍÓÚáéíóú¿¡][^'"`\n]{3,})\2/g;

// Vocabulario de claves que ya usa RE_PROPS_TEXTO: prefijo `etiqueta`
// y nombres exactos. La funcion se usa solo para el discriminador de
// (d); sin clave no aplica.
const KEYS_TEXTO_EXACTO = new Set([
	'titulo',
	'subtitulo',
	'leyenda',
	'descripcion',
	'mensaje',
	'placeholder',
	'title',
	'alt',
]);

function esClaveDeTexto(clave: string): boolean {
	if (/^etiqueta\w*$/i.test(clave)) return true;
	return KEYS_TEXTO_EXACTO.has(clave);
}

type Violacion = { archivo: string; texto: string; origen: string };

function escanear(relativa: string, src: string, violaciones: Violacion[]): void {
	const limpio = limpiar(src);
	const plantilla = plantillaDe(limpio);
	const bloquesScript = [...limpio.matchAll(/<script\b[\s\S]*?<\/script>/g)].map((m) => m[0]);
	const sinDirectivas = plantilla.replace(RE_DIRECTIVAS, '');

	// Texto entre tags.
	for (const match of sinDirectivas.matchAll(RE_LITERAL)) {
		const texto = match[1];
		if (!RE_EXENTO.test(texto.slice(1))) {
			violaciones.push({ archivo: relativa, texto, origen: 'tag' });
		}
	}

	// (c) Texto suelto que convive con expresiones: el fragmento que
	// queda antes de una llave es texto al usuario aunque sea mas corto
	// que el minimo de RE_LITERAL.
	for (const match of sinDirectivas.matchAll(RE_REGION_TEXTO)) {
		const region = match[1];
		for (const exp of region.matchAll(/\{([^{}]*)\}/g)) {
			const antes = region.slice(0, exp.index).replace(/\s+$/, '');
			const fragmento = antes.slice(antes.lastIndexOf('}') + 1).trim();
			const letras = fragmento.replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ]/g, '');
			if (letras.length >= 2 && !RE_EXENTO.test(fragmento)) {
				violaciones.push({ archivo: relativa, texto: fragmento, origen: 'antes-de-llave' });
			}
		}

		// Cadenas literales dentro de llaves en posicion de texto.
		for (const llaves of region.matchAll(RE_LLAVES)) {
			for (const cadenaMatch of llaves[1].matchAll(RE_CADENA)) {
				const texto = cadenaMatch[1];
				if (esCadenaViolable(texto)) {
					violaciones.push({ archivo: relativa, texto, origen: 'llaves' });
				}
			}
		}
	}

	// Atributos con texto.
	for (const match of sinDirectivas.matchAll(RE_ATRIBUTO_EXACTO)) {
		const texto = match[2];
		if (RE_EXENTO.test(texto)) continue;
		violaciones.push({ archivo: relativa, texto, origen: `attr:${match[1]}` });
	}
	for (const match of sinDirectivas.matchAll(RE_ATRIBUTO_PREFIJO)) {
		const texto = match[2];
		if (RE_EXENTO.test(texto)) continue;
		violaciones.push({ archivo: relativa, texto, origen: `attr:${match[1]}` });
	}

	// Cadenas literales en <script>. Los comentarios // y /* */ se
	// quitan antes: una cadena dentro de un comentario no es codigo.
	// La etiqueta de apertura se quita tambien: un generics="..." en el
	// tag tiene texto con espacio y la (f) lo leeria como asignacion.
	for (const bloque of bloquesScript) {
		const sinComentarios = bloque
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/\/\/[^\n]*/g, '')
			.replace(/^<script\b[^>]*>/, '');

		// Anuncios y avisos con literal como primer argumento.
		for (const match of sinComentarios.matchAll(RE_FUNCIONES_ANUNCIO)) {
			const texto = match[3];
			if (esCadenaViolable(texto)) {
				violaciones.push({ archivo: relativa, texto, origen: `script:${match[1]}` });
			}
		}

		// (a) Defaults de propiedades de texto.
		for (const match of sinComentarios.matchAll(RE_PROPS_TEXTO)) {
			const texto = match[3];
			if (esCadenaViolable(texto, 4)) {
				violaciones.push({ archivo: relativa, texto, origen: `prop:${match[1]}` });
			}
		}

		// (b) Valores string dentro de objetos de ternarios.
		for (const ternario of sinComentarios.matchAll(RE_TERNARIO_OBJETO)) {
			for (const valor of ternario[1].matchAll(RE_VALOR_OBJETO)) {
				const texto = valor[3];
				if (esCadenaViolable(texto, 4)) {
					violaciones.push({ archivo: relativa, texto, origen: `objeto:${valor[1]}` });
				}
			}
		}

		// (d) Valores string dentro de objetos que NO estan en un ternario.
		// Discriminador doble: clave del vocabulario de texto, o cadena con
		// espacio interior (dos palabras o mas). El primer criterio no
		// depende del largo; el segundo atrapa el resto.
		for (const objeto of sinComentarios.matchAll(RE_OBJETO_LIBRE)) {
			for (const valor of objeto[1].matchAll(RE_VALOR_OBJETO)) {
				const texto = valor[3];
				const claveEsTexto = esClaveDeTexto(valor[1]);
				const tieneEspacio = /\s/.test(texto);
				if ((claveEsTexto || tieneEspacio) && esCadenaViolable(texto, 4)) {
					violaciones.push({ archivo: relativa, texto, origen: `objeto-libre:${valor[1]}` });
				}
			}
		}

		// (e) Cadenas dentro de arreglos literales. Sin clave, solo el
		// criterio de espacio. Una sola palabra tecnica (`primario`,
		// `button`, `polite`) queda fuera sola.
		for (const arreglo of sinComentarios.matchAll(RE_ARREGLO)) {
			for (const cadena of arreglo[1].matchAll(RE_CADENA_ARREGLO)) {
				const texto = cadena[2];
				if (/\s/.test(texto) && esCadenaViolable(texto, 4)) {
					violaciones.push({ archivo: relativa, texto, origen: 'arreglo' });
				}
			}
		}

		// (f) Asignaciones de literal a variable o propiedad. Mismo
		// discriminador que (d) y (e): espacio interior (dos palabras o
		// mas), medido sin las interpolaciones: lo que rodea a un ${...}
		// es lo que la persona escucha. Un id como
		// `archivo-importar-${n}` queda fuera: su unico espacio vive
		// dentro de la interpolacion. La clave `clase*` son listas de
		// clases CSS: el usuario no lee ni escucha identificadores de
		// estilo.
		for (const match of sinComentarios.matchAll(RE_ASIGNACION)) {
			const objetivo = match[1];
			if (/^clase/.test(objetivo)) continue;
			const texto = match[3];
			const sinInterpolacion = texto.replace(/\$\{[^}]*\}/g, '');
			if (/\s/.test(sinInterpolacion) && esCadenaViolable(texto, 4)) {
				violaciones.push({ archivo: relativa, texto, origen: `asignacion:${objetivo}` });
			}
		}
	}
}

function* archivosEnBarrido(): Generator<{ relativa: string; ruta: string }> {
	for (const ruta of enlistarRutas(RAIZ_RUTAS)) {
		yield { relativa: ruta.slice(RAIZ_RUTAS.length + 1), ruta };
	}
	for (const ruta of enlistarComponentes(RAIZ_COMPONENTES)) {
		yield { relativa: ruta.slice('src'.length + 1), ruta };
	}
}

describe('invariante: sin literales visibles o audibles fuera del modulo', () => {
	it('no hay texto visible escrito a mano en rutas, layouts ni componentes', () => {
		const violaciones: Violacion[] = [];
		for (const { relativa, ruta } of archivosEnBarrido()) {
			if (EXCLUIDOS.has(relativa)) continue;
			escanear(relativa, readFileSync(ruta, 'utf8'), violaciones);
		}
		expect(violaciones).toEqual([]);
	});
});

// Las dos formas del defecto medido: un objeto literal suelto y un
// arreglo literal de cadenas. El escaneo previo no las veia porque (b)
// exige el objeto detras de ? o :, y no existia regex para arreglos.
describe('invariante: formas adicionales de literal en <script>', () => {
	it('(d) objeto literal fuera de un ternario', () => {
		const violaciones: Violacion[] = [];
		const src =
			`<script lang="ts">\n` +
			`\tconst avisos = { guardado: 'Cambios guardados' };\n` +
			`</script>`;
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toContainEqual({
			archivo: 'lib/components/__sintetico.test.svelte',
			texto: 'Cambios guardados',
			origen: 'objeto-libre:guardado',
		});
	});

	// Borde: clave fuera del vocabulario de texto y valor tecnico de
	// una sola palabra. El discriminador no debe marcarla: no es texto
	// al usuario aunque viva dentro de un objeto literal.
	it('(d) no marca cadena tecnica de una sola palabra en objeto plano', () => {
		const violaciones: Violacion[] = [];
		const src =
			`<script lang="ts">\n` +
			`\tconst clases = { variante: 'primario' };\n` +
			`</script>`;
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toEqual([]);
	});

	it('(e) arreglo literal de cadenas', () => {
		const violaciones: Violacion[] = [];
		const src =
			`<script lang="ts">\n` +
			`\tconst opciones = ['Descartar cambios'];\n` +
			`</script>`;
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toContainEqual({
			archivo: 'lib/components/__sintetico.test.svelte',
			texto: 'Descartar cambios',
			origen: 'arreglo',
		});
	});

	// Borde: cadenas de una sola palabra en un arreglo. Son valores
	// tecnicos (etiquetas de tipo, clases, eventos), no texto al usuario.
	it('(e) no marca arreglo de cadenas tecnicas de una sola palabra', () => {
		const violaciones: Violacion[] = [];
		const src =
			`<script lang="ts">\n` +
			`\tconst tipos = ['primario', 'secundario'];\n` +
			`</script>`;
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toEqual([]);
	});

	it('(f) cadena con espacio interior asignada a una variable', () => {
		const violaciones: Violacion[] = [];
		const src =
			`<script lang="ts">\n` +
			`\tconst aviso = 'dos palabras';\n` +
			`</script>`;
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toContainEqual({
			archivo: 'lib/components/__sintetico.test.svelte',
			texto: 'dos palabras',
			origen: 'asignacion:aviso',
		});
	});

	// Borde: cadena tecnica de una sola palabra asignada a una variable.
	// Sin espacio interior el discriminador no la ve: es un valor, no
	// texto al usuario.
	it('(f) no marca asignacion de cadena tecnica de una sola palabra', () => {
		const violaciones: Violacion[] = [];
		const src =
			`<script lang="ts">\n` +
			`\tconst tipo = 'primario';\n` +
			`</script>`;
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toEqual([]);
	});

	// Tres formas del defecto medido en el barrido real. La (f) las
	// dejaba pasar todas; las tres son texto que la persona escucha.
	it('(f) marca asignacion que no empieza la linea', () => {
		const violaciones: Violacion[] = [];
		const src =
			`<script lang="ts">\n` +
			`\tif (titulo) { let aviso = 'dos palabras'; }\n` +
			`</script>`;
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toContainEqual({
			archivo: 'lib/components/__sintetico.test.svelte',
			texto: 'dos palabras',
			origen: 'asignacion:aviso',
		});
	});

	it('(f) marca template con interpolacion y palabras fijas', () => {
		const violaciones: Violacion[] = [];
		const src =
			'<script lang="ts">\n' +
			'\tconst aviso = `Continuamos con ${nombre}`;\n' +
			'</script>';
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toContainEqual({
			archivo: 'lib/components/__sintetico.test.svelte',
			texto: 'Continuamos con ${nombre}',
			origen: 'asignacion:aviso',
		});
	});

	it('(f) marca asignacion a propiedad con varios puntos', () => {
		const violaciones: Violacion[] = [];
		const src =
			`<script lang="ts">\n` +
			`\ta.b.c = 'dos palabras';\n` +
			`</script>`;
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toContainEqual({
			archivo: 'lib/components/__sintetico.test.svelte',
			texto: 'dos palabras',
			origen: 'asignacion:a.b.c',
		});
	});

	// Borde: el atributo generics de la etiqueta de apertura lleva texto
	// con espacio pero no es codigo; la (f) no debe leerlo. Es el mismo
	// caso real de GrupoSeleccion y GrupoSeleccionMultiple.
	it('(f) no marca generics de la etiqueta de apertura del script', () => {
		const violaciones: Violacion[] = [];
		const src =
			`<script lang="ts" generics="V extends string">\n` +
			`\tconst valor = 1;\n` +
			`</script>`;
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toEqual([]);
	});

	// Borde: template cuyo unico espacio vive dentro de la interpolacion.
	// Es el caso real de ImportarRespaldo: un id de DOM, no texto al
	// usuario. Sin la interpolacion no queda ningun espacio.
	it('(f) no marca template cuyo espacio vive solo en la interpolacion', () => {
		const violaciones: Violacion[] = [];
		const src =
			'<script lang="ts">\n' +
			'\tconst idInput = `archivo-importar-${contadorInstancias - 1}`;\n' +
			'</script>';
		escanear('lib/components/__sintetico.test.svelte', src, violaciones);
		expect(violaciones).toEqual([]);
	});
});
