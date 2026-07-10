// @vitest-environment jsdom
//
// Tests del control de importacion de respaldo. Cubre: render del
// control, deshabilitado inicial, happy path con importarDatos mockeado,
// error de JSON invalido, error de Exporte invalido. La lectura del File
// se hace con Object.defineProperty sobre el input ya montado (jsdom no
// expone DataTransfer y `files` es read-only). importarDatos se mockea
// para no depender de Dexie en el test del componente (la logica de la
// funcion vive en su propio test).
//
// El componente migro de `anunciarPolite/Assertive` a `avisar` (un
// canal unico lector + pantalla). Se mockea `avisar` directamente. El
// aviso visible NO se monta en este test (vive en el layout); la
// verificacion del canal visible se hace en
// `src/lib/a11y/AvisoVisible.test.ts`.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ImportarRespaldo from './ImportarRespaldo.svelte';

const importarDatosMock = vi.fn();
const avisarMock = vi.fn();

vi.mock('$lib/importar/importar', () => ({
	importarDatos: (...args: unknown[]) => importarDatosMock(...args)
}));

vi.mock('$lib/a11y/avisar.svelte', () => ({
	avisar: (...args: unknown[]) => avisarMock(...args)
}));

import { mensajePara } from '$lib/errores/mensajes';

function instalarSetearArchivos(input: HTMLInputElement): (file: File | null) => void {
	// jsdom declara `files` como read-only en HTMLInputElement.
	// Reemplazamos el accessor por uno propio que guarda un array
	// plano; asi `bind:files` puede asignar y `input.files` queda
	// legible. Disparamos un `change` sintetico para que Svelte
	// re-lea la propiedad.
	let _files: File[] | null = null;
	Object.defineProperty(input, 'files', {
		get: () => _files,
		set: (v: FileList | File[] | null) => {
			_files = v === null ? null : Array.from(v as ArrayLike<File>);
		},
		configurable: true
	});
	return (file) => {
		// Cast: el setter propio acepta File[] aunque el tipo DOM diga
		// FileList; es exactamente lo que Svelte 5 asigna en el bind.
		(input as unknown as { files: File[] | null }).files = file ? [file] : null;
		input.dispatchEvent(new Event('change', { bubbles: true }));
	};
}

