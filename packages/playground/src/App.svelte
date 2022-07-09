<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchDicomUrls } from './helpers/fetch-dicom';
  import { TrackballControls } from '@three-medical/viewer';
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

  let container: HTMLDivElement;

  onMount(async () => {
    const urls = await fetchDicomUrls('http://localhost:1337/pelvis');

    const loader = new DicomLoader();
    const volume = await loader.loadImageSeries(urls);

    const camera = new PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.01,
      1e10
    );
    camera.position.z = 1000;

    const scene = new Scene();

    scene.add(camera);

    // light
    const hemiLight = new HemisphereLight(0xffffff, 0x000000, 1);
    scene.add(hemiLight);

    const dirLight = new DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(200, 200, 200);
    scene.add(dirLight);

    const renderer = new WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);

    renderer.setClearColor(0x333333);

    container.appendChild(renderer.domElement);

    //box helper to see the extend of the volume
    const geometry = new BoxGeometry(
      volume.xLength,
      volume.yLength,
      volume.zLength
    );
    const material = new MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new Mesh(geometry, material);
    cube.visible = false;
    const box = new BoxHelper(cube);
    scene.add(box);
    box.applyMatrix4((volume as any).matrix);
    scene.add(cube);

    //z plane
    const sliceZ = volume.extractSlice(
      'z',
      Math.floor((volume as any).RASDimensions[2] / 4)
    );
    scene.add(sliceZ.mesh);

    //y plane
    const sliceY = volume.extractSlice(
      'y',
      Math.floor((volume as any).RASDimensions[1] / 2)
    );
    scene.add(sliceY.mesh);

    //x plane
    const sliceX = volume.extractSlice(
      'x',
      Math.floor((volume as any).RASDimensions[0] / 2)
    );

    scene.add(sliceX.mesh);

    console.log(sliceX);
    console.log((sliceX as any).index);

    const controls = new TrackballControls(camera, renderer.domElement);
    controls.minDistance = 100;
    controls.maxDistance = 5000;
    controls.rotateSpeed = 5.0;
    controls.zoomSpeed = 5;
    controls.panSpeed = 2;

    const animate = () => {
      requestAnimationFrame(animate);

      controls.update();

      renderer.render(scene, camera);
    };

    animate();
  });
</script>

<div
  bind:this={container}
  style="width: 500px; height: 500px; background: rgb(51, 51, 51);"
/>

<style>
</style>
