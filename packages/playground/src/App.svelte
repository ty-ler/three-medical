<script lang="ts">
  import { onMount } from 'svelte';
  import { DicomLoader } from '@three-medical/lib';

  import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
  import {
    Enums,
    RenderingEngine,
    init,
    Viewport,
    registerImageLoader,
  } from '@cornerstonejs/core/dist/umd/index';
  import * as cornerstone from '@cornerstonejs/core/dist/umd/index';

  const loader = new DicomLoader();

  loader.initialize();

  let view: HTMLDivElement;
  let viewport;
  let renderingEngine;

  onMount(async () => {
    await init();

    console.log('registering');
    registerImageLoader('wadouri', loader.loadImage);
    console.log('registered!');
    console.log(cornerstone.imageLoader.loadImage);

    const urls: string[] = await (
      await fetch('http://localhost:3333/api/ct')
    ).json();

    // const images = await Promise.all(
    //   urls.map(async (u) => await loader.loadImage(u))
    // );

    const viewportId = 'CT_AXIAL_STACK';

    const viewportInput = {
      viewportId,
      element: view,
      type: Enums.ViewportType.STACK,
    };

    renderingEngine = new RenderingEngine('myRenderingEngine');
    renderingEngine.enableElement(viewportInput);

    viewport = renderingEngine.getViewport(viewportId);
    viewport.setStack(urls, 60);

    viewport.render();
  });
</script>

<div bind:this={view} class="view" />

<style lang="scss">
  :global {
    body,
    html {
      margin: 0;
      padding: 0;
    }
  }

  .view {
    width: 100%;
    height: 100%;
    min-width: 100vw;
    min-height: 100vh;
  }
</style>
