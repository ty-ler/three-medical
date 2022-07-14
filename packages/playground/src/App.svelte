<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { fetchDicomUrls } from './helpers/fetch-dicom';
  import {
    ControlMethod,
    MPROrthographicCamera,
    MPRVolumeSliceControls,
    Orientation,
    RenderLoop,
    setRendererContainerElement,
    Volume,
    VolumeSlice,
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
  import { inflate } from 'pako';

  let containerAxial: HTMLDivElement;
  let containerSagittal: HTMLDivElement;
  let containerCoronal: HTMLDivElement;

  let renderLoopAxial: RenderLoop;
  let renderLoopSagittal: RenderLoop;
  let renderLoopCoronal: RenderLoop;

  // let viewport: Viewport;

  const setupRenderer = (renderer: WebGLRenderer) => {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x333333);
  };

  const setupScene = (
    containerElement: HTMLDivElement,
    volume: Volume,
    orientation: Orientation
  ) => {
    if (!containerElement) return;

    const renderer: WebGLRenderer = new WebGLRenderer({
      antialias: true,
    });

    const size = volume.getOrientationSize(orientation);
    const intialIndex = Math.floor(
      orientation === Orientation.AXIAL ? size / 4 : size / 2
    );
    const slice: VolumeSlice = volume.extractSlice(orientation, intialIndex);

    setupRenderer(renderer);

    // const camera = new PerspectiveCamera(
    //   60,
    //   container.clientWidth / container.clientHeight,
    //   0.01,
    //   1e10
    // );
    // camera.position.z = 1000;

    const camera = new MPROrthographicCamera(orientation);
    camera.updateValuesForContainerElement(containerElement);

    const scene = new Scene();

    scene.add(slice.mesh);

    camera.fitToMesh(
      slice.mesh,
      containerElement.clientWidth,
      containerElement.clientHeight,
      25
    );

    setRendererContainerElement(renderer, containerElement);

    // const controls = new TrackballControls(camera, renderer.domElement);
    // controls.minDistance = 100;
    // controls.maxDistance = 5000;
    // controls.rotateSpeed = 5.0;
    // controls.zoomSpeed = 5;
    // controls.panSpeed = 2;
    // controls.noRotate = true;

    const controls = new MPRVolumeSliceControls(camera, renderer, slice)
      .withSlicing({
        methods: [ControlMethod.Primary],
      })
      .withZoom({
        methods: [ControlMethod.Secondary, ControlMethod.Wheel],
      });

    controls;
    const renderLoop = new RenderLoop({
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
  };

  const handleChangeSliceSlider = (e: Event, slice: VolumeSlice) => {
    const inputElement = e.target as HTMLInputElement;
    slice.setIndex(Number(inputElement.value));

    slice.repaint();
  };

  onMount(async () => {
    const urls = await fetchDicomUrls(
      'http://localhost:1337/prostate/compressed'
    );

    const loader = new DicomLoader();
    const volume = await loader.loadImageSeries(urls, (buffer) => {
      const uint8 = new Uint8Array(buffer);
      const decompressed = inflate(uint8);

      return decompressed.buffer;

      return buffer;
    });

    setupScene(containerAxial, volume, Orientation.AXIAL);
    setupScene(containerSagittal, volume, Orientation.SAGITTAL);
    setupScene(containerCoronal, volume, Orientation.CORONAL);

    //box helper to see the extend of the volume
    // const [sizeX, sizeY, sizeZ] = volume.getSize();
    // const [spacingX, spacingY, spacingZ] = volume.getSpacing();

    // const geometry = new BoxGeometry(
    //   sizeX * spacingX,
    //   sizeY * spacingY,
    //   sizeZ * spacingZ
    // );
    // const material = new MeshBasicMaterial({ color: 0x00ff00 });
    // const cube = new Mesh(geometry, material);
    // cube.visible = false;
    // const box = new BoxHelper(cube);
    // scene.add(box);
    // box.applyMatrix4(volume.getMatrix());
    // scene.add(cube);
  });

  onDestroy(() => {
    renderLoopAxial?.stop();
    renderLoopSagittal?.stop();
    renderLoopCoronal?.stop();
  });
</script>

<div style="display: flex; flex-wrap: wrap; gap: .5rem;">
  <div bind:this={containerAxial} class="scene" />

  <div bind:this={containerSagittal} class="scene" />

  <div bind:this={containerCoronal} class="scene" />

  <!-- {#if volume}
    <div>
      <label>Axial</label>
      <input
        type="range"
        min={0}
        max={sliceZ.getMaxIndex()}
        on:input={(e) => handleChangeSliceSlider(e, sliceZ)}
      />
      <label>Sagittal</label>
      <input
        type="range"
        min={0}
        max={sliceX.getMaxIndex()}
        on:input={(e) => handleChangeSliceSlider(e, sliceX)}
      />
      <label>Coronal</label>
      <input
        type="range"
        min={0}
        max={sliceY.getMaxIndex()}
        on:input={(e) => handleChangeSliceSlider(e, sliceY)}
      />
    </div>
  {/if} -->
</div>

<style>
  .scene {
    min-width: 800px;
    min-height: 800px;
    background: teal;
    cursor: pointer;
  }
</style>
