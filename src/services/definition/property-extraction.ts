/** Property extraction is a reviewable suggestion contract shared by the local parser and Bailian boundary. */
import { z } from 'zod';

import { COPY_MODEL } from './copy';

export const PROPERTY_FIELDS = [
  { key: 'name', label: '小区 / 名称', max: 32 },
  { key: 'location', label: '位置', max: 32 },
  { key: 'propertyType', label: '房屋类型', max: 12 },
  { key: 'storeys', label: '建筑层数', max: 12 },
  { key: 'floor', label: '所在楼层', max: 12 },
  { key: 'area', label: '面积', max: 20 },
  { key: 'layout', label: '户型', max: 20 },
  { key: 'decoration', label: '装修', max: 12 },
  { key: 'price', label: '总价', max: 20 },
  { key: 'extra', label: '附加特点', max: 40 },
] as const;
export const propertyKeySchema = z.enum([
  'name',
  'location',
  'propertyType',
  'storeys',
  'floor',
  'area',
  'layout',
  'decoration',
  'price',
  'extra',
]);
export const propertyEvidenceSchema = z.object({
  value: z.string().trim().min(1).max(40),
  quote: z.string().trim().min(1).max(240),
});
export const propertyCandidateSchema = z.object({
  key: propertyKeySchema,
  candidates: z.array(z.string().min(1).max(40)).max(8),
  value: z.string().max(40),
  evidence: z.array(propertyEvidenceSchema).max(8).optional(),
});
export const propertyExtractionInputSchema = z.object({
  text: z.string().trim().min(1).max(12000),
  freeQuotaConfirmed: z.literal(true),
});
export const propertyExtractionResultSchema = z.object({
  model: z.literal(COPY_MODEL),
  cached: z.boolean(),
  fields: z.array(propertyCandidateSchema).length(PROPERTY_FIELDS.length),
});
export type PropertyCandidate = z.infer<typeof propertyCandidateSchema>;
export type PropertyExtractionResult = z.infer<
  typeof propertyExtractionResultSchema
>;
