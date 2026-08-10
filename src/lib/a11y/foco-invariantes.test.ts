// @vitest-environment node
//
// Invariantes de accesibilidad sobre el codigo fuente de cada
// +page.svelte, no sobre el DOM rendido. Vigila que el foco aterrice
// donde dice la pantalla (un encabezado) y que la estructura de
// encabezados no rompa la navegacion por regiones de los lectores de
// pantalla. Regla normativa: docs/convenciones-ui.md, seccion "Foco"
// y "Encabezados".

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBVISTAS } from '$lib/sesion/fases';

const RAIZ_PROYECTO = fileURLToPath(new URL('../../..', import.meta.url));
const RAIZ_RUTAS = join(RAIZ_PROYECTO, 'src', 'routes');

// Sin exclusiones activas: la sesión ya cumple los invariantes desde el
// encargo de foco; el filtro se conserva para una futura ruta pendiente.
const EXCLUIDOS: ReadonlySet<string> = new Set<string>();

function buscarPaginas(dir: string): string[] {
	const encontrados: string[] = [];
	for (const entrada of readdirSync(dir)) {
		const rutaCompleta = join(dir, entrada);
		if (statSync(rutaCompleta).isDirectory()) {
			encontrados.push(...buscarPaginas(rutaCompleta));
		} else if (entrada === '+page.svelte') {
			encontrados.push(rutaCompleta);
		}
	}
	return encontrados.sort();
}

function relativa(ruta: string): string {
	return relative(RAIZ_PROYECTO, ruta).split(sep).join('/');
}

function limpiar(src: string): string {
	// Quita <script>, <style> y comentarios: los marcadores {#if X} viven
	// solo en la plantilla, asi que se preservan. Sin esto, las regex del
	// parser podrian encontrar headings en bloques de tipo o de CSS.
	return src
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
		.replace(/<!--[\s\S]*?-->/g, '');
}

function sinComentarios(src: string): string {
	// Conserva el <script> (limpiar() lo borra) y descarta solo
	// comentarios: una llamada comentada no es una llamada.
	return src
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/\/\/[^\n]*/g, '');
}

function separadorSiguiente(src: string, pos: number): boolean {
	if (pos >= src.length) return false;
	const c = src[pos];
	return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '}';
}

function saltarExpresion(src: string, inicio: number): number {
	// Busca el } que cierra la expresion de un marcador {#X EXPR} o
	// {:X EXPR}. Las expresiones en este repo son referencias o tipos
	// simples sin objetos literales, asi que el primer } no anidado
	// alcanza. Si en el futuro alguna expresion trae objetos, este
	// helper se reemplaza por un contador de llaves.
	return src.indexOf('}', inicio);
}

// -- Parser de plantilla: convierte el texto en un arbol de bloques
// mutuamente excluyentes. Sirve para calcular max h1s y para enumerar
// los caminos de encabezados que el lector de pantalla podria recorrer.

type Nodo =
	| { tipo: 'texto'; headings: number[] }
	| { tipo: 'if'; ramas: Nodo[][] }
	| { tipo: 'await'; ramas: Nodo[][] }
	| { tipo: 'each'; cuerpo: Nodo[] }
	| { tipo: 'snippet'; cuerpo: Nodo[] };

function encontrarCierre(
	src: string,
	inicio: number,
	fin: number,
	abre: string,
	cierra: string
): number {
	let profundidad = 1;
	let i = inicio + abre.length;
	while (i < fin && profundidad > 0) {
		if (src.startsWith(abre, i) && separadorSiguiente(src, i + abre.length)) {
			profundidad++;
			i += abre.length;
		} else if (src.startsWith(cierra, i)) {
			profundidad--;
			if (profundidad === 0) return i;
			i += cierra.length;
		} else {
			i++;
		}
	}
	return -1;
}

function dividirRamas(
	src: string,
	inicio: number,
	fin: number
): Array<[number, number]> {
	const ramas: Array<[number, number]> = [];
	let ramaInicio = inicio;
	let i = inicio;
	let profundidad = 0;
	while (i < fin) {
		if (src.startsWith('{#if', i) && separadorSiguiente(src, i + 4)) {
			profundidad++;
			i += 4;
		} else if (src.startsWith('{#each', i) && separadorSiguiente(src, i + 6)) {
			profundidad++;
			i += 6;
		} else if (src.startsWith('{#await', i) && separadorSiguiente(src, i + 7)) {
			profundidad++;
			i += 7;
		} else if (src.startsWith('{#snippet', i) && separadorSiguiente(src, i + 9)) {
			profundidad++;
			i += 9;
		} else if (src.startsWith('{/if}', i)) {
			profundidad--;
			i += 5;
		} else if (src.startsWith('{/each}', i)) {
			profundidad--;
			i += 7;
		} else if (src.startsWith('{/await}', i)) {
			profundidad--;
			i += 8;
		} else if (src.startsWith('{/snippet}', i)) {
			profundidad--;
			i += 10;
		} else if (
			profundidad === 0 &&
			src.startsWith('{:else if', i) &&
			separadorSiguiente(src, i + 9)
		) {
			ramas.push([ramaInicio, i]);
			i = saltarExpresion(src, i + 9) + 1;
			ramaInicio = i;
		} else if (profundidad === 0 && src.startsWith('{:else}', i)) {
			ramas.push([ramaInicio, i]);
			i += 7;
			ramaInicio = i;
		} else {
			i++;
		}
	}
	ramas.push([ramaInicio, fin]);
	return ramas;
}

