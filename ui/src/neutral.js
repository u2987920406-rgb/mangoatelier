// Mode neutre (Phase B) — interrupteur unique qui retire le vocabulaire interne
// de l'UI pour les bêta-testeurs, sans rien changer à l'usage perso (Phase A).
//
// Activation : poser VITE_NEUTRAL_MODE=1 dans ui/.env (ou .env.local) puis
// rebuild. Par DÉFAUT (variable absente) NEUTRAL = false → l'UI riche actuelle
// (Élève/Maître/axiomes/clapet) est strictement inchangée.
export const NEUTRAL = import.meta.env.VITE_NEUTRAL_MODE === "1";

// Helper de libellé ponctuel : renvoie le terme interne en Phase A, le terme
// produit neutre en Phase B. Ex. t("Élève local", "Local").
export const t = (internalLabel, neutralLabel) => (NEUTRAL ? neutralLabel : internalLabel);
