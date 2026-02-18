
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
  emissiveIntensity: 2,
  toneMapped: false,
  roughness: 0,
  metalness: 0,
});

const TechRingMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#6366f1'), // Indigo
  emissive: new THREE.Color('#4f46e5'),
  emissiveIntensity: 1,
  roughness: 0.2,
  metalness: 0.8,
  transparent: true,
  opacity: 0.4,
  side: THREE.DoubleSide
});

const DotMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color('#a5b4fc'),
});

const DashMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color('#818cf8'),
  transparent: true,
  opacity: 0.6
});

// -- Components --

const WhiteCore: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !glowRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Core Pulse
    // If speaking, rapid erratic pulse. If idle, slow breathing.
    const baseScale = 1;
    let pulse = 0;
    
    if (isSpeaking) {
        // Speech amplitude simulation
        pulse = Math.sin(time * 15) * 0.15 + Math.cos(time * 30) * 0.1; 
        meshRef.current.material.emissiveIntensity = 3 + Math.sin(time * 20) * 1;
    } else {
        // Idle breathing
        pulse = Math.sin(time * 2) * 0.05;
        meshRef.current.material.emissiveIntensity = 2 + Math.sin(time * 2) * 0.5;
    }

    const scale = baseScale + pulse;
    meshRef.current.scale.setScalar(scale);
    
    // Outer Glow Shell - rotates and scales slightly differently
    glowRef.current.scale.setScalar(scale * 1.4);
    glowRef.current.rotation.z -= 0.01;
    glowRef.current.rotation.x += 0.01;
  });

  return (
    <group>
      {/* Solid intense core */}
      <mesh ref={meshRef} material={WhiteGlowMaterial}>
        <icosahedronGeometry args={[0.8, 4]} />
      </mesh>
      
      {/* Outer transparent glow shell */}
      <mesh ref={glowRef}>
        <icosahedronGeometry args={[0.85, 2]} />
        <meshBasicMaterial color="#4f46e5" transparent opacity={0.15} wireframe />
      </mesh>
      
      {/* Dynamic Point Light */}
      <pointLight distance={8} decay={2} intensity={4} color="#ffffff" />
      <pointLight distance={12} decay={2} intensity={2} color="#6366f1" />
    </group>
  );
};

// A ring made of dashed segments
const DashRing: React.FC<{ radius: number; count: number; width: number; height: number; speed: number; color?: string }> = ({ radius, count, width, height, speed, color }) => {
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
                    <meshBasicMaterial color={color || '#818cf8'} side={THREE.DoubleSide} transparent opacity={0.6} />
                </mesh>
            );
        }
        return segs;
    }, [count, radius, width, height, color]);

    return <group ref={groupRef}>{segments}</group>;
};

// A ring of dots rotating
const DotRing: React.FC<{ radius: number; count: number; speed: number; size: number }> = ({ radius, count, speed, size }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.z += speed * delta; // Direction controlled by sign of speed
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
    
    useFrame((_, delta) => {
        if (rigRef.current) {
            // Slowly tumble the entire outer rig for 3D depth
            rigRef.current.rotation.x = Math.sin(Date.now() * 0.0005) * 0.2;
            rigRef.current.rotation.y = Math.cos(Date.now() * 0.0005) * 0.2;
        }
    });

    return (
        <group ref={rigRef}>
            {/* 1. Thick Glassy Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[2.8, 0.15, 16, 100]} />
                <primitive object={TechRingMaterial} />
            </mesh>

            {/* 2. Inner Pattern Ring (Dashes) - Clockwise */}
            <DashRing radius={2.4} count={24} width={0.1} height={0.4} speed={0.2} color="#a5b4fc" />

            {/* 3. Outer Pattern Ring (Fine Dashes) - Counter-Clockwise */}
            <DashRing radius={3.2} count={60} width={0.05} height={0.2} speed={-0.1} color="#4f46e5" />

            {/* 4. Dots Orbiting - Anti-clockwise */}
            <DotRing radius={3.0} count={12} speed={-0.4} size={0.08} />

            {/* 5. Angled Orbital Ring */}
            <group rotation={[0.5, 0.5, 0]}>
                 <mesh>
                    <torusGeometry args={[3.5, 0.02, 16, 100]} />
                    <meshBasicMaterial color="#818cf8" transparent opacity={0.3} />
                 </mesh>
                 <DotRing radius={3.5} count={3} speed={0.8} size={0.15} />
            </group>
        </group>
    );
};

const AmplitudeSpikes: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
    const count = 32;
    const radius = 1.6;
    const bars = useRef<THREE.Mesh[]>([]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        bars.current.forEach((bar, i) => {
            if (!bar) return;
            let targetScale = 0.1;
            if (isSpeaking) {
                // Noise function simulation
                const noise = Math.sin(t * 20 + i * 0.5) * 0.5 + 0.5;
                targetScale = 0.5 + noise * 1.5; // Scale between 0.5 and 2.0
            }
            bar.scale.y += (targetScale - bar.scale.y) * 0.2;
            bar.rotation.z += 0.001; // subtle drift of individual bars? No, array rotation handles that.
        });
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}> {/* Tilted base angle */}
            {new Array(count).fill(0).map((_, i) => {
                const angle = (i / count) * Math.PI * 2;
                return (
                    <mesh
                        key={i}
                        ref={(el) => { if (el) bars.current[i] = el; }}
                        position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}
                        rotation={[0, 0, angle + Math.PI / 2]}
                    >
                        <boxGeometry args={[0.08, 0.4, 0.02]} /> {/* Initial size, Y scaled by audio */}
                        <meshBasicMaterial color="#c7d2fe" transparent opacity={0.8} />
                    </mesh>
                );
            })}
        </group>
    );
};

const Scene: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        
        {/* The Central AI Brain */}
        <WhiteCore isSpeaking={isSpeaking} />

        {/* The Audio Reactive Layer */}
        <AmplitudeSpikes isSpeaking={isSpeaking} />

        {/* The Structural UI Layer */}
        <ComplexOuterRig />

      </Float>

      <Sparkles count={40} scale={5} size={3} speed={0.4} opacity={0.5} color="#a5b4fc" />
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
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
      <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-[60px] animate-pulse pointer-events-none" />
      
      <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
              <div className="w-12 h-12 bg-white rounded-full animate-ping opacity-20" />
          </div>
      }>
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }} gl={{ antialias: true, alpha: true }}>
            <Scene isSpeaking={isSpeaking} />
        </Canvas>
      </Suspense>
    </div>
  );
};
