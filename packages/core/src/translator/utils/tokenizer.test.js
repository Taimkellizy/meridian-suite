import { tokenizeString } from './tokenizer.js';
import { detokenizeString } from './detokenizer.js';
import test from 'node:test';
import assert from 'node:assert/strict';

test('tokenizer/detokenizer round-trips', async (t) => {
  await t.test('standard {{var}}', () => {
    const { tokenizedString, variableMap } = tokenizeString('Hello {{name}}!');
    assert.equal(tokenizedString, 'Hello <v id="0" />!');
    assert.equal(variableMap[0].full, '{{name}}');
    assert.equal(variableMap[0].inner, 'name');
    assert.equal(detokenizeString(tokenizedString, variableMap), 'Hello {{name}}!');
  });

  await t.test('spaced {{ var }}', () => {
    const { tokenizedString, variableMap } = tokenizeString('Hi {{ name }}');
    assert.equal(tokenizedString, 'Hi <v id="0" />');
    assert.equal(variableMap[0].full, '{{ name }}');
    assert.equal(variableMap[0].inner, 'name');
    assert.equal(detokenizeString(tokenizedString, variableMap), 'Hi {{ name }}');
  });

  await t.test('triple {{{var}}}', () => {
    const { tokenizedString, variableMap } = tokenizeString('Raw {{{value}}} output');
    assert.equal(tokenizedString, 'Raw <v id="0" /> output');
    assert.equal(variableMap[0].full, '{{{value}}}');
    assert.equal(detokenizeString(tokenizedString, variableMap), 'Raw {{{value}}} output');
  });

  await t.test('adjacent variables get distinct ids', () => {
    const { tokenizedString, variableMap } = tokenizeString('{{a}}{{b}}');
    assert.equal(tokenizedString, '<v id="0" /><v id="1" />');
    assert.equal(variableMap[0].inner, 'a');
    assert.equal(variableMap[1].inner, 'b');
    assert.equal(detokenizeString(tokenizedString, variableMap), '{{a}}{{b}}');
  });

  await t.test('string without variables passes through', () => {
    const { tokenizedString, variableMap } = tokenizeString('plain text');
    assert.equal(tokenizedString, 'plain text');
    assert.deepEqual(variableMap, {});
  });

  await t.test('unclosed braces are left as literal text', () => {
    const { tokenizedString, variableMap } = tokenizeString('oops {{name');
    assert.equal(tokenizedString, 'oops {{name');
    assert.deepEqual(variableMap, {});
  });

  await t.test('tags in the string survive tokenization untouched', () => {
    const input = 'Hello <strong>{{name}}</strong>';
    const { tokenizedString, variableMap } = tokenizeString(input);
    assert.equal(tokenizedString, 'Hello <strong><v id="0" /></strong>');
    assert.equal(detokenizeString(tokenizedString, variableMap), input);
  });

  await t.test('API-reordered tokens restore by id, not position', () => {
    const { tokenizedString, variableMap } = tokenizeString('{{first}} then {{second}}');
    const reordered = 'Luego <v id="1" /> y <v id="0" />';
    assert.equal(detokenizeString(reordered, variableMap), 'Luego {{second}} y {{first}}');
  });

  await t.test('expanded tag form <v id="X"></v> also detokenizes', () => {
    const { variableMap } = tokenizeString('Hello {{name}}');
    assert.equal(detokenizeString('Hola <v id="0"></v>', variableMap), 'Hola {{name}}');
  });
});
