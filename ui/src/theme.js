// Thème clair/sombre de MangoOS.
// La valeur est appliquée sur <html data-theme="…"> et persistée dans
// localStorage. index.html l'applique déjà avant le premier rendu (anti-flash) ;
// ce module sert aux bascules à l'exécution.

const KEY = "mangoos.theme";

/** "dark" (défaut) ou "light", depuis localStorage. */
export function getTheme() {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Applique un thème (<html data-theme>) et le mémorise. */
export function setTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // localStorage indisponible (mode privé) → bascule volatile, sans casser.
  }
  return t;
}

/** Bascule clair ↔ sombre et renvoie le nouveau thème. */
export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}
