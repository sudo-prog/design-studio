import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sun, Cloud, Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import * as THREE from "three";

type LightPreset = "studio" | "outdoor" | "lifestyle";

interface Props {
  designUrl: string | null;
  garmentColor: string;
  className?: string;
}

const LIGHT_PRESETS: Record<LightPreset, { ambient: number; dirColor: string; dirIntensity: number; bg: string }> = {
  studio: { ambient: 0.8, dirColor: "#ffffff", dirIntensity: 1.5, bg: "#f0f0f0" },
  outdoor: { ambient: 0.6, dirColor: "#ffe4b5", dirIntensity: 2.0, bg: "#87ceeb" },
  lifestyle: { ambient: 0.5, dirColor: "#ffd700", dirIntensity: 1.2, bg: "#2c2c2c" },
};

export function Viewer3D({ designUrl, garmentColor, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const animRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotRef = useRef({ x: 0.1, y: 0 });
  const [preset, setPreset] = useState<LightPreset>("studio");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.offsetWidth || 400;
    const H = el.offsetHeight || 400;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // T-shirt shape: front body panel using Shape
    function buildTshirtGeometry(): THREE.BufferGeometry {
      const shape = new THREE.Shape();
      // Body
      shape.moveTo(-0.6, -1.0);
      shape.lineTo(-0.6,  0.5);
      // Left sleeve notch
      shape.lineTo(-0.9,  0.7);
      shape.lineTo(-1.1,  0.5);
      shape.lineTo(-0.8,  0.3);
      // Shoulder
      shape.lineTo(-0.5,  0.9);
      // Neck
      shape.bezierCurveTo(-0.3, 1.05, 0.3, 1.05, 0.5, 0.9);
      // Right shoulder
      shape.lineTo(0.8,  0.3);
      shape.lineTo(1.1,  0.5);
      shape.lineTo(0.9,  0.7);
      shape.lineTo(0.6,  0.5);
      shape.lineTo(0.6, -1.0);
      shape.lineTo(-0.6, -1.0);

      const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
      return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }

    const geo = buildTshirtGeometry();
    geo.computeVertexNormals();
    geo.center();

    // Design texture — never append query params to data URLs (corrupts them)
    const designTex = designUrl
      ? (() => {
          const loader = new THREE.TextureLoader();
          const loadUrl = designUrl.startsWith("data:") ? designUrl : designUrl + (designUrl.includes("?") ? "&" : "?") + "crossOrigin=anonymous";
          return loader.load(loadUrl);
        })()
      : null;

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(garmentColor),
      roughness: 0.85,
      metalness: 0.02,
    });

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    meshRef.current = mesh;

    // Design decal plane — add as child of garment mesh so it rotates with it
    if (designTex) {
      designTex.colorSpace = THREE.SRGBColorSpace;
      const decalGeo = new THREE.PlaneGeometry(0.6, 0.6);
      const decalMat = new THREE.MeshStandardMaterial({
        map: designTex,
        transparent: true,
        depthWrite: false,
        roughness: 0.9,
        metalness: 0,
      });
      const decal = new THREE.Mesh(decalGeo, decalMat);
      // Position relative to garment mesh (local space): centre of front face
      decal.position.set(0, 0.1, 0.06);
      mesh.add(decal);  // child of mesh — rotates/translates with garment
    }

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, LIGHT_PRESETS[preset].ambient);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(
      new THREE.Color(LIGHT_PRESETS[preset].dirColor),
      LIGHT_PRESETS[preset].dirIntensity,
    );
    dir.position.set(2, 3, 2);
    scene.add(dir);

    // BG
    scene.background = new THREE.Color(LIGHT_PRESETS[preset].bg);

    setIsLoaded(true);

    // Animation loop
    function animate() {
      animRef.current = requestAnimationFrame(animate);
      mesh.rotation.x = rotRef.current.x;
      mesh.rotation.y = rotRef.current.y;
      renderer.render(scene, camera);
    }
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animRef.current);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designUrl, garmentColor]);

  // Update lights when preset changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const p = LIGHT_PRESETS[preset];
    scene.background = new THREE.Color(p.bg);
    scene.traverse((obj) => {
      if (obj instanceof THREE.AmbientLight) obj.intensity = p.ambient;
      if (obj instanceof THREE.DirectionalLight) {
        obj.color.set(p.dirColor);
        obj.intensity = p.dirIntensity;
      }
    });
  }, [preset]);

  // Orbit controls (manual)
  function handleMouseDown(e: React.MouseEvent) {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    rotRef.current.y += dx * 0.01;
    rotRef.current.x += dy * 0.01;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }
  function handleMouseUp() { isDraggingRef.current = false; }

  function handleExport() {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const url = renderer.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "mockup-3d.png";
    a.click();
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-muted", className)}>
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: "none" }}
      />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Lighting presets */}
      <div className="absolute top-2 left-2 flex gap-1">
        {(["studio", "outdoor", "lifestyle"] as LightPreset[]).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border transition-colors capitalize",
              preset === p
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-black/40 text-white border-white/20 hover:border-white/50",
            )}
          >
            {p === "studio" ? <Sun className="w-3 h-3 inline mr-0.5" /> : p === "outdoor" ? <Cloud className="w-3 h-3 inline mr-0.5" /> : "🏙️ "}
            {p}
          </button>
        ))}
      </div>

      {/* Export */}
      <button
        onClick={handleExport}
        className="absolute top-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 hover:bg-black/70 transition-colors"
      >
        <Camera className="w-3 h-3" />
        Save PNG
      </button>

      {isLoaded && (
        <p className="absolute bottom-2 left-2 text-[10px] text-white/60">Drag to orbit</p>
      )}
    </div>
  );
}
