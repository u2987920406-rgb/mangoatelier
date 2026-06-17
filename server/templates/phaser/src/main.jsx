import Phaser from "phaser";

// ─── Scène principale ─────────────────────────────────────────────────────────
// C'est ici que vit la logique du jeu.
// Phaser découpe tout en Scènes : PreloadScene (assets) → MenuScene → GameScene →
// GameOverScene. Chaque scène est une classe avec preload() / create() / update().
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    // Charger les assets : images, spritesheets, tilemaps, audio.
    // Exemples :
    //   this.load.image("hero", "assets/hero.png");
    //   this.load.spritesheet("run", "assets/run.png", { frameWidth: 64, frameHeight: 64 });
    //   this.load.tilemapTiledJSON("map", "assets/level1.json");
    //   this.load.audio("music", "assets/music.ogg");
  }

  create() {
    const { width, height } = this.scale;

    // Fond dégradé
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f0f1a);

    // Titre
    this.add
      .text(width / 2, height / 2 - 60, "🎮 Mon Jeu Phaser", {
        fontSize: "36px",
        color: "#e94560",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Sous-titre
    this.add
      .text(width / 2, height / 2, "Décris ton jeu dans le chat →", {
        fontSize: "18px",
        color: "#a0a0c0",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Légende des capacités disponibles
    const features = [
      "✓ Physique arcade (gravité, collisions, plateformes)",
      "✓ Sprites & animations par frames",
      "✓ Tilemaps (niveaux Tiled JSON)",
      "✓ Audio (musique + effets sonores)",
      "✓ Entrées clavier / souris / tactile",
      "✓ Groupes, pools d'objets, caméra",
    ];
    features.forEach((f, i) => {
      this.add.text(width / 2, height / 2 + 60 + i * 22, f, {
        fontSize: "13px",
        color: "#606080",
        fontFamily: "monospace",
      }).setOrigin(0.5);
    });

    // Exemple : objet interactif
    const btn = this.add
      .text(width / 2, height - 50, "[ Appuie sur Espace ]", {
        fontSize: "14px",
        color: "#4040a0",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Clavier
    const space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.tweens.add({ targets: btn, alpha: 0.2, yoyo: true, repeat: -1, duration: 800 });
    space.on("down", () => {
      btn.setText("🚀 Partez !");
      btn.setColor("#e94560");
    });
  }

  update() {
    // Appelé à chaque frame (~60 fps).
    // Mettre ici : déplacement joueur, collisions, logique de jeu.
  }
}

// ─── Configuration du jeu ─────────────────────────────────────────────────────
const config = {
  type: Phaser.AUTO,          // WebGL avec repli Canvas automatique
  width: 800,
  height: 600,
  backgroundColor: "#0f0f1a",
  parent: "game",             // monte dans <div id="game">
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
};

new Phaser.Game(config);
