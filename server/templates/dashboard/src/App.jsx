// Starter template: admin dashboard with stats, chart and table
const STATS = [
  { label: "Chiffre d'affaires", value: "24 580 €", delta: "+12,4 %", up: true },
  { label: "Commandes", value: "356", delta: "+8,1 %", up: true },
  { label: "Nouveaux clients", value: "64", delta: "−2,3 %", up: false },
  { label: "Taux de conversion", value: "3,9 %", delta: "+0,4 pt", up: true },
];

const WEEK = [
  { day: "Lun", value: 42 },
  { day: "Mar", value: 65 },
  { day: "Mer", value: 51 },
  { day: "Jeu", value: 78 },
  { day: "Ven", value: 95 },
  { day: "Sam", value: 88 },
  { day: "Dim", value: 36 },
];

const ORDERS = [
  { id: "#1042", client: "Marie Dupont", amount: "129,00 €", status: "Livrée" },
  { id: "#1041", client: "Karim Benali", amount: "89,90 €", status: "En cours" },
  { id: "#1040", client: "Sophie Martin", amount: "245,50 €", status: "En cours" },
  { id: "#1039", client: "Lucas Bernard", amount: "59,00 €", status: "Annulée" },
  { id: "#1038", client: "Emma Petit", amount: "312,00 €", status: "Livrée" },
];

const max = Math.max(...WEEK.map((d) => d.value));

export default function App() {
  return (
    <div className="dash">
      <aside className="sidebar">
        <span className="dash-brand">📊 Pilotage</span>
        <nav>
          <a className="active" href="#">Vue d'ensemble</a>
          <a href="#">Commandes</a>
          <a href="#">Clients</a>
          <a href="#">Produits</a>
          <a href="#">Paramètres</a>
        </nav>
      </aside>

      <main className="dash-main">
        <header className="dash-top">
          <h1>Vue d'ensemble</h1>
          <span className="dash-period">7 derniers jours</span>
        </header>

        <section className="stat-grid">
          {STATS.map((s) => (
            <article key={s.label} className="stat-card">
              <span className="stat-label">{s.label}</span>
              <strong className="stat-value">{s.value}</strong>
              <span className={`stat-delta ${s.up ? "up" : "down"}`}>{s.delta}</span>
            </article>
          ))}
        </section>

        <section className="panel">
          <h2>Ventes de la semaine</h2>
          <div className="chart">
            {WEEK.map((d) => (
              <div key={d.day} className="chart-col">
                <span className="chart-value">{d.value}</span>
                <div className="chart-bar" style={{ height: `${(d.value / max) * 100}%` }} />
                <span className="chart-day">{d.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Dernières commandes</h2>
          <table className="orders">
            <thead>
              <tr>
                <th>N°</th>
                <th>Client</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {ORDERS.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.client}</td>
                  <td>{o.amount}</td>
                  <td>
                    <span className={`badge badge-${o.status === "Livrée" ? "ok" : o.status === "En cours" ? "wip" : "ko"}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
