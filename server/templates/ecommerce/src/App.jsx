// Starter template: small e-commerce shop with a client-side cart
import { useMemo, useState } from "react";

const PRODUCTS = [
  { id: 1, emoji: "🎧", name: "Casque audio", price: 89.9 },
  { id: 2, emoji: "⌚", name: "Montre connectée", price: 149.0 },
  { id: 3, emoji: "📷", name: "Appareil photo", price: 329.0 },
  { id: 4, emoji: "🎒", name: "Sac à dos urbain", price: 59.5 },
  { id: 5, emoji: "🔊", name: "Enceinte portable", price: 74.9 },
  { id: 6, emoji: "💡", name: "Lampe design", price: 39.0 },
  { id: 7, emoji: "☕", name: "Machine à café", price: 119.0 },
  { id: 8, emoji: "🖱️", name: "Souris sans fil", price: 29.9 },
];

const fmt = (n) => n.toFixed(2).replace(".", ",") + " €";

export default function App() {
  const [cart, setCart] = useState({}); // productId -> quantity
  const [cartOpen, setCartOpen] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const count = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const total = useMemo(
    () =>
      Object.entries(cart).reduce(
        (sum, [id, qty]) => sum + PRODUCTS.find((p) => p.id === Number(id)).price * qty,
        0,
      ),
    [cart],
  );

  const add = (id) => {
    setOrdered(false);
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  };
  const remove = (id) =>
    setCart((c) => {
      const next = { ...c };
      if (next[id] > 1) next[id] -= 1;
      else delete next[id];
      return next;
    });

  return (
    <div className="shop">
      <header className="shop-header">
        <span className="shop-brand">🛍️ Ma Boutique</span>
        <button className="cart-btn" onClick={() => setCartOpen((o) => !o)}>
          🛒 Panier{count > 0 && <span className="cart-count">{count}</span>}
        </button>
      </header>

      <main className="shop-main">
        <section className="products">
          <h1>Nos produits</h1>
          <div className="product-grid">
            {PRODUCTS.map((p) => (
              <article key={p.id} className="product">
                <span className="product-img">{p.emoji}</span>
                <h3>{p.name}</h3>
                <span className="product-price">{fmt(p.price)}</span>
                <button className="add-btn" onClick={() => add(p.id)}>
                  Ajouter au panier
                </button>
              </article>
            ))}
          </div>
        </section>

        {cartOpen && (
          <aside className="cart">
            <h2>Votre panier</h2>
            {count === 0 ? (
              <p className="cart-empty">{ordered ? "✅ Commande confirmée, merci !" : "Le panier est vide."}</p>
            ) : (
              <>
                <ul className="cart-lines">
                  {Object.entries(cart).map(([id, qty]) => {
                    const p = PRODUCTS.find((x) => x.id === Number(id));
                    return (
                      <li key={id} className="cart-line">
                        <span className="cart-line-name">{p.emoji} {p.name}</span>
                        <span className="cart-line-qty">
                          <button onClick={() => remove(p.id)}>−</button>
                          {qty}
                          <button onClick={() => add(p.id)}>+</button>
                        </span>
                        <span className="cart-line-price">{fmt(p.price * qty)}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="cart-total">
                  <span>Total</span>
                  <strong>{fmt(total)}</strong>
                </div>
                <button
                  className="order-btn"
                  onClick={() => {
                    setCart({});
                    setOrdered(true);
                  }}
                >
                  Commander
                </button>
              </>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}
