// La sesion y el onboarding son flujos lineales: ocultan la barra para
// que la accion primaria de avance viva en la `BarraAccion` al pie.
// La ayuda tambien: se entra desde config o desde el onboarding y se
// sale con atras; si tuviera barra, el atras del telefono la trataria
// como pestana y saltaria al inicio (perdiendo el flujo de origen).
export function esRutaConBarraDePestanas(pathname: string): boolean {
	if (pathname.startsWith('/onboarding')) return false;
	if (pathname.startsWith('/sesion')) return false;
	if (pathname.startsWith('/ayuda')) return false;
	return true;
}
