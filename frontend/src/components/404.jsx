import React, { useEffect, useRef } from 'react';
import { FiShoppingCart } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import * as THREE from 'three';

export default function NotFoundPage() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particle system
    const particlesCount = 800;
    const positions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 10;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.03,
      color: 0xd4af37, // gold
      transparent: true,
      opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();

      particles.rotation.y = t * 0.05;
      particles.rotation.x = t * 0.02;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // Resize
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-black text-white px-4 overflow-hidden">

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Soft gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />

      {/* Content */}
      <div className="z-10 text-center max-w-md">

        {/* Icon */}
        <div className="flex justify-center mb-6">
           <div className="flex justify-center mb-8">
          <FiShoppingCart className="text-[120px] text-gray-600" />
        </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-3">
            Oops! Page Not Found
        </h1>

        {/* Subtitle */}
        <h2 className="text-gray-400 mb-6">
          This page vanished… just like your cart (404)
        </h2>

        {/* Button */}
        <Link
          to="/"
          className="inline-block bg-[#d4af37] text-black px-6 py-3 rounded-md font-medium transition hover:scale-105 active:scale-95"
        >
          Start Shopping
        </Link>

      </div>
    </main>
  );
}
