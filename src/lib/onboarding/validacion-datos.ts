// Validacion de datos personales del onboarding F-01.2. Funciones puras,
// sin I/O ni DOM.

/** Valida que el texto sea solo digitos 0-9. */
export function entero(texto: string): number | null {
	const limpio = texto.trim();
	if (!/^[0-9]+$/.test(limpio)) return null;
	return parseInt(limpio, 10);
}

// Parsea un numero con a lo sumo UN decimal opcional. Acepta coma o
// punto como separador. "66" / "66.8" / "66,8" validos; "66.85", "66.",
// "6.6.6", "abc", "" invalidos.
export function decimalUnaCifra(texto: string): number | null {
	const limpio = texto.trim();
	if (limpio === '') return null;
	if (!/^[0-9]+([.,][0-9])?$/.test(limpio)) return null;
	return Number(limpio.replace(',', '.'));
}

// Rango valido para los conteos de la evaluacion (reps y segundos).
const RANGO_CONTEO_MIN = 0;
const RANGO_CONTEO_MAX = 300;

// Reusado por las cuatro pantallas (push, pull, legs, core).
export function validarConteo(texto: string): boolean {
	const n = entero(texto);
	return n !== null && n >= RANGO_CONTEO_MIN && n <= RANGO_CONTEO_MAX;
}

/** Calcula la edad a partir del anio de nacimiento. */
export function edadDesdeAnio(anioNacimiento: number, anioActual: number): number {
	return anioActual - anioNacimiento;
}

/** Calcula el anio de nacimiento a partir de la edad. */
export function anioDesdeEdad(edad: number, anioActual: number): number {
	return anioActual - edad;
}

/** Valida que el nombre no este vacio (despues de trim). */
export function validarNombre(v: string): boolean {
	return v.trim().length > 0;
}

/** Valida que la edad sea un entero entre 14 y 100 inclusive. */
export function validarEdad(v: string): boolean {
	const n = entero(v);
	return n !== null && n >= 14 && n <= 100;
}

/** Valida que el peso sea un numero entre 20 y 300 con a lo sumo un decimal. */
export function validarPeso(v: string): boolean {
	const n = decimalUnaCifra(v);
	return n !== null && n >= 20 && n <= 300;
}

// La altura se escribe en metros ("1,60"), pero se acepta tambien en
// centimetros enteros ("160") para no castigar la costumbre. Los dos
// rangos no se solapan (1-2.3 vs 100-230), asi que no hay ambiguedad.
// Devuelve centimetros enteros, o null si no es valida.
export function alturaACm(texto: string): number | null {
	const limpio = texto.trim();
	if (!/^[0-9]+([.,][0-9]{1,2})?$/.test(limpio)) return null;
	const n = Number(limpio.replace(',', '.'));
	if (Number.isInteger(n) && n >= 100 && n <= 230) return n;
	if (n >= 1 && n <= 2.3) return Math.round(n * 100);
	return null;
}

/** Formatea centimetros como metros con coma: 175 -> "1,75". */
export function metrosDesdeCm(cm: number): string {
	return (cm / 100).toFixed(2).replace('.', ',');
}

/**
 * Valida que la altura sea vacia (opcional) o convertible a un valor
 * entre 100 y 230 cm (en metros o en centimetros).
 */
export function validarAltura(v: string): boolean {
	if (v.trim() === '') return true;
	return alturaACm(v) !== null;
}

/**
 * Normaliza un nombre: trim, colapsa espacios multiples, capitaliza
 * cada palabra. Ej: "  miguel   insfran " -> "Miguel Insfran".
 */
export function normalizarNombre(v: string): string {
	return v
		.trim()
		.replace(/\s+/g, ' ')
		.split(' ')
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
		.join(' ');
}

// Logica de la sub-pantalla "Cambiar mis datos" de Configuracion.
// Modulo puro: reusa las validaciones de arriba; el componente llama a
// `validarDatosEditados` para errores y foco, y a `armarParcheDatos` para
// construir el objeto que va a `actualizarPerfil`.

export interface ErroresDatos {
	nombre: string | null;
	edad: string | null;
	peso: string | null;
	altura: string | null;
}

export const ERRORES_VACIOS: ErroresDatos = {
	nombre: null,
	edad: null,
	peso: null,
	altura: null
};

export interface ResultadoValidacionDatos {
	valido: boolean;
	errores: ErroresDatos;
	// Foco al primer campo con error (mismo orden que el onboarding).
	primerError: 'nombre' | 'edad' | 'peso' | 'altura' | null;
}

export function validarDatosEditados(
	nombre: string,
	edad: string,
	peso: string,
	altura: string
): ResultadoValidacionDatos {
	const nombreValido = validarNombre(nombre);
	const edadValida = validarEdad(edad);
	const pesoValido = validarPeso(peso);
	const alturaValida = validarAltura(altura);

	const errores: ErroresDatos = {
		nombre: nombreValido ? null : 'Escribe tu nombre.',
		edad: edadValida ? null : 'Escribe tu edad en años, entre 14 y 100.',
		peso: pesoValido
			? null
			: 'Escribe tu peso en kilos, entre 20 y 300. Puedes usar un decimal para los gramos (por ejemplo 66.8).',
		altura: alturaValida
			? null
			: 'Escribe tu altura en metros (por ejemplo 1,60), o déjala vacía.'
	};

	if (nombreValido && edadValida && pesoValido && alturaValida) {
		return { valido: true, errores: ERRORES_VACIOS, primerError: null };
	}

	const primerError: 'nombre' | 'edad' | 'peso' | 'altura' = !nombreValido
		? 'nombre'
		: !edadValida
			? 'edad'
			: !pesoValido
				? 'peso'
				: 'altura';

	return { valido: false, errores, primerError };
}

export interface ParcheDatos {
	nombre: string;
	anio_nacimiento: number;
	peso_kg: number;
	altura_cm?: number;
}

export function armarParcheDatos(
	nombre: string,
	edad: string,
	peso: string,
	altura: string,
	anioActual: number
): ParcheDatos {
	const edadNum = entero(edad) as number;
	const pesoNum = decimalUnaCifra(peso) as number;
	const parche: ParcheDatos = {
		nombre: normalizarNombre(nombre),
		anio_nacimiento: anioDesdeEdad(edadNum, anioActual),
		peso_kg: pesoNum
	};
	// La altura es opcional: vacia -> no se incluye (Dexie hace merge y
	// conserva el valor previo). Para borrarla, el usuario pasa por
	// "Rehacer evaluacion", que es destructivo a proposito.
	if (altura.trim() !== '') {
		parche.altura_cm = alturaACm(altura) as number;
	}
	return parche;
}

// Carga los inputs desde el perfil. La edad se deriva del anio para que
// el usuario edite la edad (lo que conoce) y no un anio.
export function inputsDesdePerfil(
	perfil: { nombre: string; anio_nacimiento: number; peso_kg: number; altura_cm?: number },
	anioActual: number
): { nombre: string; edad: string; peso: string; altura: string } {
	// Decimal solo si el peso no es entero: "66.8" se mantiene, "70" no
	// agrega ".0" sobrante.
	const pesoStr = Number.isInteger(perfil.peso_kg)
		? perfil.peso_kg.toString()
		: String(perfil.peso_kg);
	return {
		nombre: perfil.nombre,
		edad: edadDesdeAnio(perfil.anio_nacimiento, anioActual).toString(),
		peso: pesoStr,
		// Se edita en metros, como se escribe.
		altura: perfil.altura_cm != null ? metrosDesdeCm(perfil.altura_cm) : ''
	};
}
