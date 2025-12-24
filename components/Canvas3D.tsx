import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { AppMode, ParticleState } from '../types';

interface Canvas3DProps {
  onStatusChange: (status: string) => void;
  onLoaded: () => void;
}

export interface Canvas3DRef {
  addPhotos: (files: File[]) => void;
}

// Internal class to manage particle logic
class HolidayParticle {
  mesh: THREE.Mesh | THREE.Group;
  isPhoto: boolean;
  targetPos: THREE.Vector3;
  lerpSpeed: number;
  noiseOffset: number;

  constructor(mesh: THREE.Mesh | THREE.Group, isPhoto = false) {
    this.mesh = mesh;
    this.isPhoto = isPhoto;
    this.targetPos = new THREE.Vector3();
    this.lerpSpeed = isPhoto ? 0.08 : 0.04;
    this.noiseOffset = Math.random() * 100;
  }

  update(time: number, mode: AppMode) {
    this.mesh.position.lerp(this.targetPos, this.lerpSpeed);
    const wave = Math.sin(time * 0.001 + this.noiseOffset) * 0.05;
    this.mesh.position.y += wave;
    if (mode !== AppMode.SCATTER && !this.isPhoto) {
      this.mesh.rotation.y += 0.01;
    }
  }
}

const Canvas3D = forwardRef<Canvas3DRef, Canvas3DProps>(({ onStatusChange, onLoaded }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ParticleState>({
    mode: AppMode.TREE,
    rotation: { x: 0, y: 0 },
    targetRotation: { x: 0, y: 0 },
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  });
  
  // Three.js objects ref
  const sceneObjects = useRef({
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000),
    renderer: new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" }), 
    composer: null as EffectComposer | null,
    particles: [] as HolidayParticle[],
    photoParticles: [] as HolidayParticle[],
    mainGroup: new THREE.Group(),
    cursorMesh: null as THREE.Mesh | null,
    materials: {
      gold: new THREE.MeshStandardMaterial({ color: 0xe5c066, metalness: 0.9, roughness: 0.2 }),
      emerald: new THREE.MeshStandardMaterial({ color: 0x06281b, metalness: 0.5, roughness: 0.3 }),
      ruby: new THREE.MeshStandardMaterial({ color: 0x7a0000, metalness: 0.5, roughness: 0.2 }),
    }
  });

  // Handle external file uploads
  useImperativeHandle(ref, () => ({
    addPhotos: (files: File[]) => {
      const { mainGroup, materials, particles, photoParticles } = sceneObjects.current;
      const MAX_PHOTOS = 20;

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (!ev.target?.result) return;
          new THREE.TextureLoader().load(ev.target.result as string, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            
            // Remove old if limit reached
            if (photoParticles.length >= MAX_PHOTOS) {
              const old = photoParticles.shift();
              if (old) {
                mainGroup.remove(old.mesh);
                const idx = particles.indexOf(old);
                if (idx > -1) particles.splice(idx, 1);
              }
            }

            const group = new THREE.Group();
            const frame = new THREE.Mesh(new THREE.BoxGeometry(4.5, 5.8, 0.2), materials.gold);
            const photo = new THREE.Mesh(
              new THREE.PlaneGeometry(4.1, 5.4), 
              new THREE.MeshBasicMaterial({ map: tex })
            );
            photo.position.z = 0.11;
            group.add(frame, photo);

            const p = new HolidayParticle(group, true);
            photoParticles.push(p);
            particles.push(p);
            
            // Add to scene
            mainGroup.add(group);
            
            // Recalculate layout
            updateLayout();
          });
        };
        reader.readAsDataURL(file);
      });
    }
  }));

  const updateLayout = () => {
    const { particles, photoParticles } = sceneObjects.current;
    const { mode } = stateRef.current;
    const photoCount = photoParticles.length;

    if (mode === AppMode.TREE) {
      particles.forEach((p, i) => {
        if (p.isPhoto) {
          const idx = photoParticles.indexOf(p);
          const ratio = (idx + 1) / (photoCount + 1);
          const angle = ratio * Math.PI * 10;
          const radius = 14 * (1 - ratio * 0.8);
          p.targetPos.set(Math.cos(angle) * radius, ratio * 30 - 15, Math.sin(angle) * radius);
          // @ts-ignore - Assuming mesh is Group for photo
          p.mesh.scale.setScalar(0.5);
          p.mesh.lookAt(0, p.targetPos.y, 0);
        } else {
          const ratio = i / particles.length;
          const radius = 12 * (1 - ratio);
          const angle = ratio * 40;
          p.targetPos.set(Math.cos(angle) * radius, ratio * 28 - 14, Math.sin(angle) * radius);
          p.mesh.scale.setScalar(1);
        }
      });
    } else if (mode === AppMode.SCATTER) {
      particles.forEach(p => {
        p.targetPos.set(
          (Math.random() - 0.5) * 80, 
          (Math.random() - 0.5) * 50, 
          (Math.random() - 0.5) * 60
        );
        p.mesh.scale.setScalar(p.isPhoto ? 1 : 1.2);
      });
    } else if (mode === AppMode.FOCUS) {
      particles.forEach(p => {
        if (p.isPhoto) {
          const idx = photoParticles.indexOf(p);
          const angle = (idx / (photoCount - 1 || 1) - 0.5) * Math.PI * 0.7;
          p.targetPos.set(Math.sin(angle) * 30, 2, Math.cos(angle) * 30 - 15);
          p.mesh.scale.setScalar(1.4);
          p.mesh.lookAt(0, 2, 50);
        } else {
          const r = 50 + Math.random() * 20;
          const t = Math.random() * Math.PI * 2;
          p.targetPos.set(Math.cos(t) * r, (Math.random() - 0.5) * 40, Math.sin(t) * r);
          p.mesh.scale.setScalar(0.4);
        }
      });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const { scene, camera, renderer, mainGroup, materials, particles } = sceneObjects.current;

    // --- Init Scene ---
    scene.background = new THREE.Color(0x010205);
    scene.fog = new THREE.FogExp2(0x010205, 0.015);
    camera.position.set(0, 5, 55);

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
    scene.add(mainGroup);

    // --- Cursor Feedback ---
    const cursorGeo = new THREE.OctahedronGeometry(0.5, 0);
    const cursorMat = new THREE.MeshBasicMaterial({ color: 0xffd700, wireframe: true, transparent: true, opacity: 0 });
    const cursorMesh = new THREE.Mesh(cursorGeo, cursorMat);
    sceneObjects.current.cursorMesh = cursorMesh;
    scene.add(cursorMesh);

    // --- Post Processing ---
    const composer = new EffectComposer(renderer);
    sceneObjects.current.composer = composer;
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.4, 0.85);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // --- Init Particles ---
    const sphereGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const crystalGeo = new THREE.IcosahedronGeometry(0.3, 0);
    const count = stateRef.current.isMobile ? 800 : 1500;
    
    for (let i = 0; i < count; i++) {
      const geo = Math.random() > 0.5 ? sphereGeo : crystalGeo;
      const mat = Math.random() > 0.6 ? materials.gold : (Math.random() > 0.5 ? materials.emerald : materials.ruby);
      const mesh = new THREE.Mesh(geo, mat);
      const p = new HolidayParticle(mesh);
      particles.push(p);
      mainGroup.add(mesh);
    }

    updateLayout();

    // --- Animation Loop ---
    let animationFrameId: number;
    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      
      const st = stateRef.current;
      st.rotation.x += (st.targetRotation.x - st.rotation.x) * 0.05;
      st.rotation.y += (st.targetRotation.y - st.rotation.y) * 0.05;

      mainGroup.rotation.x = st.rotation.x;
      mainGroup.rotation.y = st.rotation.y + time * 0.0002;

      sceneObjects.current.particles.forEach(p => p.update(time, st.mode));

      // Cursor animation
      if (sceneObjects.current.cursorMesh && sceneObjects.current.cursorMesh.material instanceof THREE.Material) {
          sceneObjects.current.cursorMesh.rotation.y += 0.05;
          sceneObjects.current.cursorMesh.rotation.z -= 0.05;
      }
      
      if (sceneObjects.current.composer) {
        sceneObjects.current.composer.render();
      }
    };
    animate(0);

    // --- MediaPipe / Vision Setup ---
    let handLandmarker: HandLandmarker | null = null;
    let webcamRunning = false;
    let lastVideoTime = -1;
    let video: HTMLVideoElement | null = null;

    const setupCV = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { 
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", 
            delegate: "GPU" 
          },
          runningMode: "VIDEO", 
          numHands: 1
        });
        
        video = document.getElementById('webcam-video') as HTMLVideoElement;

        // Start Webcam
        if (navigator.mediaDevices?.getUserMedia) {
           const stream = await navigator.mediaDevices.getUserMedia({ 
             video: { 
               facingMode: "user",
               width: { ideal: 640 },
               height: { ideal: 480 } 
             } 
           });
           
           if(video) {
             video.srcObject = stream;
             video.onloadeddata = () => {
                webcamRunning = true;
                predictWebcam();
                onStatusChange("System Ready: Show Hand");
                onLoaded();
             };
           } else {
             console.error("Video element not found");
             onLoaded();
           }
        }
      } catch (err) {
        console.warn("CV Setup failed:", err);
        onStatusChange("Gesture Unavailable");
        onLoaded(); 
      }
    };

    const predictWebcam = () => {
      if (!handLandmarker || !webcamRunning || !video) return;
      
      let nowInMs = performance.now();
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, nowInMs);

        if (results.landmarks && results.landmarks[0]) {
          const lm = results.landmarks[0];
          const st = stateRef.current;
          
          // Control Rotation (Mirrored X)
          st.targetRotation.y = (lm[9].x - 0.5) * 3.0;
          st.targetRotation.x = (lm[9].y - 0.5) * 2.5;

          // Update Cursor
          if (sceneObjects.current.cursorMesh) {
            const cm = sceneObjects.current.cursorMesh;
            // Map 0..1 to -20..20 approx
            cm.position.set(
              (0.5 - lm[9].x) * 40,
              (0.5 - lm[9].y) * 30,
              15
            );
            // @ts-ignore
            cm.material.opacity = 1.0;
          }

          // Gesture Detection
          const getDist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
          const pinchDist = getDist(lm[4], lm[8]); 
          const palmOpenness = getDist(lm[8], lm[0]);

          let nextMode = st.mode;
          let nextStatus = "";

          // Hysteresis buffers
          if (pinchDist < 0.05) { 
            nextMode = AppMode.FOCUS; 
            nextStatus = "Gesture: Pinch (Gallery)"; 
          } 
          else if (palmOpenness < 0.25) { 
            nextMode = AppMode.TREE; 
            nextStatus = "Gesture: Fist (Tree)"; 
          }
          else if (palmOpenness > 0.60) { 
            nextMode = AppMode.SCATTER; 
            nextStatus = "Gesture: Open (Scatter)"; 
          }

          if (nextMode !== st.mode) {
            st.mode = nextMode;
            onStatusChange(nextStatus);
            updateLayout();
          }
        } else {
           // Hide cursor if no hand
           if (sceneObjects.current.cursorMesh) {
             // @ts-ignore
             sceneObjects.current.cursorMesh.material.opacity = 0;
           }
        }
      }

      if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
      }
    };

    setupCV();

    // --- Resize Handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      webcamRunning = false;
      
      // Dispose Three.js
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      materials.gold.dispose();
      materials.emerald.dispose();
      materials.ruby.dispose();
      
      // Stop webcam
      if (video && video.srcObject) {
         const stream = video.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
});

export default Canvas3D;