function dividirRamasAwait(
	src: string,
	inicio: number,
	fin: number
): Array<[number, number]> {
	const ramas: Array<[number, number]> = [];
	let ramaInicio = inicio;
	let i = inicio;
	let profundidad = 0;
	while (i < fin) {
		if (src.startsWith('{#if', i) && separadorSiguiente(src, i + 4)) {
			profundidad++;
			i += 4;
		} else if (src.startsWith('{#each', i) && separadorSiguiente(src, i + 6)) {
			profundidad++;
			i += 6;
		} else if (src.startsWith('{#await', i) && separadorSiguiente(src, i + 7)) {
			profundidad++;
			i += 7;
		} else if (src.startsWith('{/if}', i)) {
			profundidad--;
			i += 5;
		} else if (src.startsWith('{/each}', i)) {
			profundidad--;
			i += 7;
		} else if (src.startsWith('{/await}', i)) {
			profundidad--;
			i += 8;
		} else if (
			profundidad === 0 &&
			src.startsWith('{:then', i) &&
			separadorSiguiente(src, i + 5)
		) {
			ramas.push([ramaInicio, i]);
			i = saltarExpresion(src, i + 5) + 1;
			ramaInicio = i;
		} else if (
			profundidad === 0 &&
			src.startsWith('{:catch', i) &&
			separadorSiguiente(src, i + 6)
		) {
			ramas.push([ramaInicio, i]);
			i = saltarExpresion(src, i + 6) + 1;
			ramaInicio = i;
		} else {
			i++;
		}
	}
	ramas.push([ramaInicio, fin]);
	return ramas;
}

function extraerHeadings(texto: string): number[] {
	const niveles: number[] = [];
	const re = /<h([1-6])(?=[\s/>])/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(texto)) !== null) {
		niveles.push(Number(m[1]));
	}
	return niveles;
}

function parsear(src: string, inicio: number, fin: number): Nodo[] {
	const nodos: Nodo[] = [];
	let buffer = '';
	let i = inicio;

	function vaciar(): void {
		if (buffer.length > 0) {
			nodos.push({ tipo: 'texto', headings: extraerHeadings(buffer) });
			buffer = '';
		}
	}

	while (i < fin) {
		if (src.startsWith('{#if', i) && separadorSiguiente(src, i + 4)) {
			vaciar();
			const cierreIf = encontrarCierre(src, i, fin, '{#if', '{/if}');
			if (cierreIf === -1) {
				buffer += src.slice(i, fin);
				break;
			}
			const inicioCuerpo = saltarExpresion(src, i + 4) + 1;
			const ramas = dividirRamas(src, inicioCuerpo, cierreIf);
			const subNodos = ramas.map(([ini, finRama]) => parsear(src, ini, finRama));
			nodos.push({ tipo: 'if', ramas: subNodos });
			i = cierreIf + 5;
		} else if (src.startsWith('{#each', i) && separadorSiguiente(src, i + 6)) {
			vaciar();
			const cierreEach = encontrarCierre(src, i, fin, '{#each', '{/each}');
			if (cierreEach === -1) {
				buffer += src.slice(i, fin);
				break;
			}
			const inicioCuerpo = saltarExpresion(src, i + 6) + 1;
			const cuerpo = parsear(src, inicioCuerpo, cierreEach);
			nodos.push({ tipo: 'each', cuerpo });
			i = cierreEach + 7;
		} else if (src.startsWith('{#await', i) && separadorSiguiente(src, i + 7)) {
			vaciar();
			const cierreAwait = encontrarCierre(src, i, fin, '{#await', '{/await}');
			if (cierreAwait === -1) {
				buffer += src.slice(i, fin);
				break;
			}
			const inicioCuerpo = saltarExpresion(src, i + 7) + 1;
			const ramas = dividirRamasAwait(src, inicioCuerpo, cierreAwait);
			const subNodos = ramas.map(([ini, finRama]) => parsear(src, ini, finRama));
			nodos.push({ tipo: 'await', ramas: subNodos });
			i = cierreAwait + 8;
		} else if (src.startsWith('{#snippet', i) && separadorSiguiente(src, i + 9)) {
			vaciar();
			const cierreSnippet = encontrarCierre(src, i, fin, '{#snippet', '{/snippet}');
			if (cierreSnippet === -1) {
				buffer += src.slice(i, fin);
				break;
			}
			const inicioCuerpo = saltarExpresion(src, i + 9) + 1;
			const cuerpo = parsear(src, inicioCuerpo, cierreSnippet);
			nodos.push({ tipo: 'snippet', cuerpo });
			i = cierreSnippet + 10;
		} else if (src.startsWith('{@render', i)) {
			vaciar();
			const finRender = src.indexOf('}', i);
			i = finRender === -1 ? fin : finRender + 1;
		} else if (src.startsWith('{@const', i)) {
			const finConst = src.indexOf('}', i);
			i = finConst === -1 ? fin : finConst + 1;
		} else {
			buffer += src[i];
			i++;
		}
	}
	vaciar();
	return nodos;
}

