import { useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";
import globeSpecularMap from "../img/earth-water.png";
import globeEarthTopology from "../img/earth-topology.png";
import globeEarthNightSky from "../img/night-sky.png";
import { MeshPhongMaterial, TextureLoader, Color } from "three";

const globeMaterial = new MeshPhongMaterial();
globeMaterial.bumpScale = 10;
new TextureLoader().load(globeSpecularMap, (texture) => {
  globeMaterial.specularMap = texture;
  globeMaterial.specular = new Color("grey");
  globeMaterial.shininess = 15;
});

const GlobeBump: any = ({ swellData }: any) => {
  const globeEl = useRef<any>();

  useEffect(() => {
    const directionalLight = globeEl.current
      .lights()
      .find((obj3d: any) => obj3d.type === "DirectionalLight");
    directionalLight && directionalLight.position.set(1, 1, 1); // change light position to see the specularMap's effect
  }, []);

  return (
    <Globe
      ref={globeEl}
      globeMaterial={globeMaterial}
      globeImageUrl={globeImageUrl}
      bumpImageUrl={globeEarthTopology}
      backgroundImageUrl={globeEarthNightSky}
      heatmapsData={[swellData.locations]}
      heatmapPointLat="lat"
      heatmapPointLng="lon"
      heatmapPointWeight="swell"
      heatmapTopAltitude={swellData.maxSwell * 0.1}
      heatmapsTransitionDuration={0}
      enablePointerInteraction={true}
    />
  );
};

export default GlobeBump;
