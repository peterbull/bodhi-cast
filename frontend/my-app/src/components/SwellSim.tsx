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

  // Set intial camera view and controls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 50);
      controlsRef.current.update();
    }
  }, []);

  useEffect(() => {
    controlsRef.current.enabled = false;
    domElement.addEventListener("click", () => {
      controlsRef.current.enabled = true;
    });
  }, [domElement]);

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
  const feetFactor = 3.28084;

  let t = 0;
  const waveSpeed =
    1 /
    (spotForecast[0].swper > 0 ? spotForecast[0].swper : spotForecast[0].perpw);
  const graph = useCallback(
    (z: any) => {
      // Wave parameters
      // const waveSpeed = 0.0005; // Adjust this for faster or slower wave propagation
      const waveFrequency =
        1 /
        (spotForecast[0].swper > 0
          ? spotForecast[0].swper
          : spotForecast[0].perpw); // Adjust this for tighter or looser waves
      const waveAmplitude = spotForecast[0].swh * feetFactor; // Adjust this for higher or lower waves

      // Sine function for wave propagation along the z-axis
      let y = waveAmplitude * Math.sin(waveFrequency * z + (waveSpeed + t) / 2);

      return y > 0 ? y : 0;
    },
    [t, waveSpeed, spotForecast]
  );

  const count = 200;
  const sep = 1;
  let positions = useMemo(() => {
    let positions = [];

    for (let xi = 0; xi < count; xi++) {
      for (let zi = 0; zi < count; zi++) {
        let x = sep * (xi - count / 2);
        let z = sep * zi;
        let y = graph(z);
        positions.push(x, y, z);
      }
    }

    return new Float32Array(positions);
  }, [count, sep, graph]);

  useFrame((state) => {
    const elapsedTime = state.clock.getElapsedTime();
    // t += 15;
    t = elapsedTime;

    const positions = bufferRef.current.array;

    let i = 0;
    for (let xi = 0; xi < count; xi++) {
      for (let zi = 0; zi < count; zi++) {
        let z = sep * zi;

        positions[i + 1] = graph(z);
        i += 3;
      }
    }
    // Alert that values have changed and buffer needs updating
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
    <Canvas camera={{ position: [10, 20, 0], fov: 50 }}>
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
