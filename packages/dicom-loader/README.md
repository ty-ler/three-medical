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
// A list of DICOM image blob urls
const urls = [...];

const loader = new DicomLoader();
const volume = await loader.loadImageSeries(urls);
```

## loadImage

Load a single DICOM image.

```typescript
// A  DICOM image blob url
const url = [...];

const loader = new DicomLoader();
const volume = await loader.loadImage(url);
```

# Acknowledgments

### three.js

- [NRRDLoader example](https://github.com/mrdoob/three.js/blob/master/examples/jsm/loaders/NRRDLoader.js)
- [Volume](https://github.com/mrdoob/three.js/blob/master/examples/jsm/misc/Volume.js)
- [VolumeSlice](https://github.com/mrdoob/three.js/blob/master/examples/jsm/misc/VolumeSlice.js)

### Other

- [itk-wasm](https://github.com/InsightSoftwareConsortium/itk-wasm)
