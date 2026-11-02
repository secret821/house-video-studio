/** Disposable single-threaded vision process: model memory is released before video encoding begins. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { z } from 'zod';

const inputSchema = z.object({
  model: z.string(),
  output: z.string(),
  frames: z
    .array(z.object({ path: z.string(), time: z.number() }))
    .min(1)
    .max(2402),
});
const input = inputSchema.parse(
  JSON.parse(readFileSync(process.argv[2], 'utf8')),
);
const options: ort.InferenceSession.SessionOptions = {
  executionProviders: ['cpu'],
  logSeverityLevel: 3,
  intraOpNumThreads: 1,
  interOpNumThreads: 1,
  graphOptimizationLevel: 'all',
};
interface Sample {
  time: number;
  person: boolean;
  dark: boolean;
  mean: number;
  confidence: number;
}
const samples: Array<Sample> = [];

/** Global luma plus the dark-pixel ratio avoids treating every dark cabinet as an unusable room. */
function brightness(rgb: Uint8Array) {
  let sum = 0,
    dark = 0;
  for (let i = 0; i < rgb.length; i += 3) {
    const luma = rgb[i] * 0.2126 + rgb[i + 1] * 0.7152 + rgb[i + 2] * 0.0722;
    sum += luma;
    if (luma < 48) dark++;
  }
  const pixels = rgb.length / 3,
    mean = sum / pixels,
    ratio = dark / pixels;
  return {
    mean,
    dark: (mean < 42 && ratio > 0.7) || (mean < 60 && ratio > 0.88),
  };
}

/** COCO person boxes cover a face/body, not a category for an isolated arm. */
function bodyConfidence(outputs: ort.InferenceSession.ReturnType) {
  const scores = outputs['detection_scores'].data;
  const classes = outputs['detection_classes'].data;
  const boxes = outputs['detection_boxes'].data;
  let confidence = 0;
  for (let i = 0; i < scores.length; i++) {
    const height = Number(boxes[i * 4 + 2]) - Number(boxes[i * 4]);
    const width = Number(boxes[i * 4 + 3]) - Number(boxes[i * 4 + 1]);
    if (Number(classes[i]) === 1 && height >= 0.22 && width * height >= 0.025)
      confidence = Math.max(confidence, Number(scores[i]));
  }
  return confidence;
}

Promise.all([
  ort.InferenceSession.create(resolve(input.model, 'person.onnx'), options),
  ort.InferenceSession.create(resolve(input.model, 'face.onnx'), options),
])
  .then(([person, face]) =>
    input.frames.reduce(
      (chain, frame) =>
        chain
          .then(() =>
            sharp(frame.path)
              .removeAlpha()
              .toColourspace('srgb')
              .resize(320, 240, { fit: 'fill' })
              .raw()
              .toBuffer(),
          )
          .then((rgb) => {
            const normalized = new Float32Array(3 * 320 * 240);
            for (let i = 0; i < 320 * 240; i++)
              for (let channel = 0; channel < 3; channel++)
                normalized[channel * 320 * 240 + i] =
                  (rgb[i * 3 + channel] - 127) / 128;
            return person
              .run({
                [person.inputNames[0]]: new ort.Tensor(
                  'uint8',
                  new Uint8Array(rgb),
                  [1, 240, 320, 3],
                ),
              })
              .then((body) =>
                face
                  .run({
                    [face.inputNames[0]]: new ort.Tensor(
                      'float32',
                      normalized,
                      [1, 3, 240, 320],
                    ),
                  })
                  .then((faces) => {
                    const scores = faces.scores.data,
                      boxes = faces.boxes.data;
                    let faceScore = 0;
                    for (let i = 0; i < scores.length / 2; i++) {
                      const width =
                        Number(boxes[i * 4 + 2]) - Number(boxes[i * 4]);
                      const height =
                        Number(boxes[i * 4 + 3]) - Number(boxes[i * 4 + 1]);
                      if (width * height >= 0.0012)
                        faceScore = Math.max(
                          faceScore,
                          Number(scores[i * 2 + 1]),
                        );
                    }
                    const bodyScore = bodyConfidence(body);
                    samples.push({
                      time: frame.time,
                      person: bodyScore >= 0.65 || faceScore >= 0.85,
                      confidence: Math.max(bodyScore, faceScore),
                      ...brightness(rgb),
                    });
                  }),
              );
          }),
      Promise.resolve(),
    ),
  )
  .then(() =>
    writeFileSync(input.output, JSON.stringify(samples), { mode: 0o600 }),
  )
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Local detection failed',
    );
    process.exitCode = 1;
  });
