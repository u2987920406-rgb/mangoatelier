export default function Preview({ url, reloadKey }) {
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
      {url ? (
        <iframe key={`${url}-${reloadKey}`} src={url} title="Aperçu de l'app générée" />
      ) : (
        <div className="preview-empty">🖥️ L'aperçu de ton app s'affichera ici</div>
      )}
    </section>
  );
}
