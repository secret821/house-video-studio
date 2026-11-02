/** Administrator-installed, checksum-pinned public models; no business media is sent to a provider. */
export const SMART_CLEAN_VERSION = 'local-ssd-ultraface-4fps-v1';
export const SMART_CLEAN_MODELS = [
  {
    name: 'person.onnx',
    sha256: '2b79e6a7fb1ec6a33f332b9b10d82d9de4b7b49dcd26b5946921bb356895c954',
    source:
      'validated/vision/object_detection_segmentation/ssd-mobilenetv1/model/ssd_mobilenet_v1_12-int8.onnx',
  },
  {
    name: 'face.onnx',
    sha256: '34cd7e60aeff28744c657de7a3dc64e872d506741de66987f3426f2b79f88017',
    source:
      'validated/vision/body_analysis/ultraface/models/version-RFB-320.onnx',
  },
] as const;
