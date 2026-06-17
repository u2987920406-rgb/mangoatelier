import * as THREE from "three";

// ─── Scène Three.js ───────────────────────────────────────────────────────────
// Architecture standard : Scene + Camera + Renderer + animate()
// Ajoute des Mesh(geometry, material) à la scène.
// Lumières : AmbientLight (base) + DirectionalLight / PointLight (ombres).

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// Caméra perspective — FOV 75°, aspect ratio dynamique
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 1, 4);

// Renderer WebGL sur le <canvas id="game">
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("game"),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

// ─── Lumières ─────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x404060, 2);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(5, 10, 7);
sun.castShadow = true;
scene.add(sun);

// ─── Objet de démo — cube violet rotatif ──────────────────────────────────────
const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
const cubeMat = new THREE.MeshPhongMaterial({
  color: 0x6c63ff,
  emissive: 0x1a1a4a,
  shininess: 80,
});
const cube = new THREE.Mesh(cubeGeo, cubeMat);
cube.castShadow = true;
scene.add(cube);

// Sol
const floorGeo = new THREE.PlaneGeometry(10, 10);
const floorMat = new THREE.MeshPhongMaterial({ color: 0x1a1a2e });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1;
floor.receiveShadow = true;
scene.add(floor);

// Grille de référence (aide au design)
const grid = new THREE.GridHelper(10, 20, 0x2a2a5a, 0x1a1a3a);
grid.position.y = -0.99;
scene.add(grid);

// ─── Responsive ───────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Boucle de rendu ─────────────────────────────────────────────────────────
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.01;

  // Rotation du cube
  cube.rotation.x = t * 0.5;
  cube.rotation.y = t;

  // Léger flottement vertical
  cube.position.y = Math.sin(t) * 0.2;

  renderer.render(scene, camera);
}
animate();

// ─── Capacités Three.js disponibles ─────────────────────────────────────────
// Géométries  : BoxGeometry, SphereGeometry, CylinderGeometry, TorusGeometry,
//               PlaneGeometry, ExtrudeGeometry (formes SVG → 3D), TextGeometry
// Matériaux   : MeshBasicMaterial, MeshPhongMaterial, MeshStandardMaterial (PBR),
//               MeshToonMaterial (cel-shading), ShaderMaterial (GLSL custom)
// Lumières    : AmbientLight, DirectionalLight, PointLight, SpotLight, HemisphereLight
// Effets      : EffectComposer (bloom, SSAO, depth of field via postprocessing)
// Animation   : AnimationMixer + GLTF (modèles 3D Blender, Sketchfab)
// Physique    : intégrer Cannon-es ou Rapier (WASM) pour collisions/rigidBody
// Contrôles   : OrbitControls (orbite souris), PointerLockControls (FPS)
// Chargeurs   : GLTFLoader (modèles .glb/.gltf), TextureLoader, HDRILoader
