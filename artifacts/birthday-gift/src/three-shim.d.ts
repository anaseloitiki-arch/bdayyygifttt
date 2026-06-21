declare module "three" {
  export class WebGLRenderer {
    domElement: HTMLCanvasElement;
    constructor(params?: { alpha?: boolean; antialias?: boolean });
    setSize(w: number, h: number): void;
    setPixelRatio(r: number): void;
    setClearColor(color: number, alpha: number): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }
  export class Scene {
    add(...objects: Object3D[]): this;
  }
  export class Object3D {
    position: Vector3;
    rotation: Euler;
    scale: Vector3;
    traverse(cb: (node: Object3D) => void): void;
    clone(deep?: boolean): this;
  }
  export class Mesh extends Object3D {
    isMesh: boolean;
    material: Material | Material[];
    geometry: BufferGeometry;
  }
  export class BufferGeometry {}
  export class Material {
    transparent: boolean;
    opacity: number;
    clone(): this;
  }
  export class MeshPhongMaterial extends Material {}
  export class Camera extends Object3D {}
  export class PerspectiveCamera extends Camera {
    constructor(fov: number, aspect: number, near: number, far: number);
    position: Vector3;
    lookAt(x: number, y?: number, z?: number): void;
  }
  export class Light extends Object3D {}
  export class AmbientLight extends Light {
    constructor(color?: number, intensity?: number);
  }
  export class DirectionalLight extends Light {
    constructor(color?: number, intensity?: number);
    position: Vector3;
  }
  export class Vector3 {
    x: number; y: number; z: number;
    set(x: number, y: number, z: number): this;
    setScalar(s: number): this;
  }
  export class Euler {
    x: number; y: number; z: number;
  }
}

declare module "three/examples/jsm/loaders/MTLLoader.js" {
  import type { Object3D } from "three";
  export class MaterialCreator {
    preload(): void;
  }
  export class MTLLoader {
    setPath(path: string): this;
    load(url: string, cb: (mats: MaterialCreator) => void): void;
  }
}

declare module "three/examples/jsm/loaders/OBJLoader.js" {
  import type { Object3D } from "three";
  import type { MaterialCreator } from "three/examples/jsm/loaders/MTLLoader.js";
  export class OBJLoader {
    setPath(path: string): this;
    setMaterials(mats: MaterialCreator): this;
    load(url: string, cb: (obj: Object3D) => void): void;
  }
}
