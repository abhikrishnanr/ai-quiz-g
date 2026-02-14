
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Torus, Sparkles, Float, Cylinder, Cone } from '@react-three/drei';
import * as THREE from 'three';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// --- Sub-components for the Avatar ---

interface HairStrandProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  speed: number;
}

const HairStrand: React.FC<HairStrandProps> = ({ 
  position, 
  rotation, 
  scale, 
  color, 
  speed 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a curved tube for hair
  const curve = useMemo(() => {
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(0.2, -0.5, -0.5));
    points.push(new THREE.Vector3(0.5, -1.5, -0.8));
    points.push(new THREE.Vector3(0.4, -2.5, -0.5));
    return new THREE.CatmullRomCurve3(points);
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      const t = state.clock.getElapsedTime();
      meshRef.current.rotation.z = rotation[2] + Math.sin(t * speed) * 0.05;
      meshRef.current.rotation.x = rotation[0] + Math.cos(t * speed * 0.8) * 0.02;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh ref={meshRef}>
        <tubeGeometry args={[curve, 20, 0.08, 8, false]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.4}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
};

const CyberFace = ({ isSpeaking }: { isSpeaking?: boolean }) => {
  const headRef = useRef<THREE.Mesh>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Head subtle movement
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.5) * 0.05;
      headRef.current.rotation.z = Math.cos(t * 0.3) * 0.02;
    }

    // Jaw/Chin movement
    if (jawRef.current && headRef.current) {
      jawRef.current.rotation.copy(headRef.current.rotation);
    }

    // Speaking animation (Mouth & Glow)
    if (mouthRef.current) {
      const targetScaleY = isSpeaking ? 0.2 + Math.sin(t * 15) * 0.15 : 0.05;
      mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, targetScaleY, 0.2);
    }

    // Eye Blink / Glow
    if (leftEyeRef.current && rightEyeRef.current) {
      const blink = Math.sin(t * 0.5) > 0.98 ? 0.1 : 1;
      leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, blink, 0.2);
      rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, blink, 0.2);
      
      // Eye glow intensity
      const intensity = isSpeaking ? 2 + Math.sin(t * 10) : 1.5;
      (leftEyeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
      (rightEyeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
    }

    // Aura Rotation
    if (auraRingRef.current) {
      auraRingRef.current.rotation.z = -t * 0.2;
    }
  });

  // Generate hair strands
  const hairStrands = useMemo(() => {
    const strands = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI + Math.PI; // Back half of head
      const x = Math.cos(angle) * 0.8;
      const z = Math.sin(angle) * 0.8;
      const y = 0.5;
      strands.push({
        pos: [x, y, z] as [number, number, number],
        rot: [0, -angle + Math.PI / 2, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        speed: 1 + Math.random()
      });
    }
    return strands;
  }, []);

  return (
    <group>
      {/* Head Shape */}
      <Sphere ref={headRef} args={[1, 64, 64]} scale={[0.85, 1.1, 0.95]}>
        <meshPhysicalMaterial 
          color="#6366f1" 
          roughness={0.2} 
          metalness={0.8} 
          clearcoat={1} 
          clearcoatRoughness={0.1}
          emissive="#312e81"
          emissiveIntensity={0.2}
        />
      </Sphere>

      {/* Jaw/Chin connection */}
      <group position={[0, -0.8, 0.1]}>
        <Cone ref={jawRef} args={[0.7, 1.2, 32]} rotation={[Math.PI, 0, 0]}>
             <meshStandardMaterial color="#4f46e5" roughness={0.3} metalness={0.9} />
        </Cone>
      </group>

      {/* Eyes */}
      <group position={[0, 0.1, 0.85]}>
         <Sphere ref={leftEyeRef} args={[0.12, 32, 32]} position={[-0.32, 0, 0]}>
           <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} toneMapped={false} />
         </Sphere>
         <Sphere ref={rightEyeRef} args={[0.12, 32, 32]} position={[0.32, 0, 0]}>
           <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} toneMapped={false} />
         </Sphere>
      </group>

      {/* Mouth */}
      <group position={[0, -0.45, 0.9]}>
        <mesh ref={mouthRef}>
          <capsuleGeometry args={[0.08, 0.2, 4, 8]} />
          <meshStandardMaterial color="#e0e7ff" emissive="#818cf8" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Cyber Crown / Hair Base */}
      <Torus position={[0, 0.8, 0]} args={[0.6, 0.05, 16, 64]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#c084fc" emissive="#c084fc" emissiveIntensity={1} />
      </Torus>

      {/* Procedural Hair */}
      {hairStrands.map((h, i) => (
        <HairStrand 
          key={i} 
          position={h.pos} 
          rotation={h.rot} 
          scale={h.scale} 
          color={i % 2 === 0 ? "#818cf8" : "#c084fc"} 
          speed={h.speed} 
        />
      ))}

      {/* Large Halo Aura */}
      <group position={[0, 0, -1]}>
        <Torus ref={auraRingRef} args={[2.5, 0.02, 16, 100]}>
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} transparent opacity={0.4} />
        </Torus>
        <Torus args={[3.2, 0.01, 16, 100]} rotation={[0.5, 0, 0]}>
          <meshStandardMaterial color="#818cf8" emissive="#818cf8" emissiveIntensity={0.3} transparent opacity={0.2} />
        </Torus>
      </group>

      {/* Neck */}
      <Cylinder args={[0.25, 0.4, 1.2, 32]} position={[0, -1.5, 0]}>
        <meshStandardMaterial color="#1e1b4b" metalness={0.8} />
      </Cylinder>
    </group>
  );
};

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, commentary, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-64 h-64',
    xl: 'w-[500px] h-[500px] md:w-[700px] md:h-[700px]'
  };

  const isLarge = size === 'xl' || size === 'lg';

  return (
    <div className={`relative flex items-center justify-center ${isLarge ? 'flex-col' : ''}`}>
      
      {/* Commentary Bubble */}
      {commentary && (
        <div className={`absolute z-50 ${isLarge ? 'bottom-[85%] mb-8 animate-in zoom-in slide-in-from-bottom' : 'left-full ml-4 w-64'} bg-slate-900/90 backdrop-blur-xl border border-indigo-500/40 p-6 rounded-[2rem] shadow-[0_10px_50px_rgba(0,0,0,0.6)] max-w-lg text-center`}>
           <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Host Transmission</p>
           <p className="text-white text-lg md:text-xl font-medium leading-relaxed font-sans">"{commentary}"</p>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-4 h-4 bg-slate-900/90 rotate-45 border-r border-indigo-500/40 border-b border-indigo-500/40" />
        </div>
      )}

      {/* 3D Scene Container */}
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Background Glow */}
        <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-[80px] animate-pulse pointer-events-none" />
        
        <Canvas camera={{ position: [0, 0, 4.5], fov: 40 }} gl={{ alpha: true, antialias: true }}>
           <ambientLight intensity={0.5} />
           <pointLight position={[10, 10, 10]} intensity={1} color="#818cf8" />
           <pointLight position={[-10, -5, 5]} intensity={0.8} color="#c084fc" />
           <spotLight position={[0, 5, 5]} angle={0.5} penumbra={1} intensity={1.5} color="#22d3ee" />

           <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
              <CyberFace isSpeaking={isSpeaking} />
           </Float>

           <Sparkles count={150} scale={6} size={3} speed={0.4} opacity={0.6} color="#a5b4fc" />
        </Canvas>
      </div>

      {/* Host Status Label */}
      {isLarge && (
        <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom duration-1000 z-10">
           <h2 className="text-4xl font-black italic tracking-tighter text-white drop-shadow-lg">BODHINI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">PRIME</span></h2>
           <div className="flex items-center justify-center gap-3 mt-3 bg-slate-900/50 py-2 px-6 rounded-full border border-white/5 backdrop-blur-md inline-flex">
             <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
             <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">{isSpeaking ? 'Voice Synthesis Active' : 'Monitoring Uplink'}</span>
           </div>
        </div>
      )}
    </div>
  );
};
    