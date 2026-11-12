/** Real pasted marketing variants exercise extraction boundaries without cloud calls or project writes. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractPropertyText,
  propertyTextPatch,
} from '../../src/features/studio/photo/property-text';

export const VILLA_PROPERTY_COPY = `1. 在安福想找别墅的朋友，这套千万别划走。
2. 位于老城区，出行配套都很成熟。
3. 四层格局，产证375.38个平方。
4. 一二楼做了挑空大客厅，气场直接拉满。
5. 房间多，大家庭住起来宽松舒服。
6. 这套总价336万。
7. 想看户型、实地看房，直接私信我。`;

test('villa speech keeps storeys distinct from floor and preserves the deed area without guessing a name or room count', () => {
  const fields = extractPropertyText(VILLA_PROPERTY_COPY);
  assert.deepEqual(propertyTextPatch(fields), {
    facts: '老城区 / 别墅 / 共4层 / 产证375.38㎡',
    price: '336万',
    extra: '挑空客厅',
  });
  for (const key of ['name', 'floor', 'layout', 'decoration'])
    assert.equal(fields.find((field) => field.key === key)?.value, '');
});

test('total storeys and actual floor coexist; spacing, spoken units and repeated versions remain compatible', () => {
  const fields = extractPropertyText(
    '总高 12 层，实际3楼。产证面积：375.38个平方米。产证375.38平方。',
  );
  assert.deepEqual(propertyTextPatch(fields), {
    facts: '共12层 / 3楼 / 产证375.38㎡',
  });
  assert.equal(
    fields.find((field) => field.key === 'area')?.candidates.length,
    1,
  );
  assert.deepEqual(propertyTextPatch(extractPropertyText('四层 格局')), {
    facts: '共4层',
  });
});

test('villa facts still reject negation and ranges and require confirmation for conflicting storeys', () => {
  assert.deepEqual(
    propertyTextPatch(
      extractPropertyText(
        '不是别墅，不位于老城区，不是四层格局，不是产证375.38个平方，没有挑空大客厅。',
      ),
    ),
    {},
  );
  assert.deepEqual(
    propertyTextPatch(extractPropertyText('3到4层格局，375-380个平方')),
    {},
  );
  const fields = extractPropertyText('四层格局，五层结构。');
  assert.deepEqual(
    fields.find((field) => field.key === 'storeys')?.candidates,
    ['共4层', '共5层'],
  );
  assert.equal(fields.find((field) => field.key === 'storeys')?.value, '');
  assert.deepEqual(
    propertyTextPatch(extractPropertyText('位置：手机13812345678。')),
    {},
  );
});

export const PASTED_PROPERTY_COPY = `⚠️提醒：视频号正文不要直接写手机号，号码放在主页简介。
版本1｜爆款吸睛版（视频号正文）
🔥安福浅水湾好房推荐
3楼黄金楼层｜128.65㎡，精装修
房子保养得很新，拎包就能入住
还附带柴草间，储物很方便
总价仅59万，刚需自住很合适
想看实拍、约看房，欢迎私信我😊
#安福二手房 #安福浅水湾 #安福同城买房
【口播文案｜26秒】
安福浅水湾，黄金三楼来啦！128.65平方，全屋精装，房子保养非常新，还送柴草间，总价59万，刚需居家很合适，想看房私信我！
【封面大字】
浅水湾 黄金3楼 精装带柴草间
【置顶评论（安全）】
房源实拍资料、户型图私信发给您，支持实地看房！
版本2｜走心温和版（适合真人出镜）
安福浅水湾小区🏠
黄金3楼，128.65㎡精装三房
全屋保养清爽，不用二次装修
额外带柴草间，杂物收纳无忧
总价59万，小区配套成熟
有兴趣看房的朋友私信咨询
#安福好房 #浅水湾二手房
【口播文案｜28秒】
想在浅水湾安家的看过来，这套黄金三楼，128.65平精装修，保养很新，还带柴草间，总价59万，居家很舒服，想看房可以私信我。`;

test('pasted versions deduplicate facts and do not import marketing, contacts or scripts', () => {
  const fields = extractPropertyText(
    `${PASTED_PROPERTY_COPY}\n手机号13812345678`,
  );
  assert.equal(
    fields.some((field) => field.candidates.length > 1),
    false,
  );
  assert.deepEqual(propertyTextPatch(fields), {
    name: '安福浅水湾',
    facts: '3楼 / 128.65㎡ / 3房 / 精装修',
    price: '59万',
    extra: '另带柴草间',
  });
});

test('disagreements remain unselected until explicitly resolved; repeated identical versions are not conflicts', () => {
  const fields = extractPropertyText(
    '小区：浅水湾\n总价59万，3楼，128.65㎡\n总价60万，4楼，129㎡\n总价59万',
  );
  assert.deepEqual(fields.find((field) => field.key === 'price')?.candidates, [
    '59万',
    '60万',
  ]);
  assert.equal(fields.find((field) => field.key === 'price')?.value, '');
  for (const key of ['area', 'floor'])
    assert.equal(fields.find((field) => field.key === key)?.value, '');
  const resolved = fields.map((field) => ({
    ...field,
    value: field.candidates[0] ?? '',
  }));
  assert.equal(propertyTextPatch(resolved).price, '59万');
});

test('unrecognized copy cannot seed an estate from hashtags, claims, phone numbers or old draft defaults', () => {
  const fields = extractPropertyText(
    '爆款吸睛版！黄金楼层，拎包入住，配套成熟，保养很新。\n#安福浅水湾\n联系电话13812345678，口播26秒',
  );
  assert.deepEqual(propertyTextPatch(fields), {});
  assert.deepEqual(propertyTextPatch(extractPropertyText('总价59万')), {
    price: '59万',
  });
});

test('explicit facts support labeled names, Chinese counts and common units without losing decimals', () => {
  const fields = extractPropertyText(
    '小区名称：幸福家园\n十二楼，建筑面积99.08平方米，3室2厅1卫，简装，总价88.50万元，带储藏室',
  );
  assert.deepEqual(propertyTextPatch(fields), {
    name: '幸福家园',
    facts: '12楼 / 99.08㎡ / 3房2厅1卫 / 简装修',
    price: '88.50万',
    extra: '另带储藏室',
  });
});

test('negated facts do not become positive imported claims', () => {
  const fields = extractPropertyText(
    '不是3楼，实际4楼；并非精装修，无车位，不带柴草间。',
  );
  assert.deepEqual(propertyTextPatch(fields), { facts: '4楼' });
});

test('confirmed preview must fit saved project field limits and can omit a group', () => {
  const fields = extractPropertyText('小区：浅水湾，3楼，128.65㎡');
  const tooLong = fields.map((field) =>
    field.key === 'name' ? { ...field, value: '很长的名称'.repeat(20) } : field,
  );
  assert.throws(() => propertyTextPatch(tooLong));
  const noFacts = fields.map((field) => ({
    ...field,
    value: field.key === 'name' ? field.value : '',
  }));
  assert.deepEqual(propertyTextPatch(noFacts), { name: '浅水湾' });
});

test('approximate values stay approximate, ranges and phone-like names require manual entry', () => {
  assert.deepEqual(
    propertyTextPatch(extractPropertyText('约128.65㎡左右，总价约59万')),
    {
      facts: '约128.65㎡左右',
      price: '约59万',
    },
  );
  assert.deepEqual(
    propertyTextPatch(
      extractPropertyText(
        '128-130㎡，3/18层，3到4楼\n小区：13812345678\n#浅水湾好房推荐',
      ),
    ),
    {},
  );
  assert.deepEqual(
    propertyTextPatch(extractPropertyText('一二楼，十一房，11房')),
    {},
  );
});

test('labeled Beike-style facts preserve a plus price and do not mistake a short room count for a conflict', () => {
  const fields = extractPropertyText(`1、🏡百顺苑小区
✅面积：133.93㎡
✅户型：4房2厅2卫
✅装修：精装修
✅亮点：顶楼带露台 + 附带柴草间
✅朝向：南北通透
✅税费：满五唯一，不限购
✅总价：70+万
大四房空间足，露台可种花晾晒`);
  assert.deepEqual(propertyTextPatch(fields), {
    name: '百顺苑',
    facts: '顶楼 / 133.93㎡ / 4房2厅2卫 / 精装修',
    price: '70+万',
    extra: '带露台 / 另带柴草间 / 南北通透 / 满五唯一 / 不限购',
  });
  assert.equal(
    fields.find((field) => field.key === 'layout')?.candidates.length,
    1,
  );
});

test('different complete layouts conflict and negated extras cannot become positive claims', () => {
  const fields = extractPropertyText(
    '户型4房2厅2卫，另一版4房1厅2卫；不带露台，未满五唯一。',
  );
  assert.deepEqual(fields.find((field) => field.key === 'layout')?.candidates, [
    '4房2厅2卫',
    '4房1厅2卫',
  ]);
  assert.equal(fields.find((field) => field.key === 'extra')?.value, '');
});

test('OCR line spacing and a misread square-metre glyph remain reviewable', () => {
  assert.deepEqual(
    propertyTextPatch(
      extractPropertyText('小区名称 百顺苑\n面积： 133.93m\n总价：70+万'),
    ),
    { name: '百顺苑', facts: '133.93㎡', price: '70+万' },
  );
  assert.deepEqual(propertyTextPatch(extractPropertyText('长度 133.93m')), {});
});

test('a real listing screenshot uses the price and building area below the floor plan', () => {
  const fields = extractPropertyText(`满五
学府花园复式楼，5房3厅2卫。精装修。
售价：66.8万
房型：5室3厅
建筑面积：168.45㎡
楼栋 商品房 建成年代未知
普通住宅 板楼
房源 南朝向 无电梯
高楼层(共7层)
小区 学府花园(安福且·安福且)`);
  assert.deepEqual(propertyTextPatch(fields), {
    name: '学府花园',
    facts: '住宅 / 共7层 / 高楼层 / 168.45㎡ / 5房3厅2卫 / 精装修',
    price: '66.8万',
    extra: '满五 / 南朝向 / 无电梯',
  });
});

test('pasted screenshot OCR pairs the value row with its labels and ignores room sizes', () => {
  const fields = extractPropertyText(`厨房 6.28m
主卧 13.31m²
户型 图片
必看小区 安福县1万以下必看小区榜·第7名 满五
学府花园复式楼，5房3厅2卫。精装修。
66.8万 5室3厅 168.45
售价 房型 建筑面积
概览 动态 评价 小区 推荐
普通住宅 板楼
房源 南朝向 无电梯
高楼层(共7层)
小区 学府花园(安福且·安福且)`);
  assert.deepEqual(propertyTextPatch(fields), {
    name: '学府花园',
    facts: '住宅 / 共7层 / 高楼层 / 168.45㎡ / 5房3厅2卫 / 精装修',
    price: '66.8万',
    extra: '满五 / 南朝向 / 无电梯',
  });
});
