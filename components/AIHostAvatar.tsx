
import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Stars, Trail } from '@react-three/drei';
import * as THREE from 'three';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// -- Materials --
const WhiteGlowMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#ffffff'),
  emissive: new THREE.Color('#ffffff'),
  emissiveIntensity: 4,
  toneMapped: false,
  roughness: 0,
  metalness: 0,
});

const TechRingMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#3b82f6'), // Blue
  emissive: new THREE.Color('#2563eb'),
  emissiveIntensity: 2,
  roughness: 0.1,
  metalness: 0.9,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
});

const DotMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color('#60a5fa'),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending
});

// -- Components --

const WhiteCore: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !glowRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Core Pulse
    const baseScale = 1;
    let pulse = 0;
    
    if (isSpeaking) {
        pulse = Math.sin(time * 20) * 0.1 + Math.cos(time * 40) * 0.05; 
        meshRef.current.material.emissiveIntensity = 4 + Math.sin(time * 25) * 2;
    } else {
        pulse = Math.sin(time * 1.5) * 0.02;
        meshRef.current.material.emissiveIntensity = 3 + Math.sin(time * 2) * 1;
    }

    const scale = baseScale + pulse;
    meshRef.current.scale.setScalar(scale);
    
    // Outer Glow Shell
    glowRef.current.scale.setScalar(scale * 1.6); // Tighter glow for smaller core
    glowRef.current.rotation.z -= 0.02;
    glowRef.current.rotation.x += 0.02;
  });

  return (
    <group>
      {/* Smaller, intense core */}
      <mesh ref={meshRef} material={WhiteGlowMaterial}>
        <icosahedronGeometry args={[0.35, 8]} /> {/* Significantly smaller core */}
      </mesh>
      
      {/* Outer transparent glow shell */}
      <mesh ref={glowRef}>
        <icosahedronGeometry args={[0.45, 4]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.2} wireframe blending={THREE.AdditiveBlending} />
      </mesh>
      
      {/* High Intensity Light */}
      <pointLight distance={10} decay={2} intensity={5} color="#ffffff" />
      <pointLight distance={15} decay={2} intensity={3} color="#3b82f6" />
    </group>
  );
};

// A dense cloud of particles to simulate the "Nebula" effect
const DigitalNebula: React.FC = () => {
  const points = useRef<THREE.Points>(null);
  
  const [positions, colors] = useMemo(() => {
    const count = 4000;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const color1 = new THREE.Color('#3b82f6'); // Blue
    const color2 = new THREE.Color('#ffffff'); // White
    const color3 = new THREE.Color('#06b6d4'); // Cyan

    for (let i = 0; i < count; i++) {
      // Create a layered sphere effect
      const r = 1.0 + Math.pow(Math.random(), 2) * 2.5; // Concentrated closer to center but spreading out
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Mix colors
      const rand = Math.random();
      const mixedColor = rand > 0.7 ? color2 : (rand > 0.4 ? color3 : color1);
      
      cols[i * 3] = mixedColor.r;
      cols[i * 3 + 1] = mixedColor.g;
      cols[i * 3 + 2] = mixedColor.b;
    }
    return [pos, cols];
  }, []);

  useFrame((state) => {
    if(points.current) {
        const t = state.clock.elapsedTime * 0.1;
        points.current.rotation.y = t;
        points.current.rotation.z = t * 0.5;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.03} 
        vertexColors 
        transparent 
        opacity={0.5} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false} 
      />
    </points>
  );
};

// A ring made of dashed segments
const DashRing: React.FC<{ radius: number; count: number; width: number; height: number; speed: number; color?: string; opacity?: number }> = ({ radius, count, width, height, speed, color, opacity = 0.5 }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.z += speed * delta;
        }
    });

    const segments = useMemo(() => {
        const segs = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            segs.push(
                <mesh key={i} position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]} rotation={[0, 0, angle]}>
                    <planeGeometry args={[width, height]} />
                    <meshBasicMaterial color={color || '#60a5fa'} side={THREE.DoubleSide} transparent opacity={opacity} blending={THREE.AdditiveBlending} />
                </mesh>
            );
        }
        return segs;
    }, [count, radius, width, height, color, opacity]);

    return <group ref={groupRef}>{segments}</group>;
};

// A ring of dots rotating
const DotRing: React.FC<{ radius: number; count: number; speed: number; size: number }> = ({ radius, count, speed, size }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.z += speed * delta;
        }
    });

    const dots = useMemo(() => {
        const d = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            d.push(
                <mesh key={i} position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}>
                    <circleGeometry args={[size, 8]} />
                    <primitive object={DotMaterial} />
                </mesh>
            );
        }
        return d;
    }, [count, radius, size]);

    return <group ref={groupRef}>{dots}</group>;
};

