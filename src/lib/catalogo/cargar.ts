import { CatalogoSchema } from './schema';
import { establecerCatalogo } from './estado';
import { crearError } from '$lib/errores/crear';
import { ZodError } from 'zod';

export function popularCatalogo(catalogoRaw: unknown): void {
	let parsedCatalogo;
	try {
		parsedCatalogo = CatalogoSchema.parse(catalogoRaw);
	} catch (zodError) {
		if (zodError instanceof ZodError) {
			const path = zodError.issues[0]?.path.join('.') ?? '(raíz)';
			throw crearError(
				'ERR-BOOT-CATALOGO',
				`Catálogo inválido: ${path}`,
				zodError,
			);
		}
		throw zodError;
	}
	establecerCatalogo(parsedCatalogo.ejercicios);
}