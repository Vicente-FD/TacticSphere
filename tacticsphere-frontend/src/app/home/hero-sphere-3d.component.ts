import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

@Component({
  standalone: true,
  selector: 'app-hero-sphere-3d',
  imports: [CommonModule],
  template: `
    <canvas #canvasRef class="hero-sphere-canvas"></canvas>
  `,
  styles: [`
    .hero-sphere-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `],
})
export class HeroSphere3dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasRef', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private sphere!: THREE.Mesh;
  private animationFrameId: number | null = null;
  private resizeListener?: () => void;

  ngAfterViewInit(): void {
    if (!this.canvasRef?.nativeElement) {
      return;
    }

    this.initThree();
    this.createSphere();
    this.setupCamera();
    this.startAnimation();
    this.setupResizeListener();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;

    if (!container) {
      return;
    }

    // Obtener dimensiones del contenedor
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Crear escena
    this.scene = new THREE.Scene();

    // Crear cámara
    this.camera = new THREE.PerspectiveCamera(
      45, // FOV
      width / height, // Aspect ratio
      0.1, // Near
      1000 // Far
    );

    // Posicionar cámara
    this.camera.position.z = 3;

    // Crear renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true, // Fondo transparente
      antialias: true, // Antialiasing
    });

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  private createSphere(): void {
    // Crear geometría de esfera
    const geometry = new THREE.SphereGeometry(1, 32, 32);

    // Crear material wireframe
    const material = new THREE.MeshBasicMaterial({
      color: 0xd1d5db, // Color gris claro (#d1d5db)
      wireframe: true,
      transparent: true,
      opacity: 0.6, // Opacidad suave
    });

    // Crear malla
    this.sphere = new THREE.Mesh(geometry, material);

    // Añadir a la escena
    this.scene.add(this.sphere);
  }

  private setupCamera(): void {
    // La cámara ya está configurada en initThree
    // Puedes ajustar la posición aquí si es necesario
  }

  private startAnimation(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      // Rotar la esfera suavemente (rotación más lenta)
      if (this.sphere) {
        this.sphere.rotation.y += 0.001;
        this.sphere.rotation.x += 0.0005;
      }

      // Renderizar
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  private setupResizeListener(): void {
    this.resizeListener = () => {
      const container = this.canvasRef.nativeElement.parentElement;
      if (!container || !this.camera || !this.renderer) {
        return;
      }

      const width = container.clientWidth;
      const height = container.clientHeight;

      // Actualizar tamaño del renderer
      this.renderer.setSize(width, height);

      // Actualizar aspecto de la cámara
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', this.resizeListener);
  }

  private cleanup(): void {
    // Cancelar animación
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remover listener de resize
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }

    // Limpiar Three.js
    if (this.sphere) {
      this.sphere.geometry.dispose();
      if (this.sphere.material instanceof THREE.Material) {
        this.sphere.material.dispose();
      }
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
