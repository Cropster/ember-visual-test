/* global html2canvas */
import { typeOf as getTypeOf } from '@ember/utils';
import $ from 'jquery';
import { dasherize } from '@ember/string';

export async function capture(assert, element, fileName) {
  if (getTypeOf(element) === 'string') {
    element = document.querySelector(element);
  }

  // Temp. force correct width/height
  let rootElement = document.querySelector('#ember-testing');
  let rootStyle = rootElement.getAttribute('style') || '';
  rootElement.setAttribute('style', `width: 1440px; height: 990px; ${rootStyle}`);

  let canvas = await html2canvas(element, {
    logging: false,
    width: 1440,
    height: 990,
    scale: 2
  });
  let image = canvas.toDataURL();

  rootElement.setAttribute('style', rootStyle);

  fileName = dasherize(fileName);

  let data = {
    image,
    name: fileName
  };

  let response = await $.post('/visual-test/image', data, 'application/json');
  if (assert) {
    assert.ok(response.status === 'SUCCESS', response.error);
  }

  return response;
}
