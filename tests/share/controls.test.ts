import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ESLint } from 'eslint';

import {
  Button,
  ButtonAppearance,
  Checkbox,
  Form,
  Input,
} from '../../src/share/ui/index';

test('shared buttons retain submit, disabled and download semantics', () => {
  const submit = renderToStaticMarkup(
    createElement(
      Button,
      {
        appearance: ButtonAppearance.Solid,
        htmlType: 'submit',
        disabled: true,
        'aria-label': 'Submit video',
      },
      'Submit',
    ),
  );
  assert.match(submit, /type="submit"/);
  assert.match(submit, /disabled=""/);
  assert.match(submit, /aria-label="Submit video"/);
  const download = renderToStaticMarkup(
    createElement(
      Button,
      {
        href: '/exports/example.mp4',
        download: 'example.mp4',
      },
      'Download',
    ),
  );
  assert.match(download, /<a /);
  assert.match(download, /href="\/exports\/example.mp4"/);
  assert.match(download, /download="example.mp4"/);
});

test('Form.Item injects values into wrapped input and password fields', () => {
  const markup = renderToStaticMarkup(
    createElement(
      Form,
      {
        initialValues: { username: 'test-account', password: 'test-only' },
      },
      createElement(
        Form.Item,
        { name: 'username' },
        createElement(Input, { 'aria-label': 'Account' }),
      ),
      createElement(
        Form.Item,
        { name: 'password' },
        createElement(Input.Password, { 'aria-label': 'Password' }),
      ),
    ),
  );
  assert.match(markup, /value="test-account"/);
  assert.match(markup, /type="password"/);
  assert.match(markup, /value="test-only"/);
});

test('checkbox compound control preserves controlled selection', () => {
  const markup = renderToStaticMarkup(
    createElement(Checkbox.Group<number>, {
      value: [2],
      options: [
        { label: 'One', value: 1 },
        { label: 'Two', value: 2 },
      ],
    }),
  );
  assert.equal((markup.match(/checked=""/g) ?? []).length, 1);
  assert.ok(
    markup
      .match(/<input[^>]*>/g)
      ?.some(
        (input) => input.includes('value="2"') && input.includes('checked=""'),
      ),
  );
});

test('page imports cannot bypass the shared UI boundary', () => {
  return new ESLint()
    .lintText("import { Button } from 'antd';\nvoid Button;\n", {
      filePath: 'src/features/studio/ui-import-boundary-check.ts',
    })
    .then(([result]) => {
      assert.ok(
        result.messages.some(
          (message) => message.ruleId === 'no-restricted-imports',
        ),
      );
    });
});
