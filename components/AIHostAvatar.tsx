import React, { useRef, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Sparkles, Float, Html, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Custom Holographic Shader Material for the 3D Model
const HologramMaterial = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.DoubleSide,
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#6366f1') }, // Indigo
    uSpeaking: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      
      // Subtle vertex wobble based on time
      vec3 pos = position;
      float strength = 0.005;
      pos.x += sin(pos.y * 10.0 + uTime * 2.0) * strength;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uSpeaking;

    void main() {
      // Fresnel effect for that holographic glow on edges
      float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
      
      // Moving scanlines
      float scanline = sin(vPosition.y * 100.0 - uTime * 5.0) * 0.1;
      
      // Digital glitch effect when speaking
      float glitch = 0.0;
      if (uSpeaking > 0.5) {
        glitch = step(0.98, sin(vPosition.y * 50.0 + uTime * 20.0)) * 0.2;
      }
      
      vec3 finalColor = uColor + (fresnel * 0.5) + glitch;
      float alpha = (fresnel * 0.8) + 0.1 + scanline;
      
      // Add extra brightness when speaking
      if (uSpeaking > 0.5) {
        alpha += 0.1 * sin(uTime * 15.0);
      }

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
});

const AvatarModel = ({ isSpeaking }: { isSpeaking?: boolean }) => {
  // Using a high-quality public GLTF of a woman
  const { scene, nodes, materials } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/woman/model.gltf');
  const group = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Object3D | null>(null);
  const leftEyeRef = useRef<THREE.Object3D | null>(null);
  const rightEyeRef = useRef<THREE.Object3D | null>(null);
  const mouthRef = useRef<THREE.Object3D | null>(null);

  // Initialize refs for specific parts of the rigged model
  useEffect(() => {
    scene.traverse((child: any) => {
      // Apply holographic material to all meshes
      if (child.isMesh) {
        child.material = HologramMaterial.clone();
      }
      // Identify key joints/bones for animation (specific to this GLTF structure)
      if (child.name.toLocaleLowerCase().includes('head')) headRef.current = child;
      if (child.name.toLocaleLowerCase().includes('eye_l')) leftEyeRef.current = child;
      if (child.name.toLocaleLowerCase().includes('eye_r')) rightEyeRef.current = child;
      if (child.name.toLocaleLowerCase().includes('mouth') || child.name.toLocaleLowerCase().includes('jaw')) mouthRef.current = child;
    });
  }, [scene]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const mouse = state.mouse;

    // 1. Procedural Head Movement (Look at mouse)
    if (headRef.current) {
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, mouse.x * 0.4, 0.1);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -mouse.y * 0.2, 0.1);
    }

    // 2. Procedural Blinking
    const blink = Math.sin(t * 0.5) > 0.98 ? 0.1 : 1.0;
    if (leftEyeRef.current) leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, blink, 0.2);
    if (rightEyeRef.current) rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, blink, 0.2);

    // 3. Procedural Lip Sync
    if (mouthRef.current) {
      if (isSpeaking) {
        // Rapid oscillation when speaking to simulate phonemes
        const mouthOpen = 1.0 + Math.sin(t * 18.0) * 0.4 + Math.random() * 0.2;
        mouthRef.current.scale.z = THREE.MathUtils.lerp(mouthRef.current.scale.z, mouthOpen, 0.3);
        mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, mouthOpen * 0.8, 0.3);
      } else {
        mouthRef.current.scale.z = THREE.MathUtils.lerp(mouthRef.current.scale.z, 1.0, 0.1);
        mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, 1.0, 0.1);
      }
    }

    // 4. Update Shader Uniforms for all meshes
    scene.traverse((child: any) => {
      if (child.isMesh && child.material.uniforms) {
        child.material.uniforms.uTime.value = t;
        child.material.uniforms.uSpeaking.value = isSpeaking ? 1.0 : 0.0;
      }
    });
  });

  return (
    <primitive 
      ref={group} 
      object={scene} 
      position={[0, -2.5, 0]} 
      scale={2.2} 
      rotation={[0, 0, 0]} 
    />
  );
};

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, commentary, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-48 h-48',
    lg: 'w-80 h-80',
    xl: 'w-[600px] h-[600px] md:w-[700px] md:h-[700px]'
  };

  const isLarge = size === 'xl' || size === 'lg';

  return (
    <div className={`relative flex items-center justify-center ${isLarge ? 'flex-col' : ''}`}>
      {commentary && (
        <div className={`absolute z-50 ${isLarge ? 'bottom-[90%] mb-12 animate-in zoom-in slide-in-from-bottom duration-500' : 'left-full ml-6 w-72'} bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/30 p-8 rounded-[2.5rem] shadow-[0_20px_80px_rgba(0,0,0,0.8)] max-w-xl text-center ring-1 ring-white/10`}>
           <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.5em]">Neural Link Established</p>
           </div>
           <p className="text-white text-xl md:text-2xl font-semibold leading-relaxed font-sans italic tracking-tight">"{commentary}"</p>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-4 h-4 bg-slate-900/95 rotate-45 border-r border-indigo-500/30 border-b border-indigo-500/30" />
        </div>
      )}

      <div className={`relative ${sizeClasses[size]} transition-all duration-700`}>
        {/* Atmosphere Glow */}
        <div className="absolute inset-0 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
        
        <Canvas gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }} dpr={[1, 2]}>
           <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={35} />
           <Suspense fallback={<Html center><div className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Initializing Neural Link...</div></Html>}>
             <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
                <AvatarModel isSpeaking={isSpeaking} />
             </Float>
             
             {/* Dynamic digital particles */}
             <Sparkles count={80} scale={5} size={3} speed={0.4} opacity={0.4} color="#818cf8" />
             
             {/* Studio lighting for the 3D depth */}
             <pointLight position={[10, 10, 10]} intensity={1.5} color="#818cf8" />
             <pointLight position={[-10, 5, 5]} intensity={1} color="#22d3ee" />
             <spotLight position={[0, 5, 0]} intensity={2} angle={0.5} penumbra={1} />
             <Environment preset="city" />
           </Suspense>
        </Canvas>

        {/* Floating geometric HUD elements around avatar */}
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-white/5 rounded-full animate-[spin_20s_linear_infinite]" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-indigo-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
        </div>
      </div>

      {isLarge && (
        <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom duration-1000 z-10">
           <h2 className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">BODHINI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">PRIME</span></h2>
           <div className="flex items-center justify-center gap-4 mt-4 bg-slate-900/60 py-3 px-8 rounded-full border border-white/5 backdrop-blur-2xl inline-flex shadow-xl ring-1 ring-white/10">
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

// Preload the model
useGLTF.preload('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/woman/model.gltf');