// Max h1s que podrian estar en pantalla a la vez. {#if/else} toma max
// entre ramas; {#each} cuenta el cuerpo una vez (los {#each} de este
// repo no contienen h1s); {#snippet} tambien una vez.
function maxH1s(nodos: Nodo[]): number {
	let total = 0;
	for (const nodo of nodos) {
		if (nodo.tipo === 'texto') {
			for (const h of nodo.headings) if (h === 1) total++;
		} else if (nodo.tipo === 'if' || nodo.tipo === 'await') {
			if (nodo.ramas.length === 0) continue;
			total += Math.max(...nodo.ramas.map(maxH1s));
		} else {
			total += maxH1s(nodo.cuerpo);
		}
	}
	return total;
}

function* enumerarCaminos(nodos: Nodo[], camino: number[]): Generator<number[]> {
	if (nodos.length === 0) {
		yield camino;
		return;
	}
	const [primero, ...resto] = nodos;
	if (primero.tipo === 'texto') {
		yield* enumerarCaminos(resto, [...camino, ...primero.headings]);
	} else if (primero.tipo === 'if' || primero.tipo === 'await') {
		for (const rama of primero.ramas) {
			yield* enumerarCaminos([...rama, ...resto], camino);
		}
	} else {
		yield* enumerarCaminos([...primero.cuerpo, ...resto], camino);
	}
}

function verificarSaltos(headings: number[]): string[] {
	const errores: string[] = [];
	let previo: number | null = null;
	for (const h of headings) {
		if (previo !== null && h > previo + 1) {
			errores.push(`salto: h${previo} -> h${h} (falta h${previo + 1})`);
		}
		previo = h;
	}
	return errores;
}

// Regla: la variable que recibe enfocarPrincipal tiene que estar atada
// a un <h1> o <h2> via bind:this. Si el bind:this no se encuentra, la
// prueba falla y pide revision manual, en vez de pasar en silencio.
function tagDelBind(plantilla: string, nombre: string): string | null {
	// Devuelve el nombre del tag Svelte que contiene bind:this={nombre}.
	// Busca hacia atras desde cada bind:this para encontrar el <TAG
	// inmediatamente anterior, asi evita matchear <svelte:head> u otros
	// tags que aparezcan antes en el documento.
	const escapado = nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = new RegExp(`bind:this=\\{${escapado}\\}`, 'g');
	let match: RegExpExecArray | null;
	while ((match = regex.exec(plantilla)) !== null) {
		const antes = plantilla.slice(0, match.index);
		const ultimoMenor = antes.lastIndexOf('<');
		if (ultimoMenor === -1) continue;
		const resto = antes.slice(ultimoMenor);
		const tagMatch = /^<([A-Za-z][\w:-]*)/.exec(resto);
		if (tagMatch) return tagMatch[1].toLowerCase();
	}
	return null;
}

function verificarDestinosDeFoco(fuente: string): string[] {
	const errores: string[] = [];
	const destinos = new Set<string>();
	// Se captura el argumento COMPLETO, no solo el caso de identificador
	// suelto. Si se mira unicamente enfocarPrincipal(nombre), cualquier
	// expresion (por ejemplo un querySelector) queda fuera del alcance de
	// la regla y la prueba pasa en silencio justo donde mas hace falta.
	const regexLlamada = /enfocarPrincipal\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
	let m: RegExpExecArray | null;
	while ((m = regexLlamada.exec(fuente)) !== null) {
		const argumento = m[1].trim();
		if (/^[A-Za-z_$][\w$]*$/.test(argumento)) {
			destinos.add(argumento);
			continue;
		}
		errores.push(
			`enfocarPrincipal(${argumento}) no recibe un identificador ligado por bind:this; la regla exige que el destino del foco sea un <h1> o <h2> comprobable, revisar el archivo manualmente`
		);
	}
	if (destinos.size === 0) return errores;

	const plantilla = limpiar(fuente);
	for (const nombre of destinos) {
		const tag = tagDelBind(plantilla, nombre);
		if (tag === null) {
			errores.push(
				`enfocarPrincipal(${nombre}) no se pudo asociar a un bind:this={${nombre}} sobre un encabezado; revisar el archivo manualmente`
			);
			continue;
		}
		if (tag !== 'h1' && tag !== 'h2') {
			errores.push(
				`enfocarPrincipal(${nombre}) esta sobre <${tag}>, pero la regla exige <h1> o <h2>`
			);
		}
	}
	return errores;
}

