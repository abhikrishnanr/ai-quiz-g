import React, { useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Float, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const NeuralCore = ({ isSpeaking }: { isSpeaking?: boolean }) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const outerCoreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 500; i++) {
      const t = Math.random() * Math.PI * 2;
      const u = Math.random() * Math.PI * 2;
      const r = 2.5 + Math.random() * 0.5;
      temp.push(r * Math.cos(t) * Math.sin(u), r * Math.sin(t) * Math.sin(u), r * Math.cos(u));
    }
    return new Float32Array(temp);
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.4;
      coreRef.current.rotation.z = t * 0.2;
      const scaleBase = isSpeaking ? 1.15 : 1.0;
      const pulse = Math.sin(t * (isSpeaking ? 12 : 3)) * 0.05;
      coreRef.current.scale.setScalar(scaleBase + pulse);
    }

    if (outerCoreRef.current) {
      outerCoreRef.current.rotation.y = -t * 0.2;
      outerCoreRef.current.rotation.x = t * 0.1;
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.5;
      ring1Ref.current.rotation.y = t * 0.3 + state.mouse.x * 0.2;
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = t * 0.6;
      ring2Ref.current.rotation.x = t * 0.4 + state.mouse.y * 0.2;
    }

    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.05;
    }
  });

  return (
    // @ts-ignore
    <group>
      {/* Inner Core */}
      {/* @ts-ignore */}
      <mesh ref={coreRef}>
        {/* @ts-ignore */}
        <icosahedronGeometry args={[1, 2]} />
        {/* @ts-ignore */}
        <meshStandardMaterial 
          color="#818cf8" 
          wireframe 
          emissive="#4f46e5" 
          emissiveIntensity={isSpeaking ? 10 : 4} 
          transparent 
          opacity={0.8}
        />
        {/* @ts-ignore */}
      </mesh>

      {/* Outer Holographic Shell */}
      {/* @ts-ignore */}
      <mesh ref={outerCoreRef}>
        {/* @ts-ignore */}
        <icosahedronGeometry args={[1.2, 1]} />
        {/* @ts-ignore */}
        <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.15} />
        {/* @ts-ignore */}
      </mesh>

      {/* Rotating Data Matrix Points */}
      {/* @ts-ignore */}
      <points ref={pointsRef}>
        {/* @ts-ignore */}
        <bufferGeometry>
          {/* @ts-ignore */}
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={particles}
            itemSize={3}
          />
          {/* @ts-ignore */}
        </bufferGeometry>
        {/* @ts-ignore */}
        <pointsMaterial size={0.015} color="#818cf8" transparent opacity={0.4} sizeAttenuation />
        {/* @ts-ignore */}
      </points>

      {/* Orbiting HUD Rings */}
      {/* @ts-ignore */}
      <mesh ref={ring1Ref}>
        {/* @ts-ignore */}
        <torusGeometry args={[2, 0.02, 16, 100]} />
        {/* @ts-ignore */}
        <meshStandardMaterial color="#6366f1" emissive="#4f46e5" emissiveIntensity={2} transparent opacity={0.5} />
        {/* @ts-ignore */}
      </mesh>

      {/* @ts-ignore */}
      <mesh ref={ring2Ref}>
        {/* @ts-ignore */}
        <torusGeometry args={[2.4, 0.015, 16, 100]} />
        {/* @ts-ignore */}
        <meshStandardMaterial color="#a5b4fc" emissive="#818cf8" emissiveIntensity={1} transparent opacity={0.3} />
        {/* @ts-ignore */}
      </mesh>
      
      {/* @ts-ignore */}
    </group>
  );
};

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, commentary, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-48 h-48',
    lg: 'w-80 h-80',
    xl: 'w-full h-full min-h-[400px] md:min-h-[550px]'
  };

  const isLarge = size === 'xl' || size === 'lg';

  return (
    <div className={`relative flex items-center justify-center ${isLarge ? 'flex-col h-full w-full' : ''}`}>
      {commentary && (
        <div className={`absolute z-50 ${isLarge ? 'bottom-[85%] mb-12 animate-in zoom-in' : 'left-full ml-6 w-72'} bg-slate-900/95 backdrop-blur-3xl border border-indigo-500/30 p-8 rounded-[2.5rem] shadow-[0_30px_90px_rgba(0,0,0,0.8)] max-w-xl text-center ring-1 ring-white/10`}>
           <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.5em]">Neural Link Established</p>
           </div>
           <p className="text-white text-lg md:text-2xl font-semibold leading-relaxed italic tracking-tight">"{commentary}"</p>
        </div>
      )}

      <div className={`relative ${sizeClasses[size]} overflow-visible bg-indigo-900/5 rounded-full flex items-center justify-center`}>
        <Canvas gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 8], fov: 40 }}>
           <Suspense fallback={<Html center><div className="text-indigo-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Establishing Node...</div></Html>}>
             <Float speed={3} rotationIntensity={0.5} floatIntensity={1}>
                <NeuralCore isSpeaking={isSpeaking} />
             </Float>
             <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
             {/* @ts-ignore */}
             <ambientLight intensity={1.5} />
             {/* @ts-ignore */}
             <pointLight position={[10, 10, 10]} intensity={3} color="#818cf8" />
             <Sparkles count={80} scale={6} size={2.5} speed={0.5} opacity={0.4} color="#818cf8" />
           </Suspense>
        </Canvas>

        {/* Decorative HUD Rims */}
        <div className="absolute inset-[-10%] border border-white/5 rounded-full animate-[spin_60s_linear_infinite] pointer-events-none" />
        <div className="absolute inset-[-15%] border border-indigo-500/10 rounded-full animate-[spin_40s_linear_infinite_reverse] pointer-events-none" />
      </div>

      {isLarge && (
        <div className="mt-10 text-center animate-in fade-in duration-1000 z-10">
           <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white">BODHINI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">PRIME</span></h2>
           <div className="flex items-center justify-center gap-4 mt-5 bg-slate-900/60 py-3.5 px-10 rounded-full border border-white/10 backdrop-blur-3xl inline-flex shadow-xl">
             <div className={`w-2.5 h-2.5 rounded-full ${isSpeaking ? 'bg-indigo-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
             <span className="text-[11px] font-black uppercase tracking-[0.45em] text-indigo-400/90">{isSpeaking ? 'ACTIVE BROADCAST' : 'SYSTEM READY'}</span>
           </div>
        </div>
      )}
    </div>
  );
};