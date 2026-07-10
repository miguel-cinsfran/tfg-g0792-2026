// @vitest-environment jsdom
//
// Auditoria axe-core (WCAG 2.x A/AA) de los componentes base montados.
// Complementa a contraste-tokens.test.ts: axe verifica semantica (roles,
// nombres accesibles, ARIA valida); el contraste se verifica alla por
// calculo, porque jsdom no hace layout ni resuelve colores reales. Por
// esa misma razon se desactivan las reglas que dependen de render real
// (color-contrast, target-size); los targets de 48px son regla de
// diseño cubierta por las clases min-h-12/min-w-12.
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import axe from 'axe-core';
import Boton from '$lib/components/Boton.svelte';
import BotonVolver from '$lib/components/BotonVolver.svelte';
import Card from '$lib/components/Card.svelte';
import ContadorReps from '$lib/components/ContadorReps.svelte';
import Temporizador from '$lib/components/Temporizador.svelte';
import ModalDolor from '$lib/components/ModalDolor.svelte';
import ImportarRespaldo from '$lib/components/ImportarRespaldo.svelte';
import AvisoVisible from '$lib/a11y/AvisoVisible.svelte';
import { avisar, resetearAvisoVisible } from '$lib/a11y/avisar.svelte';

function snippetTexto(texto: string) {
	return createRawSnippet(() => ({ render: () => `<span>${texto}</span>` }));
}

const OPCIONES: axe.RunOptions = {
	runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
	rules: {
		'color-contrast': { enabled: false },
		'target-size': { enabled: false },
	},
};

async function auditar(): Promise<axe.Result[]> {
	const { violations } = await axe.run(document.body, OPCIONES);
	return violations;
}

function describirViolaciones(v: axe.Result[]): string {
	return v.map((r) => `${r.id}: ${r.help} -> ${r.nodes.map((n) => n.html).join(' | ')}`).join('\n');
}

describe('axe-core sobre componentes montados', () => {
	let instancia: ReturnType<typeof mount> | undefined;

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = undefined;
		document.body.innerHTML = '';
		resetearAvisoVisible();
	});

	const casos: Array<[string, Component, Record<string, unknown>]> = [
		['Boton primario', Boton as Component, { children: snippetTexto('Continuar') }],
		[
			'Boton secundario deshabilitado',
			Boton as Component,
			{ children: snippetTexto('Atras'), variante: 'secundario', deshabilitado: true },
		],
		['Card con titulo', Card as Component, { titulo: 'Proxima sesion', children: snippetTexto('Contenido') }],
		['ContadorReps', ContadorReps as Component, { valor: 8 }],
		['Temporizador', Temporizador as Component, { segundos: 60 }],
		[
			'ModalDolor abierto',
			ModalDolor as Component,
			{ abierto: true, titulo: 'Reportar dolor', alCerrar: () => {}, children: snippetTexto('Detalle') },
		],
		[
			'BotonVolver con etiqueta default',
			BotonVolver as Component,
			{ onclick: () => {} },
		],
		[
			'BotonVolver con etiqueta custom',
			BotonVolver as Component,
			{ onclick: () => {}, etiqueta: 'Volver al inicio' },
		],
		[
			'ImportarRespaldo con etiqueta default',
			ImportarRespaldo as Component,
			{ onImportado: () => {} },
		],
		[
			'ImportarRespaldo con etiqueta custom',
			ImportarRespaldo as Component,
			{ onImportado: () => {}, etiquetaBoton: 'Recuperar mis datos' },
		],
		[
			'AvisoVisible con exito',
			AvisoVisible as Component,
			{},
		],
		// AvisoVisible con error se cubre con el caso dinamico de abajo
		// (necesita disparar avisar antes de montar axe para que
		// renderice contenido, no se puede pasar como prop).
	];

	for (const [nombre, Comp, props] of casos) {
		it(`${nombre}: sin violaciones A/AA`, async () => {
			instancia = mount(Comp, { target: document.body, props });
			flushSync();
			const violaciones = await auditar();
			expect(violaciones, describirViolaciones(violaciones)).toEqual([]);
		});
	}

	// Control negativo: si axe dejara de detectar problemas (config rota,
	// jsdom incompatible), este test lo delata. Un boton sin nombre
	// accesible viola button-name (WCAG 4.1.2).
	it('control: axe detecta un boton sin nombre accesible', async () => {
		document.body.innerHTML = '<button></button>';
		const violaciones = await auditar();
		expect(violaciones.map((v) => v.id)).toContain('button-name');
	});

	// AvisoVisible con aviso de error cargado: como el contenido sale
	// del store (no de props), el caso dinamico vive aparte.
	it('AvisoVisible con error: sin violaciones A/AA', async () => {
		instancia = mount(AvisoVisible, { target: document.body });
		flushSync();
		avisar('No se pudo importar', 'error');
		flushSync();
		const violaciones = await auditar();
		expect(violaciones, describirViolaciones(violaciones)).toEqual([]);
	});
});