function buscarDisabled(fuente: string): string[] {
	const limpio = limpiar(fuente);
	const errores: string[] = [];
	// (?<![\w-]) evita matchear aria-disabled, deshabilitado (que ni
	// siquiera contiene "disabled") u otros compuestos. La exclusion
	// de <style> via limpiar() ya filtra :disabled de CSS.
	const regex = /(?<![\w-])disabled\b/g;
	let m: RegExpExecArray | null;
	while ((m = regex.exec(limpio)) !== null) {
		const inicio = Math.max(0, m.index - 30);
		const fin = Math.min(limpio.length, m.index + 30);
		const contexto = limpio.slice(inicio, fin).replace(/\s+/g, ' ').trim();
		errores.push(`atributo "disabled" cerca de: ...${contexto}...`);
	}
	return errores;
}

describe('invariantes de foco y encabezados en rutas', () => {
	const archivos = buscarPaginas(RAIZ_RUTAS).filter(
		(ruta) => !EXCLUIDOS.has(relativa(ruta))
	);

	if (archivos.length === 0) {
		it.skip('no se encontraron archivos de ruta para verificar', () => {});
		return;
	}

	for (const ruta of archivos) {
		const rel = relativa(ruta);
		const fuente = readFileSync(ruta, 'utf-8');
		const nodos = parsear(limpiar(fuente), 0, limpiar(fuente).length);

		describe(rel, () => {
			it('declara exactamente un h1 simultaneo (ramas excluyentes cuentan una sola)', () => {
				const max = maxH1s(nodos);
				expect(
					max,
					`se esperaba 1 h1 simultaneo, hay ${max}; revisar si hay h1s en ramas NO excluyentes del mismo archivo`
				).toBe(1);
			});

			it('no salta niveles de encabezado en ningun camino de render', () => {
				const errores: string[] = [];
				for (const camino of enumerarCaminos(nodos, [])) {
					for (const e of verificarSaltos(camino)) errores.push(e);
				}
				expect(errores, errores.join('\n')).toEqual([]);
			});

			it('enfocarPrincipal recibe un identificador ligado por bind:this a un h1 o h2', () => {
				const errores = verificarDestinosDeFoco(fuente);
				expect(errores, errores.join('\n')).toEqual([]);
			});

			it('exige al menos una llamada a enfocarPrincipal al entrar', () => {
				expect(
					/\benfocarPrincipal\(/.test(sinComentarios(fuente)),
					`Falta enfocarPrincipal en ${rel}`
				).toBe(true);
			});

			it('enfocarPrincipal se llama en cada fase si la ruta tiene maquina de fases', () => {
				if (!importaMaquinaDeFases(fuente)) return;
				const errores = verificarLlamadasPorFase(fuente, rel);
				expect(errores, errores.join('\n')).toEqual([]);
			});

			it('no usa el atributo disabled en controles (aria-disabled si esta permitido)', () => {
				const errores = buscarDisabled(fuente);
				expect(errores, errores.join('\n')).toEqual([]);
			});
		});
	}
});

// Detecta si la ruta importa la maquina pura de fases. Si la
// importa, el invariante pasa a exigir una llamada a
// `enfocarPrincipal` por cada fase (no una sola que cubre todas).
function importaMaquinaDeFases(fuente: string): boolean {
	return /from\s+['"]\$lib\/sesion\/fases['"]/.test(fuente);
}

// Para cada fase de la maquina, busca la condicion que la nombra
// cerrada por `)` y seguida (con espacio opcional) por la llamada a
// `enfocarPrincipal`. El `)` que cierra la condicion del if es lo
// que evita que la regex se trague la llamada de la siguiente rama
// del `else if` (con una ventana de N chars eso pasaba).
function verificarLlamadasPorFase(fuente: string, rel: string): string[] {
	const errores: string[] = [];
	for (const fase of SUBVISTAS) {
		const re = new RegExp(
			`subvista\\s*===\\s*'${fase}'\\)\\s*enfocarPrincipal\\(`,
			'g'
		);
		if (!re.test(fuente)) {
			errores.push(`Falta enfocarPrincipal para la fase ${fase} en ${rel}`);
		}
	}
	return errores;
}
