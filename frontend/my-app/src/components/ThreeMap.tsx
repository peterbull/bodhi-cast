import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const ThreeMap = () => {
  const mountRef = useRef<any>(null);

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    mountRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);

      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      renderer.render(scene, camera);
    };

    animate();

    // Clean up on unmount
    return () => {
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []); // Empty array ensures effect is only run on mount and unmount

  if (!mountRef.current) {
    return <div>Loading...</div>;
  }

  return <div ref={mountRef}></div>;
};

export default ThreeMap;