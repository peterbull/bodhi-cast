import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import circleImg from "../img/circle.png";
import { Suspense, useCallback, useMemo, useRef, useEffect } from "react";

function CameraControls() {
  const {
    camera,
    gl: { domElement },
  } = useThree();

  const controlsRef = useRef<any>();

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 50);
      controlsRef.current.update();
    }
  }, []);

  useFrame(() => controlsRef.current.update());

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, domElement]}
      // autoRotate
      // autoRotateSpeed={-0.2}
    />
  );
}

function Points({ spotForecast }: any) {
  const imgTex = useLoader(THREE.TextureLoader, circleImg);
  const bufferRef = useRef<any>();
  console.log(spotForecast);
  let t = 0;
  let f = 0.001;
  let a = 1.5;
  const graph = useCallback(
    (x: any, z: any) => {
      // Assuming t is time and it's being updated elsewhere in your useFrame or animation loop
      // Wave parameters
      const waveSpeed = 0.002; // Adjust this for faster or slower wave propagation
      const waveFrequency = 1 / spotForecast[0].swper; // Adjust this for tighter or looser waves
      const waveAmplitude = spotForecast[0].swh; // Adjust this for higher or lower waves

      // Ocean-like wave equation: A sine function for wave propagation along the z-axis
      const y = waveAmplitude * Math.sin(waveFrequency * z - waveSpeed * t);

      return y;
    },
    [t, spotForecast] // Only t is a dependency here since other variables are constants
  );

  const count = 100;
  const sep = 1;
  let positions = useMemo(() => {
    let positions = [];

    for (let xi = 0; xi < count; xi++) {
      for (let zi = 0; zi < count; zi++) {
        let x = sep * (xi - count / 2);
        let z = sep * zi;
        let y = graph(x, z);
        positions.push(x, y, z);
      }
    }

    return new Float32Array(positions);
  }, [count, sep, graph]);

  useFrame(() => {
    t += 15;

    const positions = bufferRef.current.array;

    let i = 0;
    for (let xi = 0; xi < count; xi++) {
      for (let zi = 0; zi < count; zi++) {
        let x = sep * (xi - count / 2);
        let z = sep * zi;

        positions[i + 1] = graph(x, z);
        i += 3;
      }
    }

    bufferRef.current.needsUpdate = true;
  });

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

function AnimationCanvas({ spotForecast }: any) {
  return (
    <Canvas camera={{ position: [10, 10, 0], fov: 50 }}>
      <Suspense fallback={null}>
        <axesHelper args={[5]} />
        <Points spotForecast={spotForecast} />
      </Suspense>
      <CameraControls />
    </Canvas>
  );
}

const SwellSim: React.FC<any> = ({ spotForecast }) => {
  return (
    <div className="anim pb-10 h-[300px]">
      <Suspense fallback={<div>Loading...</div>}>
        <AnimationCanvas spotForecast={spotForecast} />
      </Suspense>
    </div>
  );
};

export default SwellSim;