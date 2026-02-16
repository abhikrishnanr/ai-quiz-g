
import React, { useRef, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useGraph } from '@react-three/fiber';
import { useGLTF, Sparkles, Float, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Fix: Declare R3F intrinsic elements as constants to bypass JSX.IntrinsicElements errors
const Primitive = 'primitive' as any;
const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;
const SpotLight = 'spotLight' as any;

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const AvatarModel = ({ isSpeaking }: { isSpeaking?: boolean }) => {
  // Loading a high-quality human lady model
  const { scene } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/woman/model.gltf');
  
  // Create a unique instance of the scene nodes and materials
  const { nodes, materials } = useGraph(scene);
  
  const headRef = useRef<THREE.Object3D | null>(null);
  const mouthRef = useRef<THREE.Object3D | null>(null);
  const leftEyeRef = useRef<THREE.Object3D | null>(null);
  const rightEyeRef = useRef<THREE.Object3D | null>(null);

  // Holographic Material Definition
  const holoMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#818cf8'),
    emissive: new THREE.Color('#4f46e5'),
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8,
    wireframe: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), []);

  useEffect(() => {
    // Traverse the scene and find specific bones/meshes for animation
    Object.values(nodes).forEach((node: any) => {
      if (node.isMesh) {
        node.material = holoMaterial;
      }
      
      const name = node.name.toLowerCase();
      if (name.includes('head')) headRef.current = node;
      if (name.includes('eye_l')) leftEyeRef.current = node;
      if (name.includes('eye_r')) rightEyeRef.current = node;
      if (name.includes('mouth') || name.includes('jaw') || name.includes('lips')) mouthRef.current = node;
    });
  }, [nodes, holoMaterial]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const mouse = state.mouse;

    // 1. Procedural Head Sway & Look At Mouse
    if (headRef.current) {
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, mouse.x * 0.3, 0.1);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -mouse.y * 0.2, 0.1);
    }

    // 2. Procedural Lip Sync (Jaw movement)
    if (mouthRef.current) {
      if (isSpeaking) {
        const mouthOpen = 1.0 + Math.sin(t * 15.0) * 0.3 + Math.random() * 0.1;
        mouthRef.current.scale.z = THREE.MathUtils.lerp(mouthRef.current.scale.z, mouthOpen, 0.4);
      } else {
        mouthRef.current.scale.z = THREE.MathUtils.lerp(mouthRef.current.scale.z, 1.0, 0.1);
      }
    }

    // 3. Subtle Breathing & Blinking
    const blink = Math.sin(t * 0.5) > 0.98 ? 0.1 : 1.0;
    if (leftEyeRef.current) leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, blink, 0.2);
    if (rightEyeRef.current) rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, blink, 0.2);
    
    // Pulse emission when speaking
    if (isSpeaking) {
      holoMaterial.emissiveIntensity = 0.5 + Math.sin(t * 20.0) * 0.3;
    } else {
      holoMaterial.emissiveIntensity = 0.5;
    }
  });

  // Fix: Use declared constant for primitive
  return (
    <Primitive 
      object={scene} 
      position={[0, -1.8, 0]} 
      scale={2.0} 
    />
  );
};

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, commentary, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-48 h-48',
    lg: 'w-80 h-80',
    xl: 'w-[500px] h-[500px] md:w-[600px] md:h-[600px]'
  };

  const isLarge = size === 'xl' || size === 'lg';

  return (
    <div className={`relative flex items-center justify-center ${isLarge ? 'flex-col' : ''}`}>
      {commentary && (
        <div className={`absolute z-50 ${isLarge ? 'bottom-[95%] mb-12 animate-in zoom-in slide-in-from-bottom' : 'left-full ml-6 w-72'} bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/30 p-8 rounded-[2.5rem] shadow-[0_30px_90px_rgba(0,0,0,0.8)] max-w-xl text-center ring-1 ring-white/10`}>
           <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.5em]">Neural Link Established</p>
           </div>
           <p className="text-white text-xl md:text-2xl font-semibold leading-relaxed font-sans italic tracking-tight">"{commentary}"</p>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-4 h-4 bg-slate-900/95 rotate-45 border-r border-indigo-500/30 border-b border-indigo-500/30" />
        </div>
      )}

      <div className={`relative ${sizeClasses[size]} overflow-visible`}>
        {/* Glow behind the model */}
        <div className="absolute inset-0 bg-indigo-600/10 rounded-full blur-[80px] animate-pulse pointer-events-none" />
        
        <Canvas gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
           <PerspectiveCamera makeDefault position={[0, 0, 4.5]} fov={30} />
           
           <Suspense fallback={<Html center><div className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Initializing...</div></Html>}>
             <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.1}>
                <AvatarModel isSpeaking={isSpeaking} />
             </Float>
             
             {/* Studio Lighting - Fix: Use declared constants */}
             <AmbientLight intensity={0.4} />
             <PointLight position={[10, 10, 10]} intensity={1.5} color="#818cf8" />
             <PointLight position={[-10, 5, 5]} intensity={1} color="#22d3ee" />
             <SpotLight position={[0, 5, 2]} intensity={2} angle={0.4} penumbra={1} castShadow />
             
             <Sparkles count={40} scale={4} size={3} speed={0.4} opacity={0.3} color="#818cf8" />
           </Suspense>
        </Canvas>

        {/* HUD Elements */}
        <div className="absolute inset-[-20%] pointer-events-none border border-white/5 rounded-full animate-[spin_30s_linear_infinite]" />
        <div className="absolute inset-[-15%] pointer-events-none border border-indigo-500/10 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
      </div>

      {isLarge && (
        <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom duration-1000 z-10">
           <h2 className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">BODHINI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">PRIME</span></h2>
           <div className="flex items-center justify-center gap-4 mt-4 bg-slate-900/60 py-3 px-8 rounded-full border border-white/5 backdrop-blur-2xl inline-flex shadow-xl">
             <div className="flex gap-1">
                {[1,2,3].map(i => (
                  <div key={i} className={`w-1 h-3 rounded-full ${isSpeaking ? 'bg-indigo-400 animate-bounce' : 'bg-slate-700'}`} style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400/80">{isSpeaking ? 'Neural Synthesis Active' : 'Uplink Nominal'}</span>
           </div>
        </div>
      )}
    </div>
  );
};

useGLTF.preload('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/woman/model.gltf');
