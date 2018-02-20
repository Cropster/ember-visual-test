import { dasherize } from '@ember/string';
import RSVP from 'rsvp';

export async function capture(assert, fileName, { selector = null, fullPage = true, delayMs = 100 } = {}) {
  let testId = assert.test.testId;

  let queryParamString = window.location.search.substr(1);
  let queryParams = queryParamString.split('&');

  // If is in capture mode, set the capture up & stop the tests
  if (queryParams.includes('capture=true')) {

    // If it is not the current test, skip...
    // Otherwise, it would be impossible to have multiple captures in one test
    if (!queryParams.includes(`fileName=${fileName}`)) {
      return;
    }

    prepareCaptureMode();

    // Wait forever
    assert.async();
    return new RSVP.Promise(() => {
      // Never resolve this...
    });
  }

  // If not in capture mode, make a request to the middleware to capture a screenshot in node
  let urlQueryParams = [
    `testId=${testId}`,
    `fileName=${fileName}`,
    'capture=true'
  ];

  let url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?${urlQueryParams.join('&')}`;
  let response = await requestCapture(url, fileName, { selector, fullPage, delayMs });

  if (response.status === 'SUCCESS') {
    assert.ok(true, `visual-test: ${fileName} has not changed`);
  } else {
    assert.ok(false, `visual-test: ${fileName} has changed: ${response.error}`);
  }

  return response;
}

export function prepareCaptureMode() {
  // Add class for capture
  document.body.classList.add('visual-test-capture-mode');

  let event = new CustomEvent('pageLoaded');
  window.dispatchEvent(event);

  // Put this into the dom to make headless chrome aware that rendering is complete
  if (!document.querySelector('#visual-test-has-loaded')) {
    let div = document.createElement('div');
    div.setAttribute('id', 'visual-test-has-loaded');
    document.body.appendChild(div);
  }
}

export async function requestCapture(url, fileName, { selector, fullPage, delayMs }) {
  // If not in capture mode, make a request to the middleware to capture a screenshot in node
  fileName = dasherize(fileName);

  let data = {
    url,
    name: fileName,
    selector,
    fullPage,
    delayMs
  };

  return await ajaxPost('/visual-test/make-screenshot', data, 'application/json');
}

export function ajaxPost(url, data, contentType = 'application/json') {
  let xhr = new XMLHttpRequest();

  return new RSVP.Promise((resolve, reject) => {
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.onload = function() {
      let data = parseAjaxResponse(xhr.responseText);
      if (xhr.status === 200) {
        return resolve(data);
      }
      reject(data);
    };
    xhr.send(JSON.stringify(data));
  });
}

function parseAjaxResponse(responseText) {
  let data = responseText;
  try {
    data = JSON.parse(data);
  } catch(e) {
    // do nothing
  }
  return data;
}
