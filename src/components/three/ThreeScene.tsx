"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useEditorStore } from "@/store/editor-store";
import type { Wall, Opening, FurnitureItem } from "@/types/editor";
import { RotateCcw, Eye, Box, Maximize2, Minimize2 } from "lucide-react";

const GRID_SIZE = 50;

function wallInMeters(wall: Wall) {
  const x1 = wall.x1 / GRID_SIZE;
  const y1 = wall.y1 / GRID_SIZE;
  const x2 = wall.x2 / GRID_SIZE;
  const y2 = wall.y2 / GRID_SIZE;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  return { x1, y1, x2, y2, dx, dy, len, angle: Math.atan2(dx, dy) };
}

function createWallMaterial(color: number, wireframe: boolean) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.0,
    wireframe,
  });
}

function buildWallSegment(
  wall: Wall,
  offsetStartM: number,
  offsetEndM: number,
  heightBottom: number,
  heightTop: number,
  isSelected: boolean,
  wireframe: boolean
): THREE.Mesh | null {
  const wm = wallInMeters(wall);
  const segLenM = offsetEndM - offsetStartM;
  const segHeight = heightTop - heightBottom;
  if (segLenM < 0.005 || segHeight < 0.005) return null;

  const centerFrac = (offsetStartM + offsetEndM) / 2 / wm.len;
  const cx = wm.x1 + centerFrac * wm.dx;
  const cz = wm.y1 + centerFrac * wm.dy;

  const baseColor = wall.wallType === "exterior" ? 0xe8e8e0 : 0xf0f0e8;
  const color = isSelected ? 0x4a7cff : baseColor;

  const geom = new THREE.BoxGeometry(wall.thickness, segHeight, segLenM);
  const mat = createWallMaterial(color, wireframe);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(cx, heightBottom + segHeight / 2, cz);
  mesh.rotation.y = wm.angle;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildOpeningFrame(
  wall: Wall,
  opening: Opening,
  wireframe: boolean
): THREE.Mesh | null {
  const wm = wallInMeters(wall);
  if (wm.len < 0.01) return null;

  const cx = wm.x1 + opening.position * wm.dx;
  const cz = wm.y1 + opening.position * wm.dy;
  const yPos =
    opening.type === "door"
      ? opening.height / 2
      : opening.sillHeight + opening.height / 2;

  const color = opening.type === "door" ? 0xc4956a : 0x88bbdd;
  const opacity = opening.type === "window" ? 0.4 : 1;
  const geom = new THREE.BoxGeometry(
    wall.thickness + 0.02,
    opening.height,
    opening.width
  );
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.05,
    transparent: opacity < 1,
    opacity,
    wireframe,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(cx, yPos, cz);
  mesh.rotation.y = wm.angle;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildWallMeshes(
  wall: Wall,
  wallOpenings: Opening[],
  wireframe: boolean,
  selectedWallId: string | null
): THREE.Object3D[] {
  const meshes: THREE.Object3D[] = [];
  const wm = wallInMeters(wall);
  if (wm.len < 0.005) return meshes;

  const isSelected = wall.id === selectedWallId;

  if (wallOpenings.length === 0) {
    const m = buildWallSegment(wall, 0, wm.len, 0, wall.height, isSelected, wireframe);
    if (m) meshes.push(m);
    return meshes;
  }

  const sorted = [...wallOpenings].sort((a, b) => a.position - b.position);
  let prevEnd = 0;

  for (const op of sorted) {
    const opCenter = op.position * wm.len;
    const opHalf = op.width / 2;
    const opStart = Math.max(0, opCenter - opHalf);
    const opEnd = Math.min(wm.len, opCenter + opHalf);

    if (opStart > prevEnd + 0.005) {
      const m = buildWallSegment(wall, prevEnd, opStart, 0, wall.height, isSelected, wireframe);
      if (m) meshes.push(m);
    }
    if (op.height < wall.height && opEnd > opStart + 0.005) {
      const m = buildWallSegment(wall, opStart, opEnd, op.height, wall.height, isSelected, wireframe);
      if (m) meshes.push(m);
    }
    const frame = buildOpeningFrame(wall, op, wireframe);
    if (frame) meshes.push(frame);
    prevEnd = opEnd;
  }

  if (prevEnd < wm.len - 0.005) {
    const m = buildWallSegment(wall, prevEnd, wm.len, 0, wall.height, isSelected, wireframe);
    if (m) meshes.push(m);
  }

  return meshes;
}

const FURNITURE_COLORS: Record<string, number> = {
  Sofa: 0xcc8899,
  "Coffee Table": 0x886644,
  "TV Stand": 0x444444,
  "Double Bed": 0x99bbcc,
  "Single Bed": 0x99bbcc,
  Wardrobe: 0x8b6914,
  Nightstand: 0x886644,
  Sink: 0xcccccc,
  Toilet: 0xeeeeee,
  Bathtub: 0xcccccc,
  "Dining Table": 0x886644,
  Stove: 0x555555,
  Fridge: 0xeeeeee,
};

function buildFurnitureMesh(item: FurnitureItem, wireframe: boolean): THREE.Mesh {
  const color = FURNITURE_COLORS[item.name] || 0x888888;
  const geom = new THREE.BoxGeometry(item.width, 0.6, item.height);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.05,
    wireframe,
  });
  const mesh = new THREE.Mesh(geom, mat);
  const x = item.x / GRID_SIZE;
  const z = item.y / GRID_SIZE;
  mesh.position.set(x, 0.3, z);
  mesh.rotation.y = (item.rotation * Math.PI) / 180;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export default function ThreeScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const sceneDataRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    wallGroup: THREE.Group;
    furnitureGroup: THREE.Group;
    ground: THREE.Mesh;
    gridHelper: THREE.GridHelper;
  } | null>(null);

  const walls = useEditorStore((s) => s.walls);
  const openings = useEditorStore((s) => s.openings);
  const furniture = useEditorStore((s) => s.furniture);
  const landWidth = useEditorStore((s) => s.landWidth);
  const landLength = useEditorStore((s) => s.landLength);
  const wireframeMode = useEditorStore((s) => s.wireframeMode);
  const is3DFullscreen = useEditorStore((s) => s.is3DFullscreen);
  const setIs3DFullscreen = useEditorStore((s) => s.setIs3DFullscreen);
  const setWireframeMode = useEditorStore((s) => s.setWireframeMode);
  const selectedWallId = useEditorStore((s) => s.selectedWallId);
  const selectedOpeningId = useEditorStore((s) => s.selectedOpeningId);

  const resetView = useCallback(() => {
    const sd = sceneDataRef.current;
    if (!sd) return;
    const lcx = 1 + landWidth / 2;
    const lcz = 1 + landLength / 2;
    const dist = Math.max(landWidth, landLength) * 0.7;
    sd.camera.position.set(lcx + dist * 0.6, dist * 0.6, lcz + dist * 0.8);
    sd.controls.target.set(lcx, 0, lcz);
    sd.controls.update();
  }, [landWidth, landLength]);

  const topView = useCallback(() => {
    const sd = sceneDataRef.current;
    if (!sd) return;
    const lcx = 1 + landWidth / 2;
    const lcz = 1 + landLength / 2;
    sd.camera.position.set(lcx, 25, lcz + 0.001);
    sd.controls.target.set(lcx, 0, lcz);
    sd.controls.update();
  }, [landWidth, landLength]);

  const toggleWireframe = useCallback(() => {
    setWireframeMode(!wireframeMode);
  }, [wireframeMode, setWireframeMode]);

  const toggleFullscreen = useCallback(() => {
    setIs3DFullscreen(!is3DFullscreen);
  }, [is3DFullscreen, setIs3DFullscreen]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    const lcx = 1 + 12 / 2;
    const lcz = 1 + 10 / 2;
    camera.position.set(lcx + 8, 8, lcz + 10);
    camera.lookAt(lcx, 0, lcz);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(lcx, 0, lcz);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.update();

    const ambientLight = new THREE.AmbientLight(0x8888cc, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(lcx + 10, 15, lcz + 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(lcx - 5, 5, lcz - 5);
    scene.add(fillLight);

    const groundGeom = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(lcx, -0.01, lcz);
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(20, 20, 0x4a7cff, 0x2a2a4a);
    gridHelper.position.set(lcx, 0, lcz);
    scene.add(gridHelper);

    const wallGroup = new THREE.Group();
    scene.add(wallGroup);
    const furnitureGroup = new THREE.Group();
    scene.add(furnitureGroup);

    const handleResize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    sceneDataRef.current = {
      scene,
      camera,
      renderer,
      controls,
      wallGroup,
      furnitureGroup,
      ground,
      gridHelper,
    };

    setSceneReady(true);

    let animFrameId: number;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(animate);
    };
    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      container.removeChild(renderer.domElement);
      renderer.dispose();
      controls.dispose();
      sceneDataRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sd = sceneDataRef.current;
    if (!sd) return;

    const { wallGroup, furnitureGroup, camera, controls, ground, gridHelper, renderer } = sd;

    const clearGroup = (group: THREE.Group) => {
      while (group.children.length > 0) {
        const child = group.children[0];
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
        group.remove(child);
      }
    };

    clearGroup(wallGroup);
    clearGroup(furnitureGroup);

    const lcx = 1 + landWidth / 2;
    const lcz = 1 + landLength / 2;
    const gs = Math.max(landWidth, landLength) + 4;

    ground.geometry.dispose();
    ground.geometry = new THREE.PlaneGeometry(gs, gs);
    ground.position.set(lcx, -0.01, lcz);

    gridHelper.dispose();
    const newGrid = new THREE.GridHelper(gs, Math.round(gs), 0x4a7cff, 0x2a2a4a);
    newGrid.position.set(lcx, 0, lcz);
    sd.gridHelper = newGrid;
    sd.scene.remove(gridHelper);
    sd.scene.add(newGrid);

    controls.target.set(lcx, 0, lcz);
    if (Math.abs(camera.position.x - lcx) > 50 || Math.abs(camera.position.z - lcz) > 50) {
      camera.position.set(lcx + gs * 0.4, gs * 0.3, lcz + gs * 0.5);
    }
    controls.update();

    const openingsByWall = new Map<string, Opening[]>();
    for (const op of openings) {
      const list = openingsByWall.get(op.wallId) || [];
      list.push(op);
      openingsByWall.set(op.wallId, list);
    }

    for (const wall of walls) {
      const wallOpenings = openingsByWall.get(wall.id) || [];
      const meshes = buildWallMeshes(wall, wallOpenings, wireframeMode, selectedWallId);
      for (const m of meshes) wallGroup.add(m);
    }

    for (const item of furniture) {
      const mesh = buildFurnitureMesh(item, wireframeMode);
      furnitureGroup.add(mesh);
    }

    const dLight = sd.scene.children.find(
      (c) => c instanceof THREE.DirectionalLight && c.position.y > 10
    ) as THREE.DirectionalLight;
    if (dLight) {
      dLight.position.set(lcx + gs * 0.5, gs * 0.75, lcz + gs * 0.4);
      dLight.shadow.camera.left = -gs * 0.5;
      dLight.shadow.camera.right = gs * 0.5;
      dLight.shadow.camera.top = gs * 0.5;
      dLight.shadow.camera.bottom = -gs * 0.5;
      dLight.shadow.mapSize.set(2048, 2048);
    }

    renderer.render(sd.scene, camera);
  }, [walls, openings, furniture, wireframeMode, selectedWallId, selectedOpeningId, landWidth, landLength]);

  return (
    <div ref={containerRef} className="relative flex-1 min-h-0">
      {sceneReady && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          <button
            onClick={resetView}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/50 text-muted hover:text-foreground hover:bg-black/70 transition-colors"
            title="Reset View"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={topView}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/50 text-muted hover:text-foreground hover:bg-black/70 transition-colors"
            title="Top View"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={toggleWireframe}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              wireframeMode
                ? "bg-accent text-white"
                : "bg-black/50 text-muted hover:text-foreground hover:bg-black/70"
            }`}
            title="Toggle Wireframe"
          >
            <Box size={15} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/50 text-muted hover:text-foreground hover:bg-black/70 transition-colors"
            title={is3DFullscreen ? "Split View" : "Fullscreen 3D"}
          >
            {is3DFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      )}
    </div>
  );
}
