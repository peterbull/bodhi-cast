import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import Map from "react-map-gl/maplibre";
// import { Canvas } from "react-three-map/maplibre";
import { Canvas } from "react-three-map"; // if you are using MapBox

function Box(props: any) {
  // This reference will give us direct access to the mesh
  const meshRef = useRef<any>();
  // Set up state for the hovered and active state
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => (meshRef.current.rotation.x += delta));
  // Return view, these are regular three.js elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={meshRef}
      scale={active ? 1.5 : 1}
      onClick={(event) => setActive(!active)}
      onPointerOver={(event) => setHover(true)}
      onPointerOut={(event) => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? "hotpink" : "orange"} />
    </mesh>
  );
}

const SwellMapThree: React.FC<any> = ({ currentSpot, tileData, zoom }) => {
  return (
    <Map
      mapLib={import("mapbox-gl")}
      initialViewState={{
        latitude: currentSpot.latitude,
        longitude: currentSpot.longitude,
        zoom: zoom,
        pitch: 45,
      }}
      mapStyle="mapbox://styles/mapbox/standard"
      mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
    >
      <Canvas latitude={currentSpot.latitude} longitude={currentSpot.longitude}>
        <hemisphereLight args={["#ffffff", "#60666C"]} position={[1, 4.5, 3]} />
        <object3D scale={100}>
          <Box position={[-1.2, 1, 0]} />
          <Box position={[1.2, 1, 0]} />
        </object3D>
      </Canvas>
    </Map>
  );
};

export default SwellMapThree;
