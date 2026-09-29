import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { M } from '$lib/mensajes/ui';

// Recorrido estructural de las 23 pantallas con cabecera: lee cada
// archivo de ruta como texto (patron de contraste-tokens.test.ts) y
// fija el contrato de la cabecera unificada. El orden real del DOM lo
// cubre Cabecera.test.ts; aca se fija que la pantalla usa el componente
// con el h1 dentro, sin cambios de texto, foco ni encabezados.

type Pantalla = {
	ruta: string;
	// Contenido esperado del h1: el literal o la interpolacion {M.x.y}
	// tal cual aparece en el archivo. Mas de un valor = ramas
	// {#if}/{:else} excluyentes (un solo h1 renderizado).
	titulos: string[];
	// El h1 no lleva bind:this (el foco va a una subvista, como en la
	// sesion, que enfoca el h2 del cierre).
	sinBinding?: boolean;
	// La rama de cierre queda fuera de la Cabecera: en CIERRE no hay
	// boton de salida a proposito.
	soloPrimeraRamaConCabecera?: boolean;
};

const PANTALLAS: Pantalla[] = [
	{ ruta: 'onboarding/objetivo', titulos: ['{M.onboarding.objetivo.titulo}'] },
	{ ruta: 'onboarding/dolor-preexistente', titulos: ['{M.onboarding.dolor.titulo}'] },
	{ ruta: 'onboarding/datos', titulos: ['{M.onboarding.datos.titulo}'] },
	{ ruta: 'onboarding/disponibilidad', titulos: ['{M.onboarding.disponibilidad.titulo}'] },
	{ ruta: 'onboarding/equipamiento', titulos: ['{M.onboarding.equipamiento.titulo}'] },
	{ ruta: 'onboarding/evaluacion/pull', titulos: ['{M.onboarding.evaluacion.pull.titulo}'] },
	{ ruta: 'onboarding/evaluacion/legs', titulos: ['{M.onboarding.evaluacion.legs.titulo}'] },
	{ ruta: 'onboarding/evaluacion/push', titulos: ['{M.onboarding.evaluacion.push.titulo}'] },
	{ ruta: 'onboarding/evaluacion/core', titulos: ['{M.onboarding.evaluacion.core.titulo}'] },
	{ ruta: 'ayuda', titulos: ['{M.ayuda.titulo}'] },
	{
		ruta: 'ayuda/[tema]',
		titulos: ['{tema.titulo}', '{M.ayuda.noEncontradoTitulo}'],
	},
	{
		ruta: 'biblioteca/[id]',
		titulos: ['{ejercicio.nombre}', '{M.biblioteca.tituloNoEncontrado}'],
	},
	{
		ruta: 'sesion',
		titulos: ['{tituloFase}', '{M.sesion.titulo}'],
		sinBinding: true,
		soloPrimeraRamaConCabecera: true,
	},
	{
		ruta: 'config/objetivo',
		titulos: [
			'{M.configuracion.objetivo.titulo}',
			'{M.configuracion.objetivo.titulo}',
			'{M.configuracion.objetivo.titulo}',
		],
	},
	{
		ruta: 'config/datos',
		titulos: [
			'{M.configuracion.datos.titulo}',
			'{M.configuracion.datos.titulo}',
			'{M.configuracion.datos.titulo}',
		],
	},
	{
		ruta: 'config/dolor',
		titulos: [
			'{M.configuracion.dolor.titulo}',
			'{M.configuracion.dolor.titulo}',
			'{M.configuracion.dolor.titulo}',
		],
	},
	{ ruta: 'config/borrar', titulos: ['{M.configuracion.borrar.titulo}'] },
	{
		ruta: 'config/borrar/confirmar',
		titulos: ['{M.configuracion.borrarConfirmar.titulo}'],
	},
	{ ruta: 'config/audio', titulos: ['{M.configuracion.audio.titulo}'] },
	{ ruta: 'config/acerca', titulos: ['{M.configuracion.acerca.titulo}'] },
	{
		ruta: 'config/equipamiento',
		titulos: [
			'{M.onboarding.equipamiento.titulo}',
			'{M.onboarding.equipamiento.titulo}',
			'{M.onboarding.equipamiento.titulo}',
		],
	},
	{ ruta: 'config', titulos: [
		'{M.configuracion.indice.titulo}',
		'{M.configuracion.indice.titulo}',
		'{M.configuracion.indice.titulo}',
		'{M.configuracion.indice.titulo}',
	] },
	{ ruta: 'config/aspecto', titulos: ['{M.configuracion.aspecto.titulo}'] },
	{ ruta: 'config/importar', titulos: ['{M.configuracion.importar.titulo}'] },
	{ ruta: 'config/rehacer', titulos: ['{M.configuracion.rehacer.titulo}'] },
	{
		ruta: 'config/rehacer/confirmar',
		titulos: ['{M.configuracion.rehacerConfirmar.titulo}'],
	},
];

const RE_H1 = /<h1\b([^>]*)>([\s\S]*?)<\/h1>/g;

function ultimaAparicion(archivo: string, patron: string, antesDe: number): number {
	const ms = [...archivo.matchAll(new RegExp(patron, 'g'))];
	const previas = ms.filter((m) => (m.index ?? -1) < antesDe);
	return previas.length > 0 ? (previas[previas.length - 1].index ?? -1) : -1;
}

