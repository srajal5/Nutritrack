import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeJSCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 600, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true, 
      antialias: true 
    });
    
    renderer.setSize(window.innerWidth, 600);
    
    // Create a 3D representation of healthy food (torus knot)
    const torusGeometry = new THREE.TorusKnotGeometry(3, 1, 100, 16);
    const torusMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x4CAF50,
      emissive: 0x072534,
      side: THREE.DoubleSide,
      flatShading: true
    });
    
    const torusKnot = new THREE.Mesh(torusGeometry, torusMaterial);
    scene.add(torusKnot);
    
    // Add spheres in the background to represent nutrition elements
    for (let i = 0; i < 50; i++) {
      const geometry = new THREE.SphereGeometry(0.25, 24, 24);
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.2 + 0.3, 0.9, 0.7);
      const material = new THREE.MeshBasicMaterial({ color });
      const sphere = new THREE.Mesh(geometry, material);
      
      sphere.position.x = Math.random() * 40 - 20;
      sphere.position.y = Math.random() * 40 - 20;
      sphere.position.z = Math.random() * 40 - 20;
      
      scene.add(sphere);
    }
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);
    
    camera.position.z = 10;
    
    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      torusKnot.rotation.x += 0.01;
      torusKnot.rotation.y += 0.01;
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!canvasRef.current) return;
      
      renderer.setSize(window.innerWidth, 600);
      camera.aspect = window.innerWidth / 600;
      camera.updateProjectionMatrix();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      
      // Dispose geometries and materials to prevent memory leaks
      torusGeometry.dispose();
      torusMaterial.dispose();
      renderer.dispose();
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      id="threeJsCanvas" 
      className="absolute top-0 left-0 w-full h-full z-[-1]"
    />
  );
};

export default ThreeJSCanvas;
