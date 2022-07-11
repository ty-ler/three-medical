<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { fetchDicomUrls } from './helpers/fetch-dicom';
  import {
    MPROrthographicCamera,
    Orientation,
    RenderLoop,
    setRendererContainerElement,
  } from '@three-medical/core';
  import DicomLoader from '@three-medical/dicom-loader';
  import {
    PerspectiveCamera,
    Scene,
    HemisphereLight,
    DirectionalLight,
    WebGLRenderer,
    BoxGeometry,
    MeshBasicMaterial,
    Mesh,
    BoxHelper,
    Color,
  } from 'three';
  import type { VolumeSlice } from 'packages/dicom-loader/src/lib/common/volume-slice';
  import type { Volume } from 'packages/dicom-loader/src/lib/common/volume';
  import { inflate } from 'pako';

  let container: HTMLDivElement;
  // let viewport: Viewport;
  let renderer: WebGLRenderer = new WebGLRenderer({
    antialias: true,
  });
  let renderLoop: RenderLoop;

  let volume: Volume;
  let sliceX: VolumeSlice;
  let sliceY: VolumeSlice;
  let sliceZ: VolumeSlice;

  const setupRenderer = () => {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x333333);
  };

  const handleChangeSliceSlider = (e: Event, slice: VolumeSlice) => {
    const inputElement = e.target as HTMLInputElement;
    (slice as any).index = inputElement.value;

    slice.repaint();
  };

  onMount(async () => {
    setupRenderer();

    const urls = await fetchDicomUrls(
      'http://localhost:1337/prostate/compressed'
    );

    const loader = new DicomLoader();
    volume = await loader.loadImageSeries(urls, (buffer) => {
      const uint8 = new Uint8Array(buffer);
      const decompressed = inflate(uint8);

      return decompressed.buffer;
    });

    // const camera = new PerspectiveCamera(
    //   60,
    //   container.clientWidth / container.clientHeight,
    //   0.01,
    //   1e10
    // );
    // camera.position.z = 1000;

    const camera = new MPROrthographicCamera(Orientation.AXIAL);
    camera.updateValuesForContainerElement(container);

    const scene = new Scene();

    // // light
    // const hemiLight = new HemisphereLight(0xffffff, 0x000000, 1);
    // scene.add(hemiLight);

    // const dirLight = new DirectionalLight(0xffffff, 0.5);
    // dirLight.position.set(200, 200, 200);
    // scene.add(dirLight);

    //box helper to see the extend of the volume
    const geometry = new BoxGeometry(
      volume.xLength * volume.spacing[0],
      volume.yLength * volume.spacing[1],
      volume.zLength * volume.spacing[2]
    );
    const material = new MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new Mesh(geometry, material);
    cube.visible = false;
    const box = new BoxHelper(cube);
    scene.add(box);
    box.applyMatrix4((volume as any).matrix);
    scene.add(cube);

    //z plane
    sliceZ = volume.extractSlice(
      'z',
      Math.floor((volume as any).RASDimensions[2] / 4)
    );
    scene.add(sliceZ.mesh);

    //y plane
    sliceY = volume.extractSlice(
      'y',
      Math.floor((volume as any).RASDimensions[1] / 2)
    );
    scene.add(sliceY.mesh);

    //x plane
    sliceX = volume.extractSlice(
      'x',
      Math.floor((volume as any).RASDimensions[0] / 2)
    );
    scene.add(sliceX.mesh);

    // const renderer = viewport.getRenderer();
    // const controls = new TrackballControls(camera, renderer.domElement);
    // controls.minDistance = 100;
    // controls.maxDistance = 5000;
    // controls.rotateSpeed = 5.0;
    // controls.zoomSpeed = 5;
    // controls.panSpeed = 2;
    // controls.noRotate = true;

    setRendererContainerElement(renderer, container);

    renderLoop = new RenderLoop({
      renderer,
      scene,
      camera,
      renderCallback: () => {
        // controls.update();
        // camera.position.z += 0.01;
        // camera.rotation.x += 0.01;
        // camera.rotateX(0.01);
        // camera.rotateZ(Orientation.AXIAL.rotation);
        // camera.rotateX(0.01);
      },
    });

    renderLoop.start();
  });

  onDestroy(() => {
    // viewport.cancelRenderLoop();
    renderLoop.stop();
  });
</script>

<div style="display: flex; gap: 1rem;">
  <div
    bind:this={container}
    style="width: 800px; height: 800px; background: teal;"
  />

  {#if volume}
    <div>
      <label>Axial</label>
      <input
        type="range"
        min={0}
        max={volume?.zLength - 1}
        on:input={(e) => handleChangeSliceSlider(e, sliceZ)}
      />
      <label>Sagittal</label>
      <input
        type="range"
        min={0}
        max={volume?.xLength - 1}
        on:input={(e) => handleChangeSliceSlider(e, sliceX)}
      />
      <label>Coronal</label>
      <input
        type="range"
        min={0}
        max={volume?.yLength - 1}
        on:input={(e) => handleChangeSliceSlider(e, sliceY)}
      />
    </div>
  {/if}
</div>

<style>
</style>