function resolverM(referencia: string): string {
	// '{M.modulo.clave}' -> camino 'modulo.clave' dentro de M.
	let actual: unknown = M;
	for (const parte of referencia.slice(3, -1).split('.')) {
		actual = (actual as Record<string, unknown>)[parte];
	}
	if (typeof actual !== 'string') {
		throw new Error(`referencia ${referencia} no resuelve a texto en M`);
	}
	return actual;
}

type Retorno = { ruta: string; destino: string; condicional?: boolean };

const RETORNOS: Retorno[] = [
	{ ruta: 'ayuda', destino: '/config', condicional: true },
	{ ruta: 'ayuda/[tema]', destino: '/ayuda' },
	{ ruta: 'biblioteca/[id]', destino: '/biblioteca' },
	{ ruta: 'sesion', destino: '/' },
	{ ruta: 'config/audio', destino: '/config' },
	{ ruta: 'config/acerca', destino: '/config' },
	{ ruta: 'config', destino: '/perfil' },
	{ ruta: 'config/aspecto', destino: '/config' },
	{ ruta: 'config/borrar', destino: '/config' },
	{ ruta: 'config/borrar/confirmar', destino: '/config/borrar' },
	{ ruta: 'config/datos', destino: '/config' },
	{ ruta: 'config/dolor', destino: '/config' },
	{ ruta: 'config/equipamiento', destino: '/config' },
	{ ruta: 'config/importar', destino: '/config' },
	{ ruta: 'config/objetivo', destino: '/config' },
	{ ruta: 'config/rehacer', destino: '/config' },
	{ ruta: 'config/rehacer/confirmar', destino: '/config/rehacer' },
];

describe('cabecera unificada en las pantallas con cabecera', () => {
	for (const pantalla of PANTALLAS) {
		it(`${pantalla.ruta} usa la cabecera unificada sin cambiar texto, foco ni encabezados`, () => {
			const archivo = readFileSync(`src/routes/${pantalla.ruta}/+page.svelte`, 'utf-8');

			// El componente compartido esta presente (patron de barra).
			expect(archivo).toMatch(/<\s*Cabecera\b/);

			// Contenido y cantidad de h1: el texto no cambio y las ramas
			// excluyentes declaran el mismo h1 (uno solo renderizado).
			const h1s = [...archivo.matchAll(RE_H1)];
			expect(h1s.map((m) => m[2].trim())).toEqual(pantalla.titulos);

			for (let i = 1; i < h1s.length; i += 1) {
				expect(
					archivo.slice(h1s[i - 1].index ?? 0, h1s[i].index ?? 0),
				).toMatch(/{:else/);
			}

			for (const [indice, h1] of h1s.entries()) {
				const apertura = h1[1];
				expect(apertura).toMatch(/tabindex="-1"/);
				if (!pantalla.sinBinding) {
					expect(apertura).toMatch(/bind:this=\{heading\}/);
				}
				// El h1 vive dentro de la Cabecera: la flecha queda antes
				// en el orden del archivo (y del DOM, ver Cabecera.test.ts).
				const enCabecera =
					!pantalla.soloPrimeraRamaConCabecera || indice === 0;
				if (enCabecera) {
					const pos = h1.index ?? 0;
					expect(
						ultimaAparicion(archivo, '<\\s*Cabecera\\b', pos),
					).toBeGreaterThan(ultimaAparicion(archivo, '<\\/Cabecera>', pos));
				}
			}

			// Las referencias a mensajes resuelven a texto visible.
			for (const titulo of pantalla.titulos) {
				if (titulo.startsWith('{M.')) {
					expect(resolverM(titulo).length).toBeGreaterThan(0);
				}
			}

			// El foco a la pantalla sigue vivo aunque el h1 no se bindee.
			if (pantalla.sinBinding) {
				expect(archivo).toMatch(/bind:this=\{refCierre\}/);
			}
		});
	}
});

describe('destino de retorno declarado por pantalla', () => {
	for (const retorno of RETORNOS) {
		it(`${retorno.ruta} vuelve a ${retorno.destino}`, () => {
			const archivo = readFileSync(`src/routes/${retorno.ruta}/+page.svelte`, 'utf-8');
			if (retorno.condicional) {
				// Caso Ayuda: ?de=config -> /config, resto history.back()
				expect(archivo, `${retorno.ruta} debe distinguir ?de=config`).toMatch(/searchParams\.get\('de'\)\s*===\s*'config'/);
				expect(archivo, `${retorno.ruta} debe ir a ${retorno.destino}`).toMatch(new RegExp(`goto\\(resolve\\('${retorno.destino}'\\)\\)`));
				expect(archivo, `${retorno.ruta} debe usar history.back()`).toMatch(/history\.back\(\)/);
			} else if (retorno.destino === '/biblioteca') {
				// Detalle usa history.back() con origen o goto a la lista
				expect(archivo, `${retorno.ruta} debe usar history.back()`).toMatch(/history\.back\(\)/);
				expect(archivo, `${retorno.ruta} debe poder ir a ${retorno.destino}`).toMatch(new RegExp(`goto\\(resolve\\('${retorno.destino}'\\)\\)`));
			} else {
				expect(archivo, `${retorno.ruta} debe volver a ${retorno.destino}`).toMatch(new RegExp(`goto\\(resolve\\('${retorno.destino}'\\)\\)`));
			}
		});
	}
});
