import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import circleImg from "../img/circle.png";
import { Suspense, useCallback, useMemo, useRef } from "react";

function CameraControls() {
  const {
    camera,
    gl: { domElement },
  } = useThree();

  const controlsRef = useRef<any>();
  useFrame(() => controlsRef.current.update());

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, domElement]}
      autoRotate
      autoRotateSpeed={-0.2}
    />
  );
}

function Points() {
  const imgTex = useLoader(THREE.TextureLoader, circleImg);
  const bufferRef = useRef<any>();

  let t = 0;
  let f = 0.002;
  let a = 3;
  const graph = useCallback(
    (x: any, z: any) => {
      return Math.sin(f * (x ** 2 + z ** 2 + t)) * a;
    },
    [t, f, a]
  );

  const count = 100;
  const sep = 3;
  let positions = useMemo(() => {
    let positions = [];

    for (let xi = 0; xi < count; xi++) {
      for (let zi = 0; zi < count; zi++) {
        let x = sep * (xi - count / 2);
        let z = sep * (zi - count / 2);
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
        let z = sep * (zi - count / 2);

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
        color={0x00aaff}
        size={0.5}
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
    <Canvas camera={{ position: [100, 10, 0], fov: 75 }}>
      <Suspense fallback={null}>
        <Points />
      </Suspense>
      <CameraControls />
    </Canvas>
  );
}

function WaveSim() {
  return (
    <div className="anim pb-40 h-[500px]">
      <Suspense fallback={<div>Loading...</div>}>
        <AnimationCanvas />
      </Suspense>
    </div>
  );
}

export default WaveSim;
