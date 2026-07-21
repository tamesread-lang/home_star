"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useEditorStore } from "@/store/editor-store";

const GRID_SIZE = 50;

export default function ThreeScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const walls = useEditorStore((s) => s.walls);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const wallMeshesRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(1024, 1024);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x4a7cff, 0x2a2a4a);
    scene.add(gridHelper);

    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.01;
    plane.receiveShadow = true;
    scene.add(plane);

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let anim = true;
    const animate = () => {
      if (!anim) return;
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      anim = false;
      resizeObserver.disconnect();
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    for (const mesh of wallMeshesRef.current) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    wallMeshesRef.current = [];

    for (const wall of walls) {
      const dx = wall.end.x - wall.start.x;
      const dz = wall.end.y - wall.start.y;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length < 1) continue;

      const metersX = dx / GRID_SIZE;
      const metersZ = dz / GRID_SIZE;
      const wallLength = Math.sqrt(metersX * metersX + metersZ * metersZ);

      const geometry = new THREE.BoxGeometry(wall.width, wall.height, wallLength);
      const material = new THREE.MeshStandardMaterial({
        color: wall.id === useEditorStore.getState().selectedWallId ? 0x5a8cff : 0x4a7cff,
        roughness: 0.3,
        metalness: 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const midX = (wall.start.x + wall.end.x) / 2 / GRID_SIZE;
      const midZ = (wall.start.y + wall.end.y) / 2 / GRID_SIZE;
      mesh.position.set(midX, wall.height / 2, midZ);

      const angle = Math.atan2(metersX, metersZ);
      mesh.rotation.y = angle;

      scene.add(mesh);
      wallMeshesRef.current.push(mesh);
    }
  }, [walls]);

  return <div ref={containerRef} className="flex-1 min-h-0" />;
}
