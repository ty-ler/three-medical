/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import * as express from 'express';
import * as cors from 'cors';
import { join, extname } from 'path';
import { readdir } from 'fs';

const ASSETS_PATH = join(__dirname, 'assets');
const DICOM_PATH = join(ASSETS_PATH, 'dicom');

const filterDicomFiles = (files: string[]) =>
  files.filter((f) => extname(f) === '.dcm');

const filesToUrls = (type: 'ct' | 'dose', files: string[]) =>
  files.map((f) => `http://localhost:3333/dicom/${type}/${f}`);

const app = express();
app.use(cors());
app.use(express.static(ASSETS_PATH));

app.get('/api/ct', (req, res) => {
  const path = join(DICOM_PATH, 'ct');

  readdir(path, (e, files) => {
    if (e) {
      res.status(400);
      res.end();
      return;
    }

    const dicomFiles = filterDicomFiles(files);
    const urls = filesToUrls('ct', dicomFiles);

    res.json(urls);
  });
});

app.get('/api/dose', (req, res) => {
  const path = join(DICOM_PATH, 'dose');

  readdir(path, (e, files) => {
    if (e) {
      res.status(400);
      res.end();
      return;
    }

    const dicomFiles = filterDicomFiles(files);
    const urls = filesToUrls('dose', dicomFiles);

    res.json(urls);
  });
});

const port = process.env.port || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
