import { useEffect, useRef, useState } from "react";
import Map from "react-map-gl/maplibre";
// import { Canvas } from "react-three-map/maplibre";
import { Canvas, Coordinates } from "react-three-map";

function SimpleBox() {
  const meshRef = useRef<any>();
  const [hovered, setHover] = useState(false);

  return (
    <mesh
      ref={meshRef}
      scale={hovered ? 1.5 : 1}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[10, 10, 10]} />
      <meshStandardMaterial color={"white"} />
    </mesh>
  );
}

const SwellMapThree: React.FC<any> = ({ currentSpot, tileData, zoom }) => {
  const mapRef = useRef<any>();

  return (
    <Map
      ref={mapRef}
      // mapLib={import("mapbox-gl")}
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
        <Coordinates
          latitude={currentSpot.latitude}
          longitude={currentSpot.longitude}
        >
          <SimpleBox />
        </Coordinates>
        {tileData.map((data: any) => {
          console.log(data.latitude, data.longitude, data.id);
          return (
            // Added return statement here
            <Coordinates
              key={data.id} // Ensure key prop is unique for each child
              latitude={data.latitude}
              longitude={data.longitude}
            >
              <SimpleBox key={`box-${data.id}`} />
            </Coordinates>
          );
        })}
      </Canvas>
    </Map>
  );
};

export default SwellMapThree;
