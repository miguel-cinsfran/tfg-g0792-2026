export const prerender = false;
export const ssr = false;

export async function load(): Promise<{
	perfil?: import('$lib/motor/schema').Perfil | null;
	error?: string;
}> {
	try {
		const { iniciarApp } = await import('$lib/bootstrap');
		return await iniciarApp();
	} catch (e) {
		// Un error sin code no es ninguno de los ERR-BOOT-* conocidos
		// (ADR-0008): se reporta generico, no disfrazado de error de
		// catalogo. mensajePara ya muestra el codigo crudo en su fallback.
		const code = (e as { code?: string }).code ?? 'ERR-BOOT-DESCONOCIDO';
		return { error: code };
	}
}
