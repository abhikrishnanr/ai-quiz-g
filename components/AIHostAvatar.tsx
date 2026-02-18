
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Stars, Trail } from '@react-three/drei';
import * as THREE from 'three';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const CoreMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#4f46e5'),
  emissive: new THREE.Color('#6366f1'),
  emissiveIntensity: 2,
  roughness: 0.1,
  metalness: 0.8,
});

const RingMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#a5b4fc'),
  emissive: new THREE.Color('#818cf8'),
  emissiveIntensity: 0.5,
  roughness: 0.2,
  metalness: 1,
  transparent: true,
  opacity: 0.6,
  side: THREE.DoubleSide
});

const NeuralCore: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!meshRef.current || !lightRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Rotation
    meshRef.current.rotation.y += isSpeaking ? 0.05 : 0.01;
    meshRef.current.rotation.z = Math.sin(time * 0.5) * 0.1;

    // Pulse Effect (Amplitude Simulation)
    const baseScale = 1;
    const pulse = isSpeaking ? Math.sin(time * 20) * 0.15 + (Math.random() * 0.1) : Math.sin(time * 2) * 0.05;
    const scale = baseScale + pulse;
    meshRef.current.scale.set(scale, scale, scale);

    // Light Intensity Pulse
    lightRef.current.intensity = isSpeaking ? 4 + Math.random() * 2 : 2 + Math.sin(time) * 0.5;
    
    // Color shift
    const colorTime = time * 0.5;
    const hue = (colorTime % 10) / 10;
    // meshRef.current.material.emissive.setHSL(0.6 + Math.sin(time)*0.1, 1, 0.5);
  });

  return (
    <group>
      <mesh ref={meshRef} material={CoreMaterial}>
        <icosahedronGeometry args={[1, 4]} />
      </mesh>
      <pointLight ref={lightRef} distance={10} decay={2} color="#818cf8" />
    </group>
  );
};

const GyroRing: React.FC<{ radius: number; speed: number; axis: [number, number, number]; thickness?: number }> = ({ radius, speed, axis, thickness = 0.02 }) => {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (ref.current) {
        ref.current.rotation.x += axis[0] * speed * delta;
        ref.current.rotation.y += axis[1] * speed * delta;
        ref.current.rotation.z += axis[2] * speed * delta;
    }
  });

  return (
    <group ref={ref}>
        <mesh material={RingMaterial}>
            <torusGeometry args={[radius, thickness, 16, 100]} />
        </mesh>
    </group>
  );
};

const AmplitudeRing: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
    const ref = useRef<THREE.Group>(null);
    const barsRef = useRef<THREE.Mesh[]>([]);

    const bars = useMemo(() => {
        return new Array(48).fill(0).map((_, i) => {
            const angle = (i / 48) * Math.PI * 2;
            return {
                position: [Math.cos(angle) * 2.2, Math.sin(angle) * 2.2, 0] as [number, number, number],
                rotation: [0, 0, angle + Math.PI/2] as [number, number, number]
            };
        });
    }, []);

    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.z -= 0.002;
        
        barsRef.current.forEach((bar, i) => {
            if (!bar) return;
            // Randomize amplitude if speaking
            let scaleY = 1;
            if (isSpeaking) {
                const noise = Math.sin(state.clock.elapsedTime * 10 + i) * 0.5 + 0.5;
                scaleY = 1 + noise * 3 * Math.random();
            } else {
                scaleY = 0.2;
            }
            bar.scale.y += (scaleY - bar.scale.y) * 0.2; // Smooth lerp
            // @ts-ignore
            bar.material.opacity = isSpeaking ? 0.8 : 0.2;
        });
    });

    return (
        <group ref={ref}>
            {bars.map((props, i) => (
                <mesh 
                    key={i} 
                    ref={(el) => { if(el) barsRef.current[i] = el; }}
                    position={props.position} 
                    rotation={props.rotation}
                >
                    <boxGeometry args={[0.05, 0.4, 0.02]} />
                    <meshBasicMaterial color="#a5b4fc" transparent opacity={0.3} />
                </mesh>
            ))}
        </group>
    );
}

const Scene: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#4338ca" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c084fc" />
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <NeuralCore isSpeaking={isSpeaking} />
        
        {/* Inner Fast Ring */}
        <GyroRing radius={1.4} speed={1.5} axis={[1, 0.5, 0]} thickness={0.03} />
        
        {/* Middle Ring */}
        <GyroRing radius={1.7} speed={1.0} axis={[0.2, 1, 0.2]} thickness={0.02} />
        
        {/* Outer Slow Ring */}
        <GyroRing radius={2.0} speed={0.5} axis={[0, 0.2, 1]} thickness={0.04} />

        {/* Amplitude Visualizer Ring */}
        <AmplitudeRing isSpeaking={isSpeaking} />
      </Float>

      <Sparkles count={50} scale={4} size={2} speed={0.4} opacity={0.5} color="#a5b4fc" />
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
    </>
  );
};

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking = false, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-48 h-48',
    lg: 'w-80 h-80',
    xl: 'w-[500px] h-[500px]' 
  };

  return (
    <div className={`${sizeMap[size]} relative mx-auto`}>
      <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <Scene isSpeaking={isSpeaking} />
      </Canvas>
    </div>
  );
};
