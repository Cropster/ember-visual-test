export default function fixWindowsPath(str) {
  // replace slashes
  str = str.replace(/\\/gm, '/');

  let offset = str.lastIndexOf('/ember-visual-test/');

  return offset > -1 ? str.substr(offset + 1) : str;
}
