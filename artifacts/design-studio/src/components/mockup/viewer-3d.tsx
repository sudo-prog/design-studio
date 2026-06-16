import { useEffect, useRef, useState } from "react";
import { Loader2, Sun, Cloud, Sunset } from "lucide-react";
import { cn } from "@/lib/utils";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type LightPreset = "studio" | "outdoor" | "lifestyle";

interface Props {
  designUrl: string | null;
  garmentColor: string;
  className?: string;
}

// ── Environment / lighting presets ──────────────────────────────────────────
const LIGHT_PRESETS: Record<
  LightPreset,
  { ambient: number; dir1Color: string; dir1Intensity: number; dir2Color: string; dir2Intensity: number; bg: string }
> = {
  studio: {
    ambient: 0.6,
    dir1Color: "#ffffff", dir1Intensity: 1.8,
    dir2Color: "#e8f4ff", dir2Intensity: 0.6,
    bg: "#f4f4f4",
  },
  outdoor: {
    ambient: 0.5,
    dir1Color: "#fff5d0", dir1Intensity: 2.2,
    dir2Color: "#87ceeb", dir2Intensity: 0.4,
    bg: "#add8e6",
  },
  lifestyle: {
    ambient: 0.35,
    dir1Color: "#ffd580", dir1Intensity: 1.4,
    dir2Color: "#4060a0", dir2Intensity: 0.5,
    bg: "#1c1c2e",
  },
};

// ── T-shirt geometry built from a 2-D outline + extrude ────────────────────
function buildTshirtGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // bottom-left → up left side
  shape.moveTo(-0.55, -1.05);
  shape.lineTo(-0.55,  0.42);
  // left sleeve
  shape.lineTo(-0.92,  0.68);
  shape.lineTo(-1.15,  0.50);
  shape.lineTo(-1.00,  0.28);
  shape.lineTo(-0.72,  0.24);
  // left shoulder
  shape.lineTo(-0.48,  0.82);
  // neck (bezier)
  shape.bezierCurveTo(-0.28, 1.02, 0.28, 1.02, 0.48, 0.82);
  // right shoulder
  shape.lineTo( 0.72,  0.24);
  shape.lineTo( 1.00,  0.28);
  shape.lineTo( 1.15,  0.50);
  shape.lineTo( 0.92,  0.68);
  shape.lineTo( 0.55,  0.42);
  shape.lineTo( 0.55, -1.05);
  shape.lineTo(-0.55, -1.05);

  const settings: THREE.ExtrudeGeometryOptions = {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 3,
    curveSegments: 16,
  };
  const geo = new THREE.ExtrudeGeometry(shape, settings);
  geo.computeVertexNormals();
  geo.center();
  return geo;
}

// ── UV-map the front face for the design decal ─────────────────────────────
function buildFrontPlaneGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(0.72, 0.72, 1, 1);
}

