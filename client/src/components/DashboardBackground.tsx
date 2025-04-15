import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import HealthStats from './HealthStats';

export default function DashboardBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      canvas: containerRef.current.querySelector('canvas') || undefined
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    if (!containerRef.current.querySelector('canvas')) {
      containerRef.current.appendChild(renderer.domElement);
    }

    // Create floating health icons
    const healthIcons = new THREE.Group();
    const iconCount = 20;
    const iconGeometry = new THREE.PlaneGeometry(1, 1);
    
    // Health-related icons
    const icons = [
      { color: 0x4CAF50, text: '🍎' }, // Apple
      { color: 0xFF9800, text: '🥕' }, // Carrot
      { color: 0x2196F3, text: '💧' }, // Water
      { color: 0xE91E63, text: '❤️' }, // Heart
      { color: 0x9C27B0, text: '🏃' }, // Running
    ];

    // Create floating icons
    for (let i = 0; i < iconCount; i++) {
      const icon = icons[i % icons.length];
      const material = new THREE.MeshBasicMaterial({
        color: icon.color,
        transparent: true,
        opacity: 0.8,
      });
      
      const mesh = new THREE.Mesh(iconGeometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
      mesh.userData = { type: icon.text };
      healthIcons.add(mesh);
    }
    scene.add(healthIcons);

    // Add nutrition rings
    const createRing = (radius: number, color: number) => {
      const geometry = new THREE.RingGeometry(radius - 0.1, radius, 32);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = Math.PI / 2;
      return ring;
    };

    const rings = new THREE.Group();
    const ringColors = [0x4CAF50, 0xFF9800, 0x2196F3, 0xE91E63];
    ringColors.forEach((color, index) => {
      const ring = createRing(5 + index * 2, color);
      rings.add(ring);
    });
    scene.add(rings);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x4f46e5, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    controls.minDistance = 5;
    controls.maxDistance = 20;

    // Raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', onMouseMove);

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);

      // Update raycaster
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(healthIcons.children);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        setHoveredItem(intersected.userData.type);
        intersected.scale.set(1.2, 1.2, 1.2);
      } else {
        setHoveredItem(null);
        healthIcons.children.forEach(icon => {
          icon.scale.set(1, 1, 1);
        });
      }

      // Rotate icons and rings
      healthIcons.rotation.y += 0.001;
      rings.rotation.y += 0.0005;

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) {
          containerRef.current.removeChild(canvas);
        }
      }
      scene.remove(healthIcons);
      scene.remove(rings);
      healthIcons.children.forEach(icon => {
        (icon as THREE.Mesh).geometry.dispose();
        ((icon as THREE.Mesh).material as THREE.Material).dispose();
      });
      rings.children.forEach(ring => {
        (ring as THREE.Mesh).geometry.dispose();
        ((ring as THREE.Mesh).material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, #1a1a1a, #2a2a2a)' }}
      />
      <div className="absolute inset-0 z-10 flex flex-col">
        <div className="flex-1" />
        <div className="absolute inset-x-0 bottom-0">
          <HealthStats />
        </div>
        {hoveredItem && (
          <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm p-4 rounded-lg text-white">
            <p className="text-2xl">{hoveredItem}</p>
            <p className="text-sm opacity-75">
              {hoveredItem === '🍎' && 'Healthy fruits for vitamins'}
              {hoveredItem === '🥕' && 'Nutritious vegetables'}
              {hoveredItem === '💧' && 'Stay hydrated!'}
              {hoveredItem === '❤️' && 'Heart health matters'}
              {hoveredItem === '🏃' && 'Keep moving!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 