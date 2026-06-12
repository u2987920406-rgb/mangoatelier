export default function Preview({ url, reloadKey, errors = [], onFix }) {
  return (
    <section className="preview">
      <div className="preview-bar">
        <span className={`dot ${url ? "on" : ""}`} />
        <span className="preview-url">{url ?? "Aucun aperçu — envoie un premier message"}</span>
        {url && (
          <a className="open-link" href={url} target="_blank" rel="noreferrer">
            Ouvrir ↗
          </a>
        )}
      </div>
      {errors.length > 0 && (
        <div className="preview-errors">
          <span className="preview-errors-text">
            ⚠ {errors.length} erreur{errors.length > 1 ? "s" : ""} détectée
            {errors.length > 1 ? "s" : ""} — {errors[0]}
          </span>
          <button className="fix-btn" onClick={onFix}>
            🔧 Corriger
          </button>
        </div>
      )}
      {url ? (
        <iframe key={`${url}-${reloadKey}`} src={url} title="Aperçu de l'app générée" />
      ) : (
        <div className="preview-empty">🖥️ L'aperçu de ton app s'affichera ici</div>
      )}
    </section>
  );
}