export function Viewer3D({ designUrl, garmentColor, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef     = useRef<THREE.Mesh | null>(null);
  const animRef     = useRef<number>(0);
  const lightsRef   = useRef<{ ambient: THREE.AmbientLight; dir1: THREE.DirectionalLight; dir2: THREE.DirectionalLight } | null>(null);

  const [preset, setPreset]   = useState<LightPreset>("studio");
  const [isLoaded, setIsLoaded] = useState(false);

  // ── Main scene setup (re-runs when design or color changes) ────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.offsetWidth  || 480;
    const H = el.offsetHeight || 480;

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled  = true;
    renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace   = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Scene ───────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // ── Camera ──────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.05, 100);
    camera.position.set(0, 0.1, 3.2);
    cameraRef.current = camera;

    // ── OrbitControls ───────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping    = true;
    controls.dampingFactor    = 0.08;
    controls.enablePan        = false;
    controls.minDistance      = 1.5;
    controls.maxDistance      = 6;
    controls.maxPolarAngle    = Math.PI * 0.75;
    controls.minPolarAngle    = Math.PI * 0.15;
    controls.autoRotate       = true;
    controls.autoRotateSpeed  = 0.6;
    controlsRef.current = controls;

    // ── Garment mesh ────────────────────────────────────────────────────────
    const geo = buildTshirtGeometry();
    const mat = new THREE.MeshStandardMaterial({
      color:     new THREE.Color(garmentColor),
      roughness: 0.82,
      metalness: 0.02,
      side:      THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshRef.current = mesh;

    // ── Design decal (child of mesh so it rotates with garment) ─────────────
    if (designUrl) {
      const loader  = new THREE.TextureLoader();
      // Never append query params to data: URLs — they corrupt base64
      const loadUrl = designUrl.startsWith("data:")
        ? designUrl
        : designUrl + (designUrl.includes("?") ? "&t=" : "?t=") + Date.now();
      loader.load(loadUrl, (tex) => {
        tex.colorSpace  = THREE.SRGBColorSpace;
        tex.anisotropy  = renderer.capabilities.getMaxAnisotropy();
        const decalGeo  = buildFrontPlaneGeometry();
        const decalMat  = new THREE.MeshStandardMaterial({
          map:        tex,
          transparent: true,
          depthWrite:  false,
          roughness:   0.88,
          metalness:   0,
          alphaTest:   0.05,
        });
        const decal = new THREE.Mesh(decalGeo, decalMat);
        // Front face is at z ≈ +depth/2 + bevel after centering
        decal.position.set(0, 0.08, 0.085);
        mesh.add(decal);
      });
    }

    // ── Ground shadow plane ──────────────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(8, 8);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const ground    = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.35;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Lighting (initial preset = studio) ──────────────────────────────────
    const p = LIGHT_PRESETS.studio;

    const ambient = new THREE.AmbientLight(0xffffff, p.ambient);
    scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(new THREE.Color(p.dir1Color), p.dir1Intensity);
    dir1.position.set(3, 5, 3);
    dir1.castShadow = true;
    dir1.shadow.mapSize.set(1024, 1024);
    dir1.shadow.camera.near = 0.5;
    dir1.shadow.camera.far  = 20;
    dir1.shadow.bias = -0.0005;
    scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(new THREE.Color(p.dir2Color), p.dir2Intensity);
    dir2.position.set(-3, 2, -2);
    scene.add(dir2);

    lightsRef.current = { ambient, dir1, dir2 };

    scene.background = new THREE.Color(p.bg);

    // ── Resize handler ──────────────────────────────────────────────────────
    function onResize() {
      const target = mountRef.current;
      if (!target) return;
      const w = target.offsetWidth;
      const h = target.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    // ── Render loop ─────────────────────────────────────────────────────────
    let raf = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    animRef.current = raf;
    setIsLoaded(true);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      const container = mountRef.current;
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designUrl, garmentColor]);

  // ── Update lights/bg when preset changes (without full scene rebuild) ──────
  useEffect(() => {
    const lights = lightsRef.current;
    const scene  = sceneRef.current;
    if (!lights || !scene) return;
    const p = LIGHT_PRESETS[preset];
    lights.ambient.intensity = p.ambient;
    lights.dir1.color.set(p.dir1Color);
    lights.dir1.intensity = p.dir1Intensity;
    lights.dir2.color.set(p.dir2Color);
    lights.dir2.intensity = p.dir2Intensity;
    scene.background = new THREE.Color(p.bg);
  }, [preset]);

  // ── Save PNG snapshot ──────────────────────────────────────────────────────
  function handleExport() {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const url = renderer.domElement.toDataURL("image/png");
    const a   = document.createElement("a");
    a.href     = url;
    a.download = "mockup-3d.png";
    a.click();
  }

  const presetIcons: Record<LightPreset, React.ReactNode> = {
    studio:    <Sun     className="w-3 h-3 inline mr-0.5" />,
    outdoor:   <Cloud   className="w-3 h-3 inline mr-0.5" />,
    lifestyle: <Sunset  className="w-3 h-3 inline mr-0.5" />,
  };

  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-muted", className)}>
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{ touchAction: "none", cursor: "grab" }}
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
            {presetIcons[p]}
            {p}
          </button>
        ))}
      </div>

      {/* Export */}
      <button
        onClick={handleExport}
        className="absolute top-2 right-2 bg-black/40 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1 hover:bg-black/70 transition-colors"
      >
        Save PNG
      </button>

      {isLoaded && (
        <p className="absolute bottom-2 left-2 text-[10px] text-white/50 pointer-events-none">
          Drag to orbit · scroll to zoom
        </p>
      )}
    </div>
  );
}
