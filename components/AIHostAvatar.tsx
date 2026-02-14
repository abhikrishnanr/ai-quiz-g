import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Cylinder, Capsule, Torus, Sparkles, Float, Ring } from '@react-three/drei';
import * as THREE from 'three';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

interface HairStrandProps {
  points: THREE.Vector3[];
  color: string;
  thickness?: number;
  offset?: number;
}

// --- Procedural Hair Component ---
const HairStrand: React.FC<HairStrandProps> = ({ 
  points, 
  color, 
  thickness = 0.04,
  offset = 0
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      // Subtle wind/float effect
      meshRef.current.rotation.z = Math.sin(t * 1.5 + offset) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef}>
      <tubeGeometry args={[curve, 32, thickness, 8, false]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
    </mesh>
  );
};

// --- The Main Humanoid Head ---
const HumanoidBust = ({ isSpeaking }: { isSpeaking?: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const lipsTopRef = useRef<THREE.Mesh>(null);
  const lipsBottomRef = useRef<THREE.Mesh>(null);
  const [blink, setBlink] = useState(1);

  // Generate Hair Geometry (Bob cut style)
  const hairStrands = useMemo(() => {
    const strands: { points: THREE.Vector3[], offset: number }[] = [];
    const layers = 30;
    for (let i = 0; i < layers; i++) {
      const angle = (i / layers) * Math.PI * 1.4 + Math.PI * 0.8; // Wrap around back/sides
      const radius = 0.95;
      const yStart = 0.8;
      const length = 1.8;
      
      const p1 = new THREE.Vector3(Math.cos(angle) * radius * 0.8, yStart, Math.sin(angle) * radius * 0.9);
      const p2 = new THREE.Vector3(Math.cos(angle) * radius * 1.1, yStart - 0.5, Math.sin(angle) * radius * 1.1);
      const p3 = new THREE.Vector3(Math.cos(angle) * radius * 1.2, yStart - length, Math.sin(angle) * radius * 1.2);
      // Curl inward at bottom
      const p4 = new THREE.Vector3(Math.cos(angle) * (radius * 0.9), yStart - length - 0.2, Math.sin(angle) * (radius * 0.9));

      strands.push({ points: [p1, p2, p3, p4], offset: i });
    }
    // Bangs
    for (let i = 0; i < 8; i++) {
       const x = (i - 3.5) * 0.15;
       const p1 = new THREE.Vector3(x, 0.9, 0.8);
       const p2 = new THREE.Vector3(x * 1.2, 0.6, 0.95);
       const p3 = new THREE.Vector3(x * 1.5, 0.4, 0.9);
       strands.push({ points: [p1, p2, p3], offset: i + 100 });
    }
    return strands;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const mouse = state.mouse;

    // Head Tracking (Subtle)
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, mouse.x * 0.2, 0.1);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -mouse.y * 0.2, 0.1);
    }

    // Eye Tracking (Stronger)
    if (leftEyeRef.current && rightEyeRef.current) {
      const eyeX = mouse.x * 0.3;
      const eyeY = mouse.y * 0.3;
      leftEyeRef.current.rotation.y = eyeX;
      leftEyeRef.current.rotation.x = -eyeY;
      rightEyeRef.current.rotation.y = eyeX;
      rightEyeRef.current.rotation.x = -eyeY;
      
      // Blinking Logic
      if (Math.random() > 0.995) setBlink(0.1); // Start blink
      if (blink < 1) setBlink(prev => Math.min(prev + 0.1, 1)); // Recover blink
      
      leftEyeRef.current.scale.y = blink;
      rightEyeRef.current.scale.y = blink;
    }

    // Mouth Animation (Lip Sync)
    if (lipsBottomRef.current && lipsTopRef.current) {
      // Mouth opens based on sine wave when speaking
      const openAmount = isSpeaking ? (Math.sin(t * 20) * 0.5 + 0.5) * 0.15 : 0;
      lipsBottomRef.current.position.y = -0.45 - openAmount;
      lipsTopRef.current.position.y = -0.38 + (openAmount * 0.2);
      
      // Jaw movement
      if (jawRef.current) {
         jawRef.current.rotation.x = openAmount * 0.5;
      }
    }
  });

  const skinColor = "#e0e7ff";
  const lipColor = "#818cf8";

  return (
    <group ref={groupRef}>
      {/* --- HEAD GEOMETRY --- */}
      
      {/* Cranium */}
      <Sphere args={[0.9, 64, 64]} scale={[0.92, 1.1, 1]}>
        <meshPhysicalMaterial color={skinColor} roughness={0.4} metalness={0.1} clearcoat={0.3} />
      </Sphere>

      {/* Jawline/Chin (Blended Shape) */}
      <mesh position={[0, -0.5, 0.1]} ref={jawRef}>
         <cylinderGeometry args={[0.8, 0.5, 0.8, 64]} />
         <meshPhysicalMaterial color={skinColor} roughness={0.4} metalness={0.1} clearcoat={0.3} />
      </mesh>

      {/* Cheeks/Face Front */}
      <Sphere args={[0.88, 64, 64]} position={[0, -0.1, 0.1]} scale={[1, 1.1, 0.8]}>
        <meshPhysicalMaterial color={skinColor} roughness={0.4} metalness={0.1} />
      </Sphere>

      {/* Nose */}
      <mesh position={[0, -0.15, 0.95]} rotation={[0.2, 0, 0]}>
         <capsuleGeometry args={[0.08, 0.35, 4, 16]} />
         <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Ears */}
      <group>
        <mesh position={[-0.9, 0, 0]} rotation={[0, 0, -0.2]}>
          <capsuleGeometry args={[0.15, 0.4, 4, 16]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        <mesh position={[0.9, 0, 0]} rotation={[0, 0, 0.2]}>
          <capsuleGeometry args={[0.15, 0.4, 4, 16]} />
          <meshStandardMaterial color={skinColor} />
        </mesh>
        {/* Cyber Ear Pieces */}
        <Torus position={[-0.92, 0, 0]} args={[0.1, 0.02, 16, 32]} rotation={[0, Math.PI/2, 0]}>
            <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={2} />
        </Torus>
        <Torus position={[0.92, 0, 0]} args={[0.1, 0.02, 16, 32]} rotation={[0, Math.PI/2, 0]}>
            <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={2} />
        </Torus>
      </group>

      {/* --- EYES --- */}
      <group position={[0, 0.15, 0.8]}>
        {/* Left Eye */}
        <group position={[-0.35, 0, 0]} ref={leftEyeRef}>
           {/* Eyeball */}
           <Sphere args={[0.13, 32, 32]}>
              <meshStandardMaterial color="white" />
           </Sphere>
           {/* Iris */}
           <mesh position={[0, 0, 0.11]}>
              <ringGeometry args={[0, 0.06, 32]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
           </mesh>
           {/* Pupil */}
           <mesh position={[0, 0, 0.111]}>
              <ringGeometry args={[0, 0.025, 32]} />
              <meshBasicMaterial color="black" />
           </mesh>
           {/* Eyeliner/Tech Detail */}
           <Torus args={[0.14, 0.005, 16, 32]} rotation={[Math.PI/2, 0, 0]}>
               <meshStandardMaterial color="#1e1b4b" />
           </Torus>
        </group>

        {/* Right Eye */}
        <group position={[0.35, 0, 0]} ref={rightEyeRef}>
           <Sphere args={[0.13, 32, 32]}>
              <meshStandardMaterial color="white" />
           </Sphere>
           <mesh position={[0, 0, 0.11]}>
              <ringGeometry args={[0, 0.06, 32]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} />
           </mesh>
           <mesh position={[0, 0, 0.111]}>
              <ringGeometry args={[0, 0.025, 32]} />
              <meshBasicMaterial color="black" />
           </mesh>
           <Torus args={[0.14, 0.005, 16, 32]} rotation={[Math.PI/2, 0, 0]}>
               <meshStandardMaterial color="#1e1b4b" />
           </Torus>
        </group>
      </group>

      {/* --- MOUTH --- */}
      <group position={[0, 0, 0.95]}>
        {/* Top Lip */}
        <mesh ref={lipsTopRef} position={[0, -0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
          <tubeGeometry args={[new THREE.CatmullRomCurve3([
             new THREE.Vector3(0, 0.25, 0),
             new THREE.Vector3(0.05, 0, 0.02),
             new THREE.Vector3(0, -0.25, 0)
          ]), 20, 0.04, 8, false]} />
          <meshStandardMaterial color={lipColor} roughness={0.4} />
        </mesh>

        {/* Bottom Lip */}
        <mesh ref={lipsBottomRef} position={[0, -0.45, 0]} rotation={[0, 0, Math.PI / 2]}>
           <tubeGeometry args={[new THREE.CatmullRomCurve3([
             new THREE.Vector3(0, 0.22, 0),
             new THREE.Vector3(-0.05, 0, 0.02),
             new THREE.Vector3(0, -0.22, 0)
          ]), 20, 0.05, 8, false]} />
          <meshStandardMaterial color={lipColor} roughness={0.4} />
        </mesh>
      </group>

      {/* --- HAIR --- */}
      <group>
        {hairStrands.map((s, i) => (
           <HairStrand key={i} points={s.points} color="#6366f1" offset={s.offset} />
        ))}
      </group>

      {/* --- NECK & SHOULDERS --- */}
      <group position={[0, -1.6, 0]}>
         {/* Neck */}
         <Cylinder args={[0.35, 0.45, 1, 32]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color={skinColor} roughness={0.5} />
         </Cylinder>
         {/* Cyber Collar */}
         <Torus args={[0.48, 0.05, 16, 64]} position={[0, 0.2, 0]} rotation={[Math.PI/2, 0, 0]}>
            <meshStandardMaterial color="#1e1b4b" metalness={0.9} roughness={0.2} />
         </Torus>
         {/* Shoulders */}
         <mesh position={[0, -0.4, 0]} rotation={[0, 0, 0]}>
             <capsuleGeometry args={[0.5, 2.2, 4, 32]} />
             <meshStandardMaterial color="#312e81" metalness={0.6} roughness={0.3} />
         </mesh>
         {/* Shoulders - Rotation fix since capsule is vertical by default */}
         <mesh position={[0, -0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
             <capsuleGeometry args={[0.6, 2.5, 4, 32]} />
             <meshStandardMaterial color="#1e1b4b" metalness={0.8} roughness={0.3} />
         </mesh>
      </group>

      {/* --- HOLOGRAPHIC ACCENTS --- */}
      <group position={[0, 0, 0]}>
        {/* Halo Ring */}
        <Ring args={[1.3, 1.32, 64]} position={[0, 0, -0.5]}>
           <meshBasicMaterial color="#22d3ee" transparent opacity={0.3} side={THREE.DoubleSide} />
        </Ring>
        {/* Data Visor / Floating Elements */}
        {isSpeaking && (
          <Ring args={[1.5, 1.51, 64]} rotation={[0.2, 0, 0]}>
             <meshBasicMaterial color="#818cf8" transparent opacity={0.2} side={THREE.DoubleSide} />
          </Ring>
        )}
      </group>

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
        
        <Canvas camera={{ position: [0, 0.2, 4], fov: 35 }} gl={{ alpha: true, antialias: true }}>
           <ambientLight intensity={0.6} />
           
           {/* Three-point lighting setup for better face definition */}
           <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
           <pointLight position={[-10, 5, 5]} intensity={0.5} color="#818cf8" />
           <spotLight position={[0, 10, 5]} angle={0.5} penumbra={1} intensity={1} color="#e0e7ff" />
           <pointLight position={[0, -5, 2]} intensity={0.5} color="#22d3ee" /> {/* Chin Fill */}

           <Float speed={1} rotationIntensity={0.1} floatIntensity={0.1}>
              <HumanoidBust isSpeaking={isSpeaking} />
           </Float>

           <Sparkles count={100} scale={5} size={2} speed={0.4} opacity={0.4} color="#a5b4fc" />
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
