// Default encendido (la musica es opt-in): en una app screen-reader-first, contenido sin anuncio seria invisible.

const CLAVE_ACTIVADOS = 'consejos-activados';
const CLAVE_ANUNCIAR = 'consejos-anunciar';
const CLAVE_MOSTRADOS = 'consejos-mostrados';
const CLAVE_ARRANQUES = 'consejos-arranques';

export function consejosActivados(): boolean {
	try {
		return localStorage.getItem(CLAVE_ACTIVADOS) !== '0';
	} catch {
		return true;
	}
}

export function establecerConsejosActivados(activado: boolean): void {
	try {
		localStorage.setItem(CLAVE_ACTIVADOS, activado ? '1' : '0');
	} catch {
		// sin storage la preferencia no persiste
	}
}

export function anuncioConsejoActivado(): boolean {
	try {
		return localStorage.getItem(CLAVE_ANUNCIAR) !== '0';
	} catch {
		return true;
	}
}

export function establecerAnuncioConsejoActivado(activado: boolean): void {
	try {
		localStorage.setItem(CLAVE_ANUNCIAR, activado ? '1' : '0');
	} catch {
		// sin storage la preferencia no persiste
	}
}

export function leerMostrados(): string[] {
	try {
		const crudo = localStorage.getItem(CLAVE_MOSTRADOS);
		if (crudo === null) return [];
		const parsed: unknown = JSON.parse(crudo);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((x): x is string => typeof x === 'string');
	} catch {
		return [];
	}
}

export function guardarMostrados(ids: string[]): void {
	try {
		localStorage.setItem(CLAVE_MOSTRADOS, JSON.stringify(ids));
	} catch {
		// sin storage el pool no persiste
	}
}

export function incrementarContadorArranques(): number {
	try {
		const crudo = localStorage.getItem(CLAVE_ARRANQUES);
		const previo = crudo === null ? 0 : Number(crudo);
		const base = Number.isInteger(previo) && previo >= 0 ? previo : 0;
		const nuevo = base + 1;
		localStorage.setItem(CLAVE_ARRANQUES, String(nuevo));
		return nuevo;
	} catch {
		return 0;
	}
}

export function leerContadorArranques(): number {
	try {
		const crudo = localStorage.getItem(CLAVE_ARRANQUES);
		if (crudo === null) return 0;
		const n = Number(crudo);
		return Number.isInteger(n) && n >= 0 ? n : 0;
	} catch {
		return 0;
	}
}
