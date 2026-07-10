// crearError: construye un Error nativo con `code` y opcional `causa`.

export function crearError(code: string, mensaje?: string, causa?: unknown): Error {
	const err = new Error(mensaje ?? code);
	(err as Error & { code: string }).code = code;
	if (causa !== undefined) {
		(err as Error & { causa: unknown }).causa = causa;
	}
	return err;
}
