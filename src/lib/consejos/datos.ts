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
		id: 'uso-01',
		familia: 'uso_app',
		texto: 'Cada pantalla anuncia su nombre al abrirse.'
	},
	{
		id: 'uso-02',
		familia: 'uso_app',
		texto: 'Al cambiar de pantalla, el foco va al título.'
	},
	{
		id: 'uso-03',
		familia: 'uso_app',
		texto: 'La música y los efectos tienen volúmenes separados.'
	},
	{
		id: 'uso-04',
		familia: 'uso_app',
		texto: 'Todo funciona sin conexión: tus datos no salen del teléfono.'
	},
	{
		id: 'uso-05',
		familia: 'uso_app',
		texto: 'Después de terminar una serie puedes corregir la cantidad.'
	},
	{
		id: 'uso-06',
		familia: 'uso_app',
		texto: 'Si aparece dolor en un ejercicio, la sesión te ofrece otro en su lugar.'
	},
	{
		id: 'uso-07',
		familia: 'uso_app',
		texto: 'La racha cuenta semanas completas, no días seguidos.'
	},
	{
		id: 'uso-08',
		familia: 'uso_app',
		texto: 'Puedes guardar una copia de tus datos desde Configuración y volver a cargarla.'
	},
	{
		id: 'uso-09',
		familia: 'uso_app',
		texto: 'En la portada, el botón atrás pide una segunda vez para salir.'
	},
	{
		id: 'uso-10',
		familia: 'uso_app',
		texto: 'Los consejos se apagan desde Configuración.'
	}
];
