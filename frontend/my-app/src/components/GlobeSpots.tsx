import React, { useContext, useEffect, useRef, useState } from "react";
import { ComponentMapContext } from "../contexts/ComponentMapProvider";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";
import globeSpecularMap from "../img/earth-water.png";
import globeEarthTopology from "../img/earth-topology.png";
import globeEarthNightSky from "../img/night-sky.png";
import * as THREE from "three";
import SwellMap from "./SwellMap";

const globeMaterial = new THREE.MeshPhongMaterial();
globeMaterial.bumpScale = 10;
new THREE.TextureLoader().load(globeSpecularMap, (texture) => {
  globeMaterial.specularMap = texture;
  globeMaterial.specular = new THREE.Color("grey");
  globeMaterial.shininess = 15;
});

const GlobeSpots: React.FC<any> = ({
  setCurrentComponent,
  setCurrentSpot,
  spots,
}) => {
  const globeEl = useRef<any>();
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
        altitude: 1.8,
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
      labelDotRadius={0.5}
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
            altitude: 0.1,
          },
          2500
        );
        setCurrentSpot(spots.find((spot: any) => spot.id === label.id));
        setTimeout(() => {
          setCurrentComponent("SwellMapThree");
        }, 2500);
      }}
    />
  ) : (
    <p>Loading...</p>
  );
};

export default GlobeSpots;