// Complex Outer Ring Structure
const ComplexOuterRig: React.FC = () => {
    const rigRef = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        if (rigRef.current) {
            // Complex multi-axis rotation for the whole system
            const t = state.clock.elapsedTime * 0.1;
            rigRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
            rigRef.current.rotation.y = Math.cos(t * 0.3) * 0.15;
        }
    });

    return (
        <group ref={rigRef}>
            {/* 1. Main HUD Ring */}
            <mesh>
                <torusGeometry args={[2.5, 0.02, 16, 100]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
            </mesh>

            {/* 2. Inner Pattern Ring (Dashes) - Clockwise */}
            <DashRing radius={1.8} count={32} width={0.05} height={0.3} speed={0.3} color="#93c5fd" opacity={0.6} />

            {/* 3. Outer Pattern Ring (Fine Dashes) - Counter-Clockwise */}
            <DashRing radius={2.8} count={80} width={0.02} height={0.15} speed={-0.15} color="#2563eb" opacity={0.4} />

            {/* 4. Dots Orbiting - Anti-clockwise */}
            <DotRing radius={2.2} count={16} speed={-0.4} size={0.06} />

            {/* 5. Second Dot Ring - Fast */}
            <DotRing radius={1.2} count={8} speed={0.8} size={0.04} />

            {/* 6. Angled Orbital Ring 1 */}
            <group rotation={[0.4, 0.4, 0]}>
                 <mesh>
                    <torusGeometry args={[3.2, 0.01, 16, 100]} />
                    <meshBasicMaterial color="#60a5fa" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
                 </mesh>
                 <DotRing radius={3.2} count={4} speed={0.5} size={0.1} />
            </group>

             {/* 7. Angled Orbital Ring 2 */}
             <group rotation={[-0.4, -0.4, 0]}>
                 <mesh>
                    <torusGeometry args={[3.0, 0.01, 16, 100]} />
                    <meshBasicMaterial color="#a5b4fc" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
                 </mesh>
                 <DashRing radius={3.0} count={12} width={0.05} height={0.4} speed={-0.2} color="#ffffff" opacity={0.1} />
            </group>
        </group>
    );
};

const AmplitudeSpikes: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
    const count = 48; // More spikes
    const radius = 0.8; // Closer to the smaller core
    const bars = useRef<THREE.Mesh[]>([]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        bars.current.forEach((bar, i) => {
            if (!bar) return;
            let targetScale = 0.1;
            if (isSpeaking) {
                // Noise function simulation
                const noise = Math.sin(t * 25 + i * 0.5) * 0.5 + 0.5;
                targetScale = 0.2 + noise * 1.8; 
            }
            bar.scale.y += (targetScale - bar.scale.y) * 0.25; // Snappier response
        });
    });

    return (
        <group rotation={[0, 0, 0]}> 
            {new Array(count).fill(0).map((_, i) => {
                const angle = (i / count) * Math.PI * 2;
                return (
                    <mesh
                        key={i}
                        ref={(el) => { if (el) bars.current[i] = el; }}
                        position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}
                        rotation={[0, 0, angle + Math.PI / 2]}
                    >
                        <boxGeometry args={[0.03, 0.3, 0.01]} />
                        <meshBasicMaterial color="#93c5fd" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
                    </mesh>
                );
            })}
        </group>
    );
};

const Scene: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  return (
    <>
      <ambientLight intensity={0.2} />
      
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.1}>
        
        {/* Particle Cloud / Nebula */}
        <DigitalNebula />

        {/* The Central AI Brain (Smaller now) */}
        <WhiteCore isSpeaking={isSpeaking} />

        {/* The Audio Reactive Layer (Closer) */}
        <AmplitudeSpikes isSpeaking={isSpeaking} />

        {/* The Structural UI Layer */}
        <ComplexOuterRig />

      </Float>

      <Sparkles count={60} scale={6} size={2} speed={0.4} opacity={0.6} color="#60a5fa" />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
    </>
  );
};

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking = false, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-48 h-48',
    lg: 'w-80 h-80',
    xl: 'w-[600px] h-[600px]' 
  };

  return (
    <div className={`${sizeMap[size]} relative mx-auto`} style={{ minHeight: '300px' }}>
      {/* Background glow for integration */}
      <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[80px] animate-pulse pointer-events-none" />
      
      <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-400 rounded-full animate-ping opacity-40" />
          </div>
      }>
        <Canvas camera={{ position: [0, 0, 7], fov: 50 }} gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}>
            <Scene isSpeaking={isSpeaking} />
        </Canvas>
      </Suspense>
    </div>
  );
};
