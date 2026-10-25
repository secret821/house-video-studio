/** Local, conservative extraction of supplied property facts; marketing claims and contact details are never imported. */
import { z } from 'zod';

import {
  videoEditSchema,
  type VideoEditProject,
} from '../../services/definition/video-edit';

export const PROPERTY_FIELDS = [
  { key: 'name', label: '小区 / 名称', max: 32 },
  { key: 'floor', label: '楼层', max: 12 },
  { key: 'area', label: '面积', max: 20 },
  { key: 'layout', label: '户型', max: 20 },
  { key: 'decoration', label: '装修', max: 12 },
  { key: 'price', label: '总价', max: 20 },
  { key: 'extra', label: '附加空间', max: 40 },
] as const;
type PropertyKey = (typeof PROPERTY_FIELDS)[number]['key'];
export interface PropertyCandidate {
  key: PropertyKey;
  candidates: Array<string>;
  value: string;
}
export type PropertyPatch = Partial<
  Pick<VideoEditProject, 'name' | 'facts' | 'price' | 'extra'>
>;
const propertyPatchSchema = z
  .object({
    name: videoEditSchema.shape.name,
    facts: videoEditSchema.shape.facts,
    price: videoEditSchema.shape.price,
    extra: videoEditSchema.shape.extra,
  })
  .partial();
const CHINESE_DIGITS: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

/** Normalize only short Chinese floor/room counts, keeping decimal area and price strings intact. */
function countNumber(value: string): string {
  if (/^\d+$/.test(value)) return String(Number(value));
  if (value.includes('十')) {
    const [tens, units] = value.split('十');
    return String(
      (tens ? CHINESE_DIGITS[tens] : 1) * 10 +
        (units ? CHINESE_DIGITS[units] : 0),
    );
  }
  return String(CHINESE_DIGITS[value]);
}

/** Skip explicitly negated or uncertain claims rather than promoting them to facts. */
function matchValues(
  text: string,
  rule: { pattern: RegExp; format: (match: RegExpMatchArray) => string },
): Array<string> {
  return Array.from(text.matchAll(rule.pattern))
    .filter((match) => {
      const prefix = text.slice(Math.max(0, match.index! - 16), match.index);
      return (
        !/(?:不|没|未|无|非|待确认)[^，。；\n]{0,4}$/.test(prefix) &&
        !/[\d一二三四五六七八九十]\s*(?:[-—–~～/]|到|至)\s*$/.test(prefix)
      );
    })
    .map(rule.format);
}

/** Recognize labeled names or short property headings; hashtags and script prose cannot become a guessed estate name. */
function extractNames(text: string): Array<string> {
  const names = matchValues(text, {
    pattern:
      /(?:小区(?:名称)?|楼盘(?:名称)?|房源名称|项目名称)\s*[:：]\s*([^，,。；;\n|｜]{2,})/g,
    format: (match) => match[1].trim().replace(/小区$/, ''),
  });
  text.split('\n').forEach((line) => {
    if (line.trim().startsWith('#')) return;
    const heading = line
      .trim()
      .replace(/^[^\p{Script=Han}\p{L}\p{N}]+/u, '')
      .replace(/[^\p{Script=Han}\p{L}\p{N}·\s]+$/u, '');
    const match =
      /^([\p{Script=Han}A-Za-z·\s]{2,32}?)(?:小区|好房推荐|二手房推荐)$/u.exec(
        heading,
      );
    if (match && !/^(?:版本|提醒|口播|封面|置顶)/.test(heading))
      names.push(match[1].trim());
  });
  return names.filter(
    (name) => name.length <= 32 && !/1[3-9]\d{9}|电话|手机/.test(name),
  );
}

/** Deduplicate repeated versions and surface disagreements instead of selecting the first price, size or floor. */
export function extractPropertyText(raw: string): Array<PropertyCandidate> {
  const text = raw
    .slice(0, 12000)
    .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xff10));
  const values: Record<PropertyKey, Array<string>> = {
    name: extractNames(text),
    floor: matchValues(text, {
      pattern:
        /(?<![\d.一二两三四五六七八九十])([1-9]\d?|[一二两三四五六七八九]?十[一二三四五六七八九]?|[一二两三四五六七八九])\s*(?:楼|层)/g,
      format: (match) => `${countNumber(match[1])}楼`,
    }),
    area: matchValues(text, {
      pattern:
        /(?<![\d.])((?:大约|约)?\s*\d+(?:\.\d+)?)\s*(?:㎡|m²|m2|平方米|平米|平方|平)(?![A-Za-z\d])(?:\s*(左右|上下))?/giu,
      format: (match) => `${match[1].replace(/\s/g, '')}㎡${match[2] ?? ''}`,
    }),
    layout: matchValues(text, {
      pattern:
        /(?<![\d一二两三四五六七八九十])([一二两三四五六七八九]|[1-9])(?:房|室)(?:[一二两三四五六七八九1-9]厅)?(?:[一二两三四五六七八九1-9]卫)?/g,
      format: (match) =>
        match[0]
          .replace(/[一二两三四五六七八九十]/g, countNumber)
          .replace('室', '房'),
    }),
    decoration: matchValues(text, {
      pattern: /精装(?:修)?|简装(?:修)?|毛坯/g,
      format: (match) =>
        ({ 精装: '精装修', 简装: '简装修' })[match[0]] ?? match[0],
    }),
    price: matchValues(text, {
      pattern:
        /(?:总价|售价|报价|价格|仅售)\s*[:：为是仅只需]*\s*((?:大约|约)?\s*\d+(?:\.\d+)?)\s*(万元?|亿元?|元)(?:\s*(左右|上下))?/g,
      format: (match) =>
        `${match[1].replace(/\s/g, '')}${match[2].replace('万元', '万').replace('亿元', '亿')}${match[3] ?? ''}`,
    }),
    extra: matchValues(text, {
      pattern:
        /(?:附带|另带|额外带|带|赠送|赠|送)\s*(?:一个|一间|个|间)?\s*(柴草间|储藏室|储物间|车库|车位|地下室)/g,
      format: (match) => `另带${match[1]}`,
    }),
  };
  return PROPERTY_FIELDS.map(({ key }) => {
    const candidates = [...new Set(values[key])];
    return {
      key,
      candidates,
      value: candidates.length === 1 ? candidates[0] : '',
    };
  });
}

/** Apply only confirmed, nonempty fact groups; missing groups retain their existing editable values. */
export function propertyTextPatch(
  fields: Array<PropertyCandidate>,
): PropertyPatch {
  const patch: PropertyPatch = {};
  const facts = fields
    .filter((field) =>
      ['floor', 'area', 'layout', 'decoration'].includes(field.key),
    )
    .map((field) => field.value.trim())
    .filter(Boolean);
  fields.forEach(({ key, value }) => {
    if (['name', 'price', 'extra'].includes(key) && value.trim())
      Object.assign(patch, { [key]: value.trim() });
  });
  if (facts.length) patch.facts = facts.join(' / ');
  return propertyPatchSchema.parse(patch);
}
