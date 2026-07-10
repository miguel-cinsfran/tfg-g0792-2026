// Tests de la rama de exportacion como ARCHIVO.
// Mockeamos @capacitor/filesystem y @capacitor/share para no depender
// de la capa nativa en Node; spy en document.createElement y
// URL.createObjectURL para la rama navegador.
//
// La decision de product: en APK el JSON sale como archivo adjunto
// (no como texto pegado), nombre segun docs/tecnico.md, en navegador
// se conserva la descarga como blob.

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const writeFileMock = vi.fn();
const getUriMock = vi.fn();
const shareMock = vi.fn();

vi.mock('@capacitor/core', () => ({
	Capacitor: { isNativePlatform: vi.fn() }
}));

vi.mock('@capacitor/filesystem', () => ({
	Filesystem: { writeFile: (...args: unknown[]) => writeFileMock(...args) },
	Directory: { Cache: 'CACHE' },
	Encoding: { UTF8: 'utf8' }
}));

vi.mock('@capacitor/share', () => ({
	Share: { share: (...args: unknown[]) => shareMock(...args) }
}));

import { Capacitor } from '@capacitor/core';
import { nombreArchivoExportacion, manejarExportar } from './compartir';

const AHORA = Date.UTC(2026, 5, 20, 12, 0, 0);

beforeEach(() => {
	writeFileMock.mockReset();
	getUriMock.mockReset();
	shareMock.mockReset();
	vi.mocked(Capacitor.isNativePlatform).mockReset();
});

describe('nombreArchivoExportacion', () => {
	it('formato calistenia-{nombre}-{YYYY-MM-DD}.json con la fecha en UTC', () => {
		expect(nombreArchivoExportacion('Miguel', AHORA)).toBe(
			'calistenia-miguel-2026-06-20.json'
		);
	});

	it('slug del nombre: lowercase, sin acentos, sin espacios, sin chars raros', () => {
		expect(nombreArchivoExportacion('  Miguel Ínsfran  ', AHORA)).toBe(
			'calistenia-miguel-insfran-2026-06-20.json'
		);
	});

	it('si el nombre queda vacio tras la limpieza, usa "usuario"', () => {
		expect(nombreArchivoExportacion('   ', AHORA)).toBe(
			'calistenia-usuario-2026-06-20.json'
		);
	});

	it('corta el nombre a 30 chars para no hacer filename gigante', () => {
		const largo = 'a'.repeat(50);
		const nombre = nombreArchivoExportacion(largo, AHORA);
		const slug = nombre.split('-')[1];
		expect(slug.length).toBeLessThanOrEqual(30);
	});
});

describe('manejarExportar — rama APK (archivo + share)', () => {
	beforeEach(() => {
		vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
	});

	it('escribe el JSON a un archivo en Directory.Cache con encoding UTF8', async () => {
		writeFileMock.mockResolvedValue({ uri: 'file:///cache/calistenia-miguel-2026-06-20.json' });
		shareMock.mockResolvedValue({ activityType: undefined });

		await manejarExportar('{"version":1}', 'Miguel', AHORA);

		expect(writeFileMock).toHaveBeenCalledOnce();
		const opciones = writeFileMock.mock.calls[0][0] as {
			path: string;
			data: string;
			directory: string;
			encoding: string;
		};
		expect(opciones.path).toBe('calistenia-miguel-2026-06-20.json');
		expect(opciones.data).toBe('{"version":1}');
		expect(opciones.directory).toBe('CACHE');
		expect(opciones.encoding).toBe('utf8');
	});

	it('comparte la URI del archivo (no el texto) con @capacitor/share', async () => {
		const uri = 'file:///cache/calistenia-miguel-2026-06-20.json';
		writeFileMock.mockResolvedValue({ uri });
		shareMock.mockResolvedValue({ activityType: undefined });

		await manejarExportar('{"version":1}', 'Miguel', AHORA);

		expect(shareMock).toHaveBeenCalledOnce();
		const opciones = shareMock.mock.calls[0][0] as {
			title: string;
			url: string;
			text: string;
		};
		// title lleva el nombre del archivo (asi el chooser del sistema
		// muestra algo legible al usuario).
		expect(opciones.title).toBe('calistenia-miguel-2026-06-20.json');
		// url lleva la URI que devolvio writeFile: asi llega como adjunto.
		expect(opciones.url).toBe(uri);
		// text vacio: el JSON va como archivo, no como cuerpo.
		expect(opciones.text).toBe('');
	});

	it('propaga el error si writeFile falla', async () => {
		writeFileMock.mockRejectedValue(new Error('disco lleno'));
		await expect(manejarExportar('{}', 'Miguel', AHORA)).rejects.toThrow('disco lleno');
		expect(shareMock).not.toHaveBeenCalled();
	});

	it('propaga el error si share falla (writeFile ya escribio el archivo)', async () => {
		writeFileMock.mockResolvedValue({ uri: 'file:///cache/x.json' });
		shareMock.mockRejectedValue(new Error('usuario cancelo'));
		await expect(manejarExportar('{}', 'Miguel', AHORA)).rejects.toThrow(
			'usuario cancelo'
		);
	});
});

describe('manejarExportar — rama navegador (blob + descarga)', () => {
	beforeEach(() => {
		vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
		// jsdom ya existe por el archivo adyacente (este test corre en
		// jsdom via @vitest-environment de los demas tests; lo dejamos
		// explicito aca).
	});

	it('crea un blob application/json, un enlace con download y dispara click', async () => {
		const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
		const revokeObjectURL = vi.fn();
		const click = vi.fn();

		// Capturamos el enlace creado por la rama de descarga para
		// inspeccionarlo. Reemplazamos `document.createElement('a')`
		// por un mock que devuelve un objeto con la API minima que el
		// codigo usa (href, download, click). Capturamos la referencia
		// original ANTES de instalar el spy para no entrar en recursion.
		const originalCreateElement = document.createElement.bind(document);
		const enlaceCapturado: { href: string; download: string; click: () => void } = {
			href: '',
			download: '',
			click
		};
		const createElementSpy = vi
			.spyOn(document, 'createElement')
			.mockImplementation((tag: string) => {
				if (tag === 'a') return enlaceCapturado as unknown as HTMLAnchorElement;
				return originalCreateElement(tag);
			});
		const urlSpy = vi
			.spyOn(URL, 'createObjectURL')
			.mockImplementation(createObjectURL);
		const revokeSpy = vi
			.spyOn(URL, 'revokeObjectURL')
			.mockImplementation(revokeObjectURL);

		await manejarExportar('{"version":1}', 'Miguel', AHORA);

		// No se toco la capa nativa: en navegador no hay ni Filesystem
		// ni Share.
		expect(writeFileMock).not.toHaveBeenCalled();
		expect(shareMock).not.toHaveBeenCalled();

		expect(createObjectURL).toHaveBeenCalledOnce();
		const blob = createObjectURL.mock.calls[0][0] as Blob;
		expect(blob).toBeInstanceOf(Blob);
		expect(blob.type).toBe('application/json');

		expect(click).toHaveBeenCalledOnce();
		expect(enlaceCapturado.download).toBe('calistenia-miguel-2026-06-20.json');
		expect(enlaceCapturado.href).toBe('blob:mock-url');

		expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

		urlSpy.mockRestore();
		revokeSpy.mockRestore();
		createElementSpy.mockRestore();
	});
});
