// Sentido del desplazamiento entre rutas. Entre pestanas el cambio es
// directo; volver desliza al reves. La marca la pone BotonVolver: su
// goto es un volver aunque el tipo de navegacion sea 'goto' (el atras
// del telefono tambien pasa por ese manejador).
export type SentidoTransicion = 'ninguna' | 'adelante' | 'atras';

const PESTANAS_RAIZ: readonly string[] = ['/', '/biblioteca', '/progreso', '/perfil'];

let proximaEsVolver = false;

export function marcarProximaComoVolver(): void {
	proximaEsVolver = true;
}

export function consumirMarcaVolver(): boolean {
	const marcada = proximaEsVolver;
	proximaEsVolver = false;
	return marcada;
}

export function decidirTransicion(
	origen: string | null,
	destino: string | null,
	tipo: string,
	esVolver: boolean,
): SentidoTransicion {
	if (esVolver || tipo === 'popstate') return 'atras';
	if (origen !== null && PESTANAS_RAIZ.includes(origen) && destino !== null && PESTANAS_RAIZ.includes(destino)) {
		return 'ninguna';
	}
	return 'adelante';
}
