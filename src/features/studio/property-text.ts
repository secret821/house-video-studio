/** Local, conservative extraction of supplied property facts; marketing claims and contact details are never imported. */
import { z } from 'zod';

import {
  videoEditSchema,
  type VideoEditProject,
} from '../../services/definition/video-edit';

import {
  PROPERTY_FIELDS,
  type PropertyCandidate,
} from '../../services/definition/property-extraction';
export {
  PROPERTY_FIELDS,
  type PropertyCandidate,
} from '../../services/definition/property-extraction';
type PropertyKey = PropertyCandidate['key'];
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
  rule: {
    pattern: RegExp;
    format: (match: RegExpMatchArray) => string;
    ignorePrefix?: RegExp;
  },
): Array<string> {
  return Array.from(text.matchAll(rule.pattern))
    .filter((match) => {
      const prefix = text.slice(Math.max(0, match.index! - 16), match.index);
      return (
        !/(?:不|没|未|无|非|待确认)[^，。；\n]{0,4}$/.test(prefix) &&
        !/[\d一二三四五六七八九十]\s*(?:[-—–~～/]|到|至)\s*$/.test(prefix) &&
        !rule.ignorePrefix?.test(prefix)
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
    location: matchValues(text, {
      pattern:
        /(?:位于|坐落于|位置\s*[:：])\s*([\p{Script=Han}\p{N}·路号弄巷 ]{2,32})(?=[，,。；;\n]|$)/gu,
      format: (match) => match[1].trim(),
    }).filter((location) => !/1[3-9]\d{9}|电话|手机/.test(location)),
    propertyType: matchValues(text, {
      pattern: /独栋别墅|双拼别墅|联排别墅|叠拼别墅|别墅|洋房|公寓|住宅/g,
      format: (match) => match[0],
    }),
    storeys: matchValues(text, {
      pattern:
        /(?:总高|共有|共|整栋|全栋)\s*([1-9]\d?|[一二两三四五六七八九]?十[一二三四五六七八九]?|[一二两三四五六七八九])\s*层|(?<![\d.一二两三四五六七八九十])([1-9]\d?|[一二两三四五六七八九]?十[一二三四五六七八九]?|[一二两三四五六七八九])\s*层\s*(?:格局|结构)/g,
      format: (match) => `共${countNumber(match[1] ?? match[2])}层`,
    }),
    floor: matchValues(text, {
      pattern:
        /(?<![\d.一二两三四五六七八九十])([1-9]\d?|[一二两三四五六七八九]?十[一二三四五六七八九]?|[一二两三四五六七八九])\s*(?:楼|层)(?!\s*(?:格局|结构))/g,
      ignorePrefix: /(?:总高|共有|共|整栋|全栋)\s*$/,
      format: (match) => `${countNumber(match[1])}楼`,
    }),
    area: matchValues(text, {
      pattern:
        /(?<![\d.])(?:(产证(?:面积)?|产权面积)\s*[:：为是]?\s*)?((?:大约|约)?\s*\d+(?:\.\d+)?)\s*(?:个\s*)?(?:㎡|m²|m2|平方米|平米|平方|平)(?![A-Za-z\d])(?:\s*(左右|上下))?/giu,
      format: (match) =>
        `${match[1] ? '产证' : ''}${match[2].replace(/\s/g, '')}㎡${match[3] ?? ''}`,
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
        /(?:附带|另带|额外带|带|赠送|赠|送)\s*(?:一个|一间|个|间)?\s*(柴草间|储藏室|储物间|车库|车位|地下室)|挑空(?:大)?客厅/g,
      format: (match) => (match[1] ? `另带${match[1]}` : '挑空客厅'),
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
      [
        'location',
        'propertyType',
        'storeys',
        'floor',
        'area',
        'layout',
        'decoration',
      ].includes(field.key),
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
