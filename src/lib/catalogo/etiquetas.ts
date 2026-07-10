import type { Objetivo, Patron, TipoSesion, Zona } from '$lib/motor/schema';

const ETIQUETAS_PATRON: Record<Patron, string> = {
	PUSH_H: 'empuje horizontal',
	PUSH_V: 'empuje vertical',
	PULL_H: 'tracción horizontal',
	PULL_V: 'tracción vertical',
	SQUAT: 'sentadilla',
	HINGE: 'bisagra de cadera',
	UNILATERAL: 'unilateral',
	CORE: 'core',
};

export function etiquetaPatron(patron: Patron): string {
	return ETIQUETAS_PATRON[patron];
}

const ETIQUETAS_TIPO_SESION: Record<TipoSesion, string> = {
	FULL_BODY: 'Cuerpo completo',
	UPPER: 'Tren superior',
	LOWER: 'Tren inferior',
};

export function etiquetaTipoSesion(tipo: TipoSesion): string {
	return ETIQUETAS_TIPO_SESION[tipo];
}
const ETIQUETAS_ZONA: Record<Zona, string> = {
	hombros: 'Hombros',
	codos: 'Codos',
	muñecas: 'Muñecas',
	cuello: 'Cuello',
	lumbar: 'Lumbar',
	cadera: 'Cadera',
	rodillas: 'Rodillas',
	tobillos: 'Tobillos',
};

export function etiquetaZona(zona: Zona): string {
	return ETIQUETAS_ZONA[zona];
}

const ETIQUETAS_OBJETIVO: Record<Objetivo, string> = {
	fuerza: 'Fuerza',
	hipertrofia: 'Hipertrofia',
	resistencia: 'Resistencia muscular',
	perdida_peso: 'Pérdida de peso',
};

const DESCRIPCIONES_OBJETIVO: Record<Objetivo, string> = {
	fuerza: 'Levantar más peso',
	hipertrofia: 'Aumentar el tamaño muscular',
	resistencia: 'Sostener más repeticiones',
	perdida_peso: 'Gastar más calorías',
};

export function etiquetaObjetivo(objetivo: Objetivo): string {
	return ETIQUETAS_OBJETIVO[objetivo];
}

export function descripcionObjetivo(objetivo: Objetivo): string {
	return DESCRIPCIONES_OBJETIVO[objetivo];
}
