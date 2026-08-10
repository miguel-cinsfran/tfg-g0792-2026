export type FamiliaConsejo = 'tecnica' | 'uso_app';

export interface Consejo {
	id: string;
	familia: FamiliaConsejo;
	texto: string;
	// Solo en la familia tecnica: id del ejercicio de catalogo.json cuya
	// descripcion respalda el texto.
	fuente?: string;
}

// Regla dura: los textos de tecnica repiten literalmente una afirmacion de
// la descripcion del ejercicio citado en fuente; los de uso_app se
// verifican leyendo la app. La salud queda fuera del pool.
export const CONSEJOS: Consejo[] = [
	{
		id: 'tec-01',
		familia: 'tecnica',
		texto: 'El trabajo se nota en el pecho y los hombros, no en la parte baja de la espalda.',
		fuente: 'ej-001-push-h-flexion-pared',
	},
	{
		id: 'tec-02',
		familia: 'tecnica',
		texto: 'Las rodillas siguen la línea de los pies, ni hacia adentro ni hacia afuera.',
		fuente: 'ej-040-squat-sentadilla',
	},
	{
		id: 'tec-03',
		familia: 'tecnica',
		texto: 'El empuje sale de los talones y los glúteos, no de arquear la espalda.',
		fuente: 'ej-051-hinge-puente-gluteos',
	},
	{
		id: 'uso-01',
		familia: 'uso_app',
		texto: 'Cada pantalla anuncia su nombre al abrirse.',
	},
	{
		id: 'uso-02',
		familia: 'uso_app',
		texto: 'Al cambiar de pantalla, el foco va al título.',
	},
	{
		id: 'uso-03',
		familia: 'uso_app',
		texto: 'Borrar todo no apaga la música ni el sonido.',
	},
];
