import React, { useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";
import globeSpecularMap from "../img/earth-water.png";
import globeEarthTopology from "../img/earth-topology.png";
import globeEarthNightSky from "../img/night-sky.png";
import { SwellData } from "../App";
import * as THREE from "three";
// import { tween } from "d3.transition";

const globeMaterial = new THREE.MeshPhongMaterial();
globeMaterial.bumpScale = 10;
new THREE.TextureLoader().load(globeSpecularMap, (texture) => {
  globeMaterial.specularMap = texture;
  globeMaterial.specular = new THREE.Color("grey");
  globeMaterial.shininess = 15;
});

const GlobeSpots: React.FC<any> = ({ spots }) => {
  const globeEl = useRef<any>();

  useEffect(() => {
    const directionalLight = globeEl.current
      .lights()
      .find((obj3d: any) => obj3d.type === "DirectionalLight");
    directionalLight && directionalLight.position.set(1, 1, 1); // change light position to see the specularMap's effect
  }, []);

  useEffect(() => {
    globeEl.current.pointOfView({
      lat: spots[0].latitude,
      lng: spots[0].longitude,
    });
  });

  return (
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
  );
};

export default GlobeSpots;
