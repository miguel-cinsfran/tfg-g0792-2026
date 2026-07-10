// Descripciones propioceptivas para las 4 evaluaciones de F-01.7.
// Cada campo es una lista de pasos o claves cortas (mismo formato que el
// catalogo). Registro corto y no-visual, en tuteo neutro. El remo se hace en
// suspension, no bajo una mesa.
// PROVISIONAL: redaccion propia coherente con catalogo.json; falta la
// validacion del profesional de actividad fisica adaptada (deuda).

import type { DescripcionPropioceptiva } from '$lib/motor/schema';

export const DESCRIPCION_FLEXIONES: DescripcionPropioceptiva = {
	posicion_inicial: [
		'Apoya las manos en el suelo, un poco más abiertas que los hombros, y la punta de los pies atrás.',
		'Estira los brazos: el cuerpo queda en línea recta de la cabeza a los talones, con el abdomen y los glúteos firmes.',
	],
	ejecucion: [
		'Dobla los codos y baja el pecho hasta que quede a un puño del suelo.',
		'Empuja con las manos para subir.',
		'Cuenta cada repetición completa; sigue hasta que la forma se rompa.',
	],
	referencias_propioceptivas: [
		'El peso se reparte parejo en las dos manos.',
		'El trabajo se siente en el pecho y los brazos, no en la espalda baja.',
		'Apoya un puño bajo el pecho como tope: cuando el pecho lo roza, la repetición está.',
	],
	errores_comunes: [
		'Si la cadera cae y la espalda se arquea, aprieta el abdomen.',
		'Si bajas a medias o levantas el trasero para descansar, no cuenta la repetición.',
		'Si no sale ni una, usa el botón "No puedo": es un punto de partida válido.',
	],
};

export const DESCRIPCION_REMO_SUSPENSION: DescripcionPropioceptiva = {
	posicion_inicial: [
		'Cuelga una correa o unas anillas de un anclaje firme y tira fuerte antes para confirmar que aguanta tu peso.',
		'Toma un agarre con cada mano, al ancho de los hombros, con los brazos estirados.',
		'Estira las piernas con los talones en el suelo y el cuerpo recto, inclinado hacia atrás.',
	],
	ejecucion: [
		'Tira de los agarres y acerca el pecho a las manos, con los codos hacia atrás.',
		'Baja despacio hasta estirar los brazos.',
		'Cuenta cada vez que el pecho llega cerca de las manos; sigue hasta que la forma se rompa.',
	],
	referencias_propioceptivas: [
		'El trabajo se siente entre los omóplatos, no en el cuello.',
		'El cuerpo se mantiene recto; solo se mueven los brazos.',
		'Cuanto más adelantes los pies, más cuesta.',
	],
	errores_comunes: [
		'Si te impulsas con sacudidas o encoges los hombros hacia las orejas, frena y hazlo limpio.',
		'Si la cadera se hunde, aprieta los glúteos.',
		'Si no tienes anclaje o no sale ni una, usa "No puedo" y sigue con la evaluación.',
	],
};

export const DESCRIPCION_SENTADILLAS: DescripcionPropioceptiva = {
	posicion_inicial: [
		'De pie, los pies al ancho de las caderas con las puntas un poco hacia afuera.',
		'Reparte el peso entre el talón y la planta de cada pie. Espalda erguida, brazos al frente o cruzados sobre el pecho.',
	],
	ejecucion: [
		'Lleva la cadera hacia atrás y baja, como si te sentaras en una silla, hasta que los muslos queden cerca de la horizontal.',
		'Empuja con los pies para subir.',
		'Cuenta las repeticiones limpias; sigue hasta que la forma se rompa.',
	],
	referencias_propioceptivas: [
		'El peso se queda en toda la planta del pie, sin que las puntas carguen ni los talones se despeguen.',
		'Las rodillas siguen la línea de los pies.',
		'Para confirmar la profundidad, apoya una mano en el muslo: cuando queda horizontal, la repetición está.',
	],
	errores_comunes: [
		'Si te inclinas mucho hacia adelante o juntas las rodillas, corrige antes de seguir.',
		'Baja solo hasta donde la espalda se mantenga recta.',
		'Si no sale ni una, usa "No puedo": es un punto de partida válido.',
	],
};

export const DESCRIPCION_PLANCHA: DescripcionPropioceptiva = {
	posicion_inicial: [
		'Boca abajo, apoya los antebrazos en el suelo con los codos justo debajo de los hombros y la punta de los pies atrás.',
		'Levanta la cadera hasta que el cuerpo quede en línea recta de la cabeza a los talones.',
	],
	ejecucion: [
		'Mantente firme y respira normal mientras la app cuenta los segundos.',
		'La medición termina cuando la cadera cae o sube y ya no puedes volver a la línea.',
	],
	referencias_propioceptivas: [
		'El abdomen se siente activo y la espalda baja plana.',
		'Los hombros se mantienen lejos de las orejas.',
		'La respiración no se traba.',
	],
	errores_comunes: [
		'Si dejas caer la cadera arqueando la espalda o la subes en V, corrige o termina.',
		'No contengas el aire.',
		'Si no sale, usa "No puedo": es un punto de partida válido.',
	],
};
