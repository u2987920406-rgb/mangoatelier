// Starter React Three Fiber — scène 3D interactive
// Survol d'un cube = rose · OrbitControls actif
// Décris la scène dans le chat : Mango ajoute meshes, lumières, physique, caméra
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html, Float } from '@react-three/drei';
import { useRef, useState } from 'react';

function Box({ position = [0, 0, 0], color = '#6366f1', speed = 1 }) {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    ref.current.rotation.x += delta * speed * 0.5;
    ref.current.rotation.y += delta * speed * 0.8;
  });

  return (
    <mesh
      ref={ref}
      position={position}
      scale={hovered ? 1.25 : 1}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? '#f472b6' : color} metalness={0.4} roughness={0.3} />
    </mesh>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f' }}>
      <Canvas camera={{ position: [4, 3, 6], fov: 50 }} shadows>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
        <pointLight position={[-4, 4, -4]} color="#6366f1" intensity={2} />

        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
          <Box position={[0, 1, 0]} color="#6366f1" speed={0.8} />
        </Float>
        <Box position={[-2.5, 0.5, 0]} color="#06b6d4" speed={1.2} />
        <Box position={[2.5, 0.5, 0]} color="#f59e0b" speed={0.6} />

        <Grid
          infiniteGrid
          cellSize={0.6}
          cellThickness={0.6}
          sectionSize={3}
          sectionThickness={1.5}
          sectionColor="#4f4f7a"
          fadeDistance={30}
        />

        <Html center position={[0, -1.8, 0]}>
          <p style={{ color: '#888', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            Survol = rose · Clic + glisser pour orbiter
          </p>
        </Html>

        <OrbitControls makeDefault />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
