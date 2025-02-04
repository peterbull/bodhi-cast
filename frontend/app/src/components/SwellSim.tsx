import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import circleImg from "../img/circle.png";
import { Suspense, useCallback, useMemo, useRef, useEffect} from "react";
import {  useSpotForecasts} from "@/hooks/useSpotForecasts";
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useParams } from "@tanstack/react-router";
import { useSpots } from "@/hooks/useSpots";

function CameraControls() {
  const {
    gl: { domElement },
  } = useThree();

  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (controlsRef.current) { 
      controlsRef.current.target.set(0, 0, 50);
      controlsRef.current.update();
    }
  }, []);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
      
      const enableControls = () => {
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      };

      domElement.addEventListener("click", enableControls);

      return () => {
        domElement.removeEventListener("click", enableControls);
      };
    }
  }, [domElement]);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      // args={[camera, domElement]}
      // autoRotate
      // autoRotateSpeed={-0.2}
    />
  );
}


function Points() {
  const { spotId } = useParams({
    from: '/spots/$spotId',
  }); 
  const { spot }= useSpots(Number(spotId));
  const { spotForecasts } = useSpotForecasts(spot) 
  const imgTex = useLoader(THREE.TextureLoader, circleImg);
  const bufferRef = useRef<THREE.BufferAttribute>(null);
  const tRef = useRef(0);
  
  const forecastRef = useRef({
    waveSpeed: 0,
    period: 0,
    amplitude: 0
  });

  useEffect(() => {
    const currentForecast = spotForecasts?.[0];
    if (currentForecast) {
      const feetFactor = 3.28084;
      forecastRef.current = {
        waveSpeed: 1 / ((currentForecast?.swper ?? currentForecast?.perpw) ?? 1),
        period: currentForecast?.swper ?? currentForecast?.perpw ?? 1,
        amplitude: (currentForecast?.swh ?? 1) * feetFactor
      };
    }
  }, [spotForecasts]);

  const graph = useCallback((z: number) => {
    const { waveSpeed, period, amplitude } = forecastRef.current;
    const waveFrequency = 1 / period;
    const y = amplitude * Math.sin(waveFrequency * z + (waveSpeed + tRef.current) / 2);
    return y > 0 ? y : 0;
  }, []); 

  const count = 200;
  const sep = 1;
 
  // initial positions
  const positions = useMemo(() => {
    const pos = new Float32Array(count * count * 3);
    let i = 0;
    for (let xi = 0; xi < count; xi++) {
      for (let zi = 0; zi < count; zi++) {
        pos[i] = sep * (xi - count / 2);
        pos[i + 1] = 0; 
        pos[i + 2] = sep * zi;
        i += 3;
      }
    }
    return pos;
  }, [count, sep]);

  // create buffer 
  useEffect(() => {
    if (bufferRef.current) {
      bufferRef.current.array = positions;
      bufferRef.current.needsUpdate = true;
    }
  }, [positions]);

  useFrame((state) => {
    tRef.current = state.clock.getElapsedTime();

    if (!bufferRef.current) return;

    const positions = bufferRef.current.array;
    let i = 0;
    for (let xi = 0; xi < count; xi++) {
      for (let zi = 0; zi < count; zi++) {
        positions[i + 1] = graph(sep * zi);
        i += 3;
      }
    }
    bufferRef.current.needsUpdate = true;
  });

  if (!spotForecasts?.[0]) return null;

  return (
    <points>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          ref={bufferRef}
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>

      <pointsMaterial
        attach="material"
        map={imgTex}
        color={0x03e9f4}
        size={0.8}
        sizeAttenuation
        transparent={false}
        alphaTest={0.5}
        opacity={1.0}
      />
    </points>
  );
}



function AnimationCanvas() {
  return (
    <Canvas camera={{ position: [10, 20, 0], fov: 50 }}>
      <Suspense fallback={null}>
        <axesHelper args={[5]} />
        <Points />
      </Suspense>
      <CameraControls />
    </Canvas>
  );
}

const SwellSim = () => {
  return (
    <div className="anim pb-10 h-[300px]">
      <Suspense fallback={<div>Loading...</div>}>
        <AnimationCanvas />
      </Suspense>
    </div>
  );
};

export default SwellSim;
