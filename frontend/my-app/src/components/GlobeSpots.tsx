import React, { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";
import globeSpecularMap from "../img/earth-water.png";
import globeEarthTopology from "../img/earth-topology.png";
import globeEarthNightSky from "../img/night-sky.png";
import * as THREE from "three";

const globeMaterial = new THREE.MeshPhongMaterial();
globeMaterial.bumpScale = 10;
new THREE.TextureLoader().load(globeSpecularMap, (texture) => {
  globeMaterial.specularMap = texture;
  globeMaterial.specular = new THREE.Color("grey");
  globeMaterial.shininess = 15;
});

const GlobeSpots: React.FC<any> = () => {
  const globeEl = useRef<any>();
  const [spots, setSpots] = useState<any>([]);

  useEffect(() => {
    const fetchAllSpots = async () => {
      try {
        const res = await fetch("http://localhost:8000/spots");
        const data = await res.json();
        setSpots(data);
      } catch (error) {
        console.error("Error fetching spot data:", error);
      }
    };

    fetchAllSpots();
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      const directionalLight = globeEl.current
        .lights()
        .find((obj3d: any) => obj3d.type === "DirectionalLight");
      directionalLight && directionalLight.position.set(1, 1, 1); // change light position to see the specularMap's effect
    }
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({
        lat: spots[0].latitude,
        lng: spots[0].longitude,
      });
    }
  });

  return spots.length > 0 ? (
    <Globe
      ref={globeEl}
      globeMaterial={globeMaterial}
      globeImageUrl={globeImageUrl}
      bumpImageUrl={globeEarthTopology}
      backgroundImageUrl={globeEarthNightSky}
      labelsData={spots}
      labelLat="latitude"
      labelLng="longitude"
      labelText="spot_name"
      labelSize={0.0}
      labelDotRadius={0.4}
      labelColor={() => "rgba(164, 255, 61, 0.5)"}
      labelLabel={(spot: any) =>
        `<div>
          <b>${spot.spot_name}</b>
        </div>`
      }
      onLabelClick={(label: any) => {
        globeEl.current.pointOfView(
          {
            lat: label.latitude,
            lng: label.longitude,
            altitude: 0.25,
          },
          2500
        );
      }}
    />
  ) : (
    <p>Loading...</p>
  );
};

export default GlobeSpots;
