import { useState } from "react";
import { Button } from "./components/ui/button.jsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card.jsx";
import { Input } from "./components/ui/input.jsx";
import { Badge } from "./components/ui/badge.jsx";

// ─── App de démo shadcn/ui ────────────────────────────────────────────────────
// Supprime ce fichier et construis ton app ici.
// Les composants ui/ sont prêts à l'emploi — Button, Card, Input, Badge.
// Ajoute d'autres composants shadcn selon le besoin (Dialog, Select, Table…).

export default function App() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-8">

        {/* En-tête */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Mon App</h1>
            <Badge>shadcn/ui</Badge>
            <Badge variant="secondary">Tailwind v4</Badge>
          </div>
          <p className="text-muted-foreground">
            Décris ton app dans le chat — les composants Button, Card, Input et Badge sont prêts.
          </p>
        </div>

        {/* Carte principale */}
        <Card>
          <CardHeader>
            <CardTitle>Démarrer</CardTitle>
            <CardDescription>
              Ce template inclut les composants shadcn/ui les plus courants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="toi@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setSubmitted(true)} disabled={!email.trim()}>
                S'inscrire
              </Button>
              <Button variant="outline" onClick={() => { setEmail(""); setSubmitted(false); }}>
                Effacer
              </Button>
              <Button variant="ghost">Annuler</Button>
              <Button variant="destructive" size="sm">Supprimer</Button>
            </div>
            {submitted && (
              <p className="text-sm text-muted-foreground">
                ✓ Inscrit avec <strong>{email}</strong>
              </p>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Les données restent locales — aucun serveur.
          </CardFooter>
        </Card>

        {/* Grille de variants */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { variant: "default",     label: "Default" },
            { variant: "secondary",   label: "Secondary" },
            { variant: "outline",     label: "Outline" },
            { variant: "destructive", label: "Destructive" },
          ].map(({ variant, label }) => (
            <Card key={variant} className="p-4 text-center">
              <Badge variant={variant} className="mb-3">{label}</Badge>
              <p className="text-xs text-muted-foreground">Badge + Card</p>
            </Card>
          ))}
        </div>

      </div>
    </div>
  );
}
