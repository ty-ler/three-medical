# dicom-loader

three.js DICOM loader

**NOTE:** This package is a work in progress and should not be used in production.

# Usage

## Install

```
npm install @three-medical/dicom-loader
```

## loadImageSeries

Load a DICOM image series.

```typescript
// A list of URLs pointing to .dcm files
const urls = [...];

const loader = new DicomLoader();
const volume = await loader.loadImageSeries(urls);
```

## loadImage

Load a single DICOM image.

```typescript
// A URL pointing to a .dcm file
const url = [...];

const loader = new DicomLoader();
const volume = await loader.loadImage(url);
```

## processBufferCallback (method parameter)

Optional parameter for the `loadImageSeries` and `loadImage` methods.

A callback used to process the buffer received from the URL. For example, this can be useful if the buffer received is compressed.

```typescript
import pako from 'pako';

// A list of URLs pointing to .dcm.gz files (NOTE: files are compressed)
const urls = [...];

const processBufferCallback = (buffer: ArrayBuffer) => {
	// First we'll turn the buffer into a Uint8Array to make pako.inflate happy
	const uint8 = new Uint8Array(buffer);

	// Use pako to decompress the buffer
	const decompressed = pako.inflate(uint8);

	// Finally, return the buffer from the decompressed Uint8Array
	return decompressed.buffer;
};

const loader = new DicomLoader();
const volume = await loader.loadImageSeries(urls, processBufferCallback);
```

# Acknowledgments

### three.js

- [NRRDLoader example](https://github.com/mrdoob/three.js/blob/master/examples/jsm/loaders/NRRDLoader.js)
- [Volume](https://github.com/mrdoob/three.js/blob/master/examples/jsm/misc/Volume.js)
- [VolumeSlice](https://github.com/mrdoob/three.js/blob/master/examples/jsm/misc/VolumeSlice.js)

### Other

- [itk-wasm](https://github.com/InsightSoftwareConsortium/itk-wasm)

# Source

### [@three-medical/dicom-loader](https://github.com/ty-ler/three-medical/tree/master/packages/dicom-loader)