describe('ImportarRespaldo', () => {
	let instancia: ReturnType<typeof mount> | undefined;

	beforeEach(() => {
		document.body.innerHTML = '';
		importarDatosMock.mockReset();
		avisarMock.mockReset();
	});

	afterEach(() => {
		if (instancia) unmount(instancia);
		instancia = undefined;
	});

	it('renderiza label, input file y boton', () => {
		instancia = mount(ImportarRespaldo, {
			target: document.body,
			props: { onImportado: () => {} }
		});
		flushSync();

		const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
		expect(input).not.toBeNull();
		// octet-stream: el selector de Android esconde .json con MIME
		// generico si solo se acepta application/json.
		expect(input.getAttribute('accept')).toBe('application/json,application/octet-stream,.json');
		const label = document.body.querySelector(`label[for="${input.id}"]`) as HTMLLabelElement;
		expect(label).not.toBeNull();
		expect(label.textContent).toBe('Archivo de exportación (.json)');

		const boton = document.body.querySelector('button') as HTMLButtonElement;
		expect(boton).not.toBeNull();
		expect(boton.textContent?.trim()).toBe('Importar y reemplazar mis datos');
		// Siempre pulsable: la validacion de archivo es al pulsar.
		expect(boton.disabled).toBe(false);
	});

	it('etiquetaBoton custom sobreescribe el default', () => {
		instancia = mount(ImportarRespaldo, {
			target: document.body,
			props: { onImportado: () => {}, etiquetaBoton: 'Recuperar mis datos' }
		});
		flushSync();

		const boton = document.body.querySelector('button') as HTMLButtonElement;
		expect(boton.textContent?.trim()).toBe('Recuperar mis datos');
	});

	it('pulsar sin archivo avisa el error y no importa nada', async () => {
		const onImportado = vi.fn();
		instancia = mount(ImportarRespaldo, {
			target: document.body,
			props: { onImportado }
		});
		flushSync();

		const boton = document.body.querySelector('button') as HTMLButtonElement;
		boton.click();
		for (let i = 0; i < 10; i++) await Promise.resolve();
		flushSync();

		expect(importarDatosMock).not.toHaveBeenCalled();
		expect(onImportado).not.toHaveBeenCalled();
		expect(avisarMock).toHaveBeenCalledWith('Elige primero el archivo de exportación.', 'error');
	});

	it('cada instancia recibe un id unico en el input', () => {
		// El componente deriva el id con un contador de modulo. Aunque
		// los dos casos que existen (config y bienvenida) no coexisten,
		// verificamos la robustez montando dos instancias en el mismo
		// tick antes de desmontar.
		const a = mount(ImportarRespaldo, {
			target: document.body,
			props: { onImportado: () => {} }
		});
		flushSync();
		const idA = (document.body.querySelector('input[type="file"]') as HTMLInputElement).id;

		const b = mount(ImportarRespaldo, {
			target: document.body,
			props: { onImportado: () => {} }
		});
		flushSync();
		const inputs = document.body.querySelectorAll('input[type="file"]');
		expect(inputs.length).toBe(2);
		const idB = (inputs[1] as HTMLInputElement).id;
		expect(idA).not.toBe(idB);

		unmount(a);
		unmount(b);
		instancia = undefined;
	});

	it('happy path: importa y llama onImportado, sin anuncio de error', async () => {
		const onImportado = vi.fn();
		importarDatosMock.mockResolvedValueOnce(undefined);

		instancia = mount(ImportarRespaldo, {
			target: document.body,
			props: { onImportado }
		});
		flushSync();

		const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
		const setArchivos = instalarSetearArchivos(input);
		const boton = document.body.querySelector('button') as HTMLButtonElement;

		const json = JSON.stringify({ version: 1, perfil: null, estado_ejercicios: [], sesiones: [], historial_dolor: [] });
		const file = new File([json], 'respaldo.json', { type: 'application/json' });
		setArchivos(file);
		flushSync();

		boton.click();
		// esperar a que la promesa del handler se resuelva: hay dos
		// awaits encadenados (f.text() y luego importarDatos), asi que
		// necesitamos varios microticks.
		for (let i = 0; i < 10; i++) await Promise.resolve();
		flushSync();

		expect(importarDatosMock).toHaveBeenCalledOnce();
		const pasado = importarDatosMock.mock.calls[0][0] as Record<string, unknown>;
		expect(pasado['version']).toBe(1);
		expect(onImportado).toHaveBeenCalledOnce();
		expect(avisarMock).toHaveBeenCalledWith('Datos importados', 'exito');
		// Solo una llamada: la de exito. La region aria-live la usa
		// internamente `avisar` (el modulo real), asi que no se llama
		// `anunciarPolite` ni `anunciarAssertive` directamente desde
		// este componente.
		expect(avisarMock).toHaveBeenCalledTimes(1);
	});

	it('JSON invalido: muestra error traducido, NO llama onImportado', async () => {
		const onImportado = vi.fn();
		importarDatosMock.mockResolvedValueOnce(undefined);

		instancia = mount(ImportarRespaldo, {
			target: document.body,
			props: { onImportado }
		});
		flushSync();

		const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
		const setArchivos = instalarSetearArchivos(input);
		const boton = document.body.querySelector('button') as HTMLButtonElement;

		// "esto no es json" -> JSON.parse lanza -> catch -> ERR-IMPORT-INVALID
		const file = new File(['esto no es json'], 'roto.json', { type: 'application/json' });
		setArchivos(file);
		flushSync();
		boton.click();
		for (let i = 0; i < 10; i++) await Promise.resolve();
		flushSync();

		expect(importarDatosMock).not.toHaveBeenCalled();
		expect(onImportado).not.toHaveBeenCalled();
		const errorEsperado = mensajePara('ERR-IMPORT-INVALID');
		// El error ya NO se renderiza inline: el aviso visible es el
		// canal unico. Verificamos que `avisar` lo recibio con tipo
		// 'error'.
		expect(avisarMock).toHaveBeenCalledWith(errorEsperado, 'error');
		expect(avisarMock).toHaveBeenCalledTimes(1);
	});

	it('Exporte invalido (Zod rechaza): muestra error del code y NO llama onImportado', async () => {
		const onImportado = vi.fn();
		importarDatosMock.mockRejectedValueOnce(
			Object.assign(new Error('Version'), { code: 'ERR-IMPORT-VERSION' })
		);

		instancia = mount(ImportarRespaldo, {
			target: document.body,
			props: { onImportado }
		});
		flushSync();

		const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
		const setArchivos = instalarSetearArchivos(input);
		const boton = document.body.querySelector('button') as HTMLButtonElement;

		const file = new File(['{"version":1}'], 'viejo.json', { type: 'application/json' });
		setArchivos(file);
		flushSync();
		boton.click();
		for (let i = 0; i < 10; i++) await Promise.resolve();
		flushSync();

		expect(importarDatosMock).toHaveBeenCalledOnce();
		expect(onImportado).not.toHaveBeenCalled();
		const errorEsperado = mensajePara('ERR-IMPORT-VERSION');
		expect(avisarMock).toHaveBeenCalledWith(errorEsperado, 'error');
		expect(avisarMock).toHaveBeenCalledTimes(1);
	});

	it('error sin code cae al fallback ERR-IMPORT-INVALID', async () => {
		const onImportado = vi.fn();
		importarDatosMock.mockRejectedValueOnce(new Error('revento'));

		instancia = mount(ImportarRespaldo, {
			target: document.body,
			props: { onImportado }
		});
		flushSync();

		const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
		const setArchivos = instalarSetearArchivos(input);
		const boton = document.body.querySelector('button') as HTMLButtonElement;

		const file = new File(['{}'], 'x.json', { type: 'application/json' });
		setArchivos(file);
		flushSync();
		boton.click();
		for (let i = 0; i < 10; i++) await Promise.resolve();
		flushSync();

		const errorEsperado = mensajePara('ERR-IMPORT-INVALID');
		expect(avisarMock).toHaveBeenCalledWith(errorEsperado, 'error');
		expect(avisarMock).toHaveBeenCalledTimes(1);
	});
});
