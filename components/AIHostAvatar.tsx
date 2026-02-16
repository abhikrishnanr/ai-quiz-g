import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Sparkles, Float, Plane, Ring, Html } from '@react-three/drei';
import * as THREE from 'three';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const HologramMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uTexture: { value: new THREE.Texture() },
    uSpeaking: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform sampler2D uTexture;
    uniform float uSpeaking;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      
      // Subtle float distortion
      float breath = sin(uTime * 1.5) * 0.001;
      uv.y += breath;

      // Glitch effect when speaking
      if (uSpeaking > 0.5) {
        float glitch = sin(uv.y * 50.0 + uTime * 20.0) * 0.002;
        uv.x += glitch;
      }

      vec4 texColor = texture2D(uTexture, uv);
      vec3 color = texColor.rgb;
      
      // Dynamic Scanlines
      float scanline = sin(uv.y * 180.0 - uTime * 3.0) * 0.04;
      color -= scanline;

      // Vignette to blend edges
      float dist = distance(vUv, vec2(0.5));
      color *= smoothstep(0.85, 0.25, dist);

      // Warm glow when synthesis is active
      if (uSpeaking > 0.5) {
         color += vec3(0.08, 0.03, 0.0) * (0.5 + 0.5 * sin(uTime * 15.0));
      }

      gl_FragColor = vec4(color, texColor.a);
    }
  `
};

const CyberEyeOverlay = () => {
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const mouse = state.mouse;

    if (leftEyeRef.current && rightEyeRef.current) {
       const targetX = mouse.x * 0.1;
       const targetY = mouse.y * 0.1;
       
       leftEyeRef.current.position.x = THREE.MathUtils.lerp(leftEyeRef.current.position.x, -0.28 + targetX, 0.1);
       leftEyeRef.current.position.y = THREE.MathUtils.lerp(leftEyeRef.current.position.y, 0.28 + targetY, 0.1);
       
       rightEyeRef.current.position.x = THREE.MathUtils.lerp(rightEyeRef.current.position.x, 0.18 + targetX, 0.1);
       rightEyeRef.current.position.y = THREE.MathUtils.lerp(rightEyeRef.current.position.y, 0.28 + targetY, 0.1);
       
       const s = 1 + Math.sin(t * 4) * 0.03;
       leftEyeRef.current.scale.set(s, s, 1);
       rightEyeRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={[0, 0, 0.02]}>
       <group ref={leftEyeRef} position={[-0.28, 0.28, 0]}>
          <Ring args={[0.035, 0.042, 32]}>
             <meshBasicMaterial color="#00ffcc" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
          </Ring>
       </group>
       <group ref={rightEyeRef} position={[0.18, 0.28, 0]}>
          <Ring args={[0.035, 0.042, 32]}>
             <meshBasicMaterial color="#00ffcc" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
          </Ring>
       </group>
    </group>
  );
};

const PhotoAvatar = ({ isSpeaking }: { isSpeaking?: boolean }) => {
  const texture = useTexture('https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=800&auto=format&fit=crop');
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      shaderRef.current.uniforms.uSpeaking.value = isSpeaking ? 1.0 : 0.0;
    }
  });

  return (
    <group>
      <Plane args={[3.4, 3.4]} position={[0, -0.1, 0]}>
        <shaderMaterial
          ref={shaderRef}
          args={[HologramMaterial]}
          uniforms-uTexture-value={texture}
          transparent
        />
      </Plane>
      <CyberEyeOverlay />
    </group>
  );
};

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, commentary, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-40 h-40',
    lg: 'w-72 h-72',
    xl: 'w-[500px] h-[500px] md:w-[600px] md:h-[600px]'
  };

  const isLarge = size === 'xl' || size === 'lg';

  return (
    <div className={`relative flex items-center justify-center ${isLarge ? 'flex-col' : ''}`}>
      {commentary && (
        <div className={`absolute z-50 ${isLarge ? 'bottom-[85%] mb-8 animate-in zoom-in slide-in-from-bottom' : 'left-full ml-4 w-64'} bg-slate-900/90 backdrop-blur-xl border border-amber-500/40 p-6 rounded-[2rem] shadow-[0_10px_50px_rgba(0,0,0,0.6)] max-w-lg text-center`}>
           <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Bodhini Neural Feed</p>
           <p className="text-white text-lg md:text-xl font-medium leading-relaxed font-sans italic">"{commentary}"</p>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-4 h-4 bg-slate-900/90 rotate-45 border-r border-amber-500/40 border-b border-amber-500/40" />
        </div>
      )}

      <div className={`relative ${sizeClasses[size]}`}>
        <div className="absolute inset-0 bg-amber-600/5 rounded-full blur-[70px] animate-pulse pointer-events-none" />
        <Canvas camera={{ position: [0, 0, 3.8], fov: 45 }} gl={{ alpha: true, antialias: true }}>
           <Suspense fallback={<Html center><div className="text-amber-500 text-xs uppercase tracking-widest animate-pulse">Establishing Link...</div></Html>}>
             <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.1}>
                <PhotoAvatar isSpeaking={isSpeaking} />
             </Float>
             <Sparkles count={50} scale={4} size={4} speed={0.3} opacity={0.3} color="#ffd700" />
           </Suspense>
        </Canvas>
      </div>

      {isLarge && (
        <div className="mt-4 text-center animate-in fade-in slide-in-from-bottom duration-1000 z-10">
           <h2 className="text-4xl font-black italic tracking-tighter text-white drop-shadow-lg">BODHINI <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">PRIME</span></h2>
           <div className="flex items-center justify-center gap-3 mt-3 bg-slate-900/50 py-2 px-6 rounded-full border border-white/5 backdrop-blur-md inline-flex">
             <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
             <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">{isSpeaking ? 'Neural Synthesis Active' : 'Uplink Nominal'}</span>
           </div>
        </div>
      )}
    </div>
  );
};