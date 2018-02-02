import { dasherize } from '@ember/string';
import RSVP from 'rsvp';

if (window.location.search.includes('&capture=true')) {
  // Fix styling for screenshots
  document.body.classList.add('visual-test-capture-mode');
}

function parseResponse(responseText) {
  let data = responseText;
  try {
    data = JSON.parse(data);
  } catch(e) {
    // do nothing
  }
  return data;
}

export function ajaxPost(url, data, contentType = 'application/json') {
  let xhr = new XMLHttpRequest();

  return new RSVP.Promise((resolve, reject) => {
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.onload = function() {
      let data = parseResponse(xhr.responseText);
      if (xhr.status === 200) {
        return resolve(data);
      }
      reject(data);
    };
    xhr.send(JSON.stringify(data));
  });
}

export async function capture(assert, fileName, { selector = null, fullPage = true } = {}) {
  // If is in capture mode, set the capture up & stop the tests
  if (window.location.search.includes('&capture=true')) {
    let event = new CustomEvent('pageLoaded');
    window.dispatchEvent(event);

    // Put this into the dom to make headless chrome aware that rendering is complete
    if (!document.querySelector('#visual-test-has-loaded')) {
      let div = document.createElement('div');
      div.setAttribute('id', 'visual-test-has-loaded');
      document.body.appendChild(div);
    }

    // Wait forever
    return assert.async();
  }

  // If not in capture mode, make a request to the middleware to capture a screenshot in node
  fileName = dasherize(fileName);
  let testId = assert.test.testId;

  let data = {
    url: `${window.location.protocol}//${window.location.host}${window.location.pathname}?testId=${testId}&capture=true`,
    name: fileName,
    selector,
    fullPage
  };

  let response = await ajaxPost('/visual-test/make-screenshot', data, 'application/json');

  if (response.status === 'SUCCESS') {
    assert.ok(true, `visual-test: ${fileName} has not changed`);
  } else {
    assert.ok(false, `visual-test: ${fileName} has changed: ${response.error}`);
  }

  return response;
}
