// Minimal host DOM for React DOM's real client reconciler. Measurements are fixtures, not native layout.
// Tests invoke callbacks/keyboard dispatch and track focus/state across committed renders and unmounts.
class HostNode {
  constructor(type, document, text = '') {
    this.nodeType = type === '#text' ? 3 : 1;
    this.nodeName = this.tagName = type.toUpperCase();
    this.ownerDocument = document;
    this.namespaceURI = 'http://www.w3.org/1999/xhtml';
    this.childNodes = [];
    this.parentNode = null;
    this.nodeValue = text;
    this.style = {};
    this.attributes = {};
  }
  appendChild(node) { return this.insertBefore(node, null); }
  insertBefore(node, before) {
    node.parentNode?.removeChild(node);
    const index = before ? this.childNodes.indexOf(before) : this.childNodes.length;
    this.childNodes.splice(index, 0, node); node.parentNode = this; return node;
  }
  removeChild(node) { this.childNodes.splice(this.childNodes.indexOf(node), 1); node.parentNode = null; return node; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener() {}
  removeEventListener() {}
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild() { return this.childNodes.at(-1) ?? null; }
  get textContent() { return this.nodeType === 3 ? this.nodeValue : this.childNodes.map((node) => node.textContent).join(''); }
  set textContent(value) {
    this.childNodes.forEach((node) => { node.parentNode = null; }); this.childNodes = [];
    if (value) this.appendChild(new HostNode('#text', this.ownerDocument, String(value)));
  }
  measureInWindow(callback) {
    if (this.props?.label === '⋯' && this.kind === 'FormButton') callback(340, 16, 44, 44);
    else callback(0, 0, 400, 800);
  }
  scrollTo() {}
  focus() { this.ownerDocument.activeElement = this; }
  blur() {}
  querySelectorAll() {
    const descendants = this.childNodes.flatMap((node) => [node, ...node.querySelectorAll()]);
    return descendants.filter((node) => ['FormButton', 'FormField'].includes(node.kind) && !node.props?.disabled);
  }
}

const listeners = new Map();
const document = {
  nodeType: 9, activeElement: null,
  createElement: (type) => new HostNode(type, document),
  createElementNS: (_namespace, type) => new HostNode(type, document),
  createTextNode: (text) => new HostNode('#text', document, text),
  addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
  removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
  dispatchEvent(event) { for (const callback of listeners.get(event.type) ?? []) callback(event); },
};
const window = { document, HTMLElement: HostNode, HTMLIFrameElement: class {} };
document.defaultView = window;
document.documentElement = document.createElement('html');
document.body = document.createElement('body');
global.document = document;
global.window = window;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = clearTimeout;

module.exports = { document };
