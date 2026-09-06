export type Tema = 'claro' | 'oscuro'

const CLAVE = 'becario:tema'

/** El tema vive en <html data-tema>; index.html lo aplica antes del primer pintado. */
export function temaActual(): Tema {
  return document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro'
}

export function ponerTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema
  localStorage.setItem(CLAVE, tema)
}
