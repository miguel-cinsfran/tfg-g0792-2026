// Logica de exportacion como archivo. Modulo puro en su mayor parte: arma
// el nombre del archivo y expone dos funciones para las dos ramas
// (nativa / navegador). El handler de Configuracion las orquesta.
//
// Nombre: `calistenia-{nombre}-{YYYY-MM-DD}.json`, fecha UTC, `ahora`
// por argumento para tests deterministas.

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function slugNombre(nombre: string): string {
	const sinAcentos = nombre
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	const limpio = sinAcentos
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return limpio === '' ? 'usuario' : limpio.slice(0, 30);
}

export function nombreArchivoExportacion(
	nombrePerfil: string,
	ahora: number
): string {
	const fecha = new Date(ahora);
	const yyyy = fecha.getUTCFullYear().toString().padStart(4, '0');
	const mm = (fecha.getUTCMonth() + 1).toString().padStart(2, '0');
	const dd = fecha.getUTCDate().toString().padStart(2, '0');
	return `calistenia-${slugNombre(nombrePerfil)}-${yyyy}-${mm}-${dd}.json`;
}

// Rama APK: escribe a Directory.Cache (puede limpiarse en low memory,
// fine para un export) y comparte la URI con @capacitor/share. El usuario
// lo recibe como adjunto, no como texto pegado.
export async function compartirComoArchivo(
	json: string,
	nombrePerfil: string,
	ahora: number
): Promise<void> {
	const path = nombreArchivoExportacion(nombrePerfil, ahora);
	const resultado = await Filesystem.writeFile({
		path,
		data: json,
		directory: Directory.Cache,
		encoding: Encoding.UTF8
	});
	await Share.share({
		title: path,
		url: resultado.uri,
		text: ''
	});
}

// Rama navegador: descarga como blob.
export function descargarComoBlob(json: string, nombreArchivo: string): void {
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const enlace = document.createElement('a');
	enlace.href = url;
	enlace.download = nombreArchivo;
	enlace.click();
	URL.revokeObjectURL(url);
}

// Detecta plataforma y delega. Permanece aca para que el handler de la
// UI sea un one-liner.
export async function manejarExportar(
	json: string,
	nombrePerfil: string,
	ahora: number
): Promise<void> {
	if (Capacitor.isNativePlatform()) {
		await compartirComoArchivo(json, nombrePerfil, ahora);
	} else {
		descargarComoBlob(json, nombreArchivoExportacion(nombrePerfil, ahora));
	}
}
