import * as THREE from 'three';
import './style.css';
import { Engine } from '@/core/Engine';

const app = document.querySelector<HTMLDivElement>('#app')!;
const engine = new Engine(app);

engine.scene.background = new THREE.Color(0x87ceeb);

const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x444433, 1.2);
engine.scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(20, 30, 10);
engine.scene.add(sun);

const grid = new THREE.GridHelper(100, 100, 0x222222, 0x444444);
engine.scene.add(grid);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff4444 }),
);
cube.position.y = 0.5;
engine.scene.add(cube);

engine.onRender(() => {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.013;
});

engine.start();
