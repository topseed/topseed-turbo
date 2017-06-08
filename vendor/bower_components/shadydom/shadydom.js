(function () {
'use strict';

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

let settings = window['ShadyDOM'] || {};

settings.hasNativeShadowDOM = Boolean(Element.prototype.attachShadow && Node.prototype.getRootNode);

let desc = Object.getOwnPropertyDescriptor(Node.prototype, 'firstChild');

settings.hasDescriptors = Boolean(desc && desc.configurable && desc.get);
settings.inUse = settings['force'] || !settings.hasNativeShadowDOM;

function isShadyRoot(obj) {
  return Boolean(obj.__localName === 'ShadyRoot');
}

function ownerShadyRootForNode(node) {
  let root = node.getRootNode();
  if (isShadyRoot(root)) {
    return root;
  }
}

let p = Element.prototype;
let matches = p.matches || p.matchesSelector ||
  p.mozMatchesSelector || p.msMatchesSelector ||
  p.oMatchesSelector || p.webkitMatchesSelector;

function matchesSelector(element, selector) {
  return matches.call(element, selector);
}

function copyOwnProperty(name, source, target) {
  let pd = Object.getOwnPropertyDescriptor(source, name);
  if (pd) {
    Object.defineProperty(target, name, pd);
  }
}

function extend(target, source) {
  if (target && source) {
    let n$ = Object.getOwnPropertyNames(source);
    for (let i=0, n; (i<n$.length) && (n=n$[i]); i++) {
      copyOwnProperty(n, source, target);
    }
  }
  return target || source;
}

function extendAll(target, ...sources) {
  for (let i=0; i < sources.length; i++) {
    extend(target, sources[i]);
  }
  return target;
}

function mixin(target, source) {
  for (var i in source) {
    target[i] = source[i];
  }
  return target;
}

function patchPrototype(obj, mixin) {
  let proto = Object.getPrototypeOf(obj);
  if (!proto.hasOwnProperty('__patchProto')) {
    let patchProto = Object.create(proto);
    patchProto.__sourceProto = proto;
    extend(patchProto, mixin);
    proto['__patchProto'] = patchProto;
  }
  // old browsers don't have setPrototypeOf
  obj.__proto__ = proto['__patchProto'];
}


let twiddle = document.createTextNode('');
let content = 0;
let queue = [];
new MutationObserver(() => {
  while (queue.length) {
    // catch errors in user code...
    try {
      queue.shift()();
    } catch(e) {
      // enqueue another record and throw
      twiddle.textContent = content++;
      throw(e);
    }
  }
}).observe(twiddle, {characterData: true});

// use MutationObserver to get microtask async timing.
function microtask(callback) {
  queue.push(callback);
  twiddle.textContent = content++;
}

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

// render enqueuer/flusher
let flushList = [];
let scheduled;
function enqueue(callback) {
  if (!scheduled) {
    scheduled = true;
    microtask(flush);
  }
  flushList.push(callback);
}

function flush() {
  scheduled = false;
  let didFlush = Boolean(flushList.length);
  while (flushList.length) {
    flushList.shift()();
  }
  return didFlush;
}

flush['list'] = flushList;

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

class AsyncObserver {

  constructor() {
    this._scheduled = false;
    this.addedNodes = [];
    this.removedNodes = [];
    this.callbacks = new Set();
  }

  schedule() {
    if (!this._scheduled) {
      this._scheduled = true;
      microtask(() => {
        this.flush();
      });
    }
  }

  flush() {
    if (this._scheduled) {
      this._scheduled = false;
      let mutations = this.takeRecords();
      if (mutations.length) {
        this.callbacks.forEach(function(cb) {
          cb(mutations);
        });
      }
    }
  }

  takeRecords() {
    if (this.addedNodes.length || this.removedNodes.length) {
      let mutations = [{
        addedNodes: this.addedNodes,
        removedNodes: this.removedNodes
      }];
      this.addedNodes = [];
      this.removedNodes = [];
      return mutations;
    }
    return [];
  }

}

// TODO(sorvell): consider instead polyfilling MutationObserver
// directly so that users do not have to fork their code.
// Supporting the entire api may be challenging: e.g. filtering out
// removed nodes in the wrong scope and seeing non-distributing
// subtree child mutations.
let observeChildren = function(node, callback) {
  node.__shady = node.__shady || {};
  if (!node.__shady.observer) {
    node.__shady.observer = new AsyncObserver();
  }
  node.__shady.observer.callbacks.add(callback);
  let observer = node.__shady.observer;
  return {
    _callback: callback,
    _observer: observer,
    _node: node,
    takeRecords() {
      return observer.takeRecords()
    }
  };
};

let unobserveChildren = function(handle) {
  let observer = handle && handle._observer;
  if (observer) {
    observer.callbacks.delete(handle._callback);
    if (!observer.callbacks.size) {
      handle._node.__shady.observer = null;
    }
  }
};

function filterMutations(mutations, target) {
  /** @const {Node} */
  const targetRootNode = target.getRootNode();
  return mutations.map(function(mutation) {
    /** @const {boolean} */
    const mutationInScope = (targetRootNode === mutation.target.getRootNode());
    if (mutationInScope && mutation.addedNodes) {
      let nodes = Array.from(mutation.addedNodes).filter(function(n) {
        return (targetRootNode === n.getRootNode());
      });
      if (nodes.length) {
        mutation = Object.create(mutation);
        Object.defineProperty(mutation, 'addedNodes', {
          value: nodes,
          configurable: true
        });
        return mutation;
      }
    } else if (mutationInScope) {
      return mutation;
    }
  }).filter(function(m) { return m});
}

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

let appendChild = Element.prototype.appendChild;
let insertBefore = Element.prototype.insertBefore;
let removeChild = Element.prototype.removeChild;
let setAttribute = Element.prototype.setAttribute;
let removeAttribute = Element.prototype.removeAttribute;
let cloneNode = Element.prototype.cloneNode;
let importNode = Document.prototype.importNode;
let addEventListener = Element.prototype.addEventListener;
let removeEventListener = Element.prototype.removeEventListener;
let windowAddEventListener = Window.prototype.addEventListener;
let windowRemoveEventListener = Window.prototype.removeEventListener;
let dispatchEvent = Element.prototype.dispatchEvent;


var nativeMethods = Object.freeze({
	appendChild: appendChild,
	insertBefore: insertBefore,
	removeChild: removeChild,
	setAttribute: setAttribute,
	removeAttribute: removeAttribute,
	cloneNode: cloneNode,
	importNode: importNode,
	addEventListener: addEventListener,
	removeEventListener: removeEventListener,
	windowAddEventListener: windowAddEventListener,
	windowRemoveEventListener: windowRemoveEventListener,
	dispatchEvent: dispatchEvent
});

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

// Cribbed from ShadowDOM polyfill
// https://github.com/webcomponents/webcomponentsjs/blob/master/src/ShadowDOM/wrappers/HTMLElement.js#L28
/////////////////////////////////////////////////////////////////////////////
// innerHTML and outerHTML

// http://www.whatwg.org/specs/web-apps/current-work/multipage/the-end.html#escapingString
let escapeAttrRegExp = /[&\u00A0"]/g;
let escapeDataRegExp = /[&\u00A0<>]/g;

function escapeReplace(c) {
  switch (c) {
    case '&':
      return '&amp;';
    case '<':
      return '&lt;';
    case '>':
      return '&gt;';
    case '"':
      return '&quot;';
    case '\u00A0':
      return '&nbsp;';
  }
}

function escapeAttr(s) {
  return s.replace(escapeAttrRegExp, escapeReplace);
}

function escapeData(s) {
  return s.replace(escapeDataRegExp, escapeReplace);
}

function makeSet(arr) {
  let set = {};
  for (let i = 0; i < arr.length; i++) {
    set[arr[i]] = true;
  }
  return set;
}

// http://www.whatwg.org/specs/web-apps/current-work/#void-elements
let voidElements = makeSet([
  'area',
  'base',
  'br',
  'col',
  'command',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

let plaintextParents = makeSet([
  'style',
  'script',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
  'plaintext',
  'noscript'
]);

/**
 * @param {Node} node
 * @param {Node} parentNode
 * @param {Function=} callback
 */
function getOuterHTML(node, parentNode, callback) {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: {
      let tagName = node.localName;
      let s = '<' + tagName;
      let attrs = node.attributes;
      for (let i = 0, attr; (attr = attrs[i]); i++) {
        s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
      }
      s += '>';
      if (voidElements[tagName]) {
        return s;
      }
      return s + getInnerHTML(node, callback) + '</' + tagName + '>';
    }
    case Node.TEXT_NODE: {
      let data = /** @type {Text} */ (node).data;
      if (parentNode && plaintextParents[parentNode.localName]) {
        return data;
      }
      return escapeData(data);
    }
    case Node.COMMENT_NODE: {
      return '<!--' + /** @type {Comment} */ (node).data + '-->';
    }
    default: {
      window.console.error(node);
      throw new Error('not implemented');
    }
  }
}

/**
 * @param {Node} node
 * @param {Function=} callback
 */
function getInnerHTML(node, callback) {
  if (node.localName === 'template') {
    node =  /** @type {HTMLTemplateElement} */ (node).content;
  }
  let s = '';
  let c$ = callback ? callback(node) : node.childNodes;
  for (let i=0, l=c$.length, child; (i<l) && (child=c$[i]); i++) {
    s += getOuterHTML(child, node, callback);
  }
  return s;
}

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

let nodeWalker = document.createTreeWalker(document, NodeFilter.SHOW_ALL,
  null, false);

let elementWalker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT,
  null, false);

function parentNode(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.parentNode();
}

function firstChild(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.firstChild();
}

function lastChild(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.lastChild();
}

function previousSibling(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.previousSibling();
}

function nextSibling(node) {
  nodeWalker.currentNode = node;
  return nodeWalker.nextSibling();
}

function childNodes(node) {
  let nodes = [];
  nodeWalker.currentNode = node;
  let n = nodeWalker.firstChild();
  while (n) {
    nodes.push(n);
    n = nodeWalker.nextSibling();
  }
  return nodes;
}

function parentElement(node) {
  elementWalker.currentNode = node;
  return elementWalker.parentNode();
}

function firstElementChild(node) {
  elementWalker.currentNode = node;
  return elementWalker.firstChild();
}

function lastElementChild(node) {
  elementWalker.currentNode = node;
  return elementWalker.lastChild();
}

function previousElementSibling(node) {
  elementWalker.currentNode = node;
  return elementWalker.previousSibling();
}

function nextElementSibling(node) {
  elementWalker.currentNode = node;
  return elementWalker.nextSibling();
}

function children(node) {
  let nodes = [];
  elementWalker.currentNode = node;
  let n = elementWalker.firstChild();
  while (n) {
    nodes.push(n);
    n = elementWalker.nextSibling();
  }
  return nodes;
}

function innerHTML(node) {
  return getInnerHTML(node, (n) => childNodes(n));
}

function textContent(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node.nodeValue;
  }
  let textWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT,
    null, false);
  let content = '', n;
  while ( (n = textWalker.nextNode()) ) {
    // TODO(sorvell): can't use textContent since we patch it on Node.prototype!
    // However, should probably patch it only on element.
    content += n.nodeValue;
  }
  return content;
}


var nativeTree = Object.freeze({
	parentNode: parentNode,
	firstChild: firstChild,
	lastChild: lastChild,
	previousSibling: previousSibling,
	nextSibling: nextSibling,
	childNodes: childNodes,
	parentElement: parentElement,
	firstElementChild: firstElementChild,
	lastElementChild: lastElementChild,
	previousElementSibling: previousElementSibling,
	nextElementSibling: nextElementSibling,
	children: children,
	innerHTML: innerHTML,
	textContent: textContent
});

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

const nativeInnerHTMLDesc = /** @type {ObjectPropertyDescriptor} */(
  Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML') ||
  Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML'));

const inertDoc = document.implementation.createHTMLDocument('inert');
const htmlContainer = inertDoc.createElement('div');

const nativeActiveElementDescriptor =
  /** @type {ObjectPropertyDescriptor} */(
    Object.getOwnPropertyDescriptor(Document.prototype, 'activeElement')
  );
function getDocumentActiveElement() {
  if (nativeActiveElementDescriptor && nativeActiveElementDescriptor.get) {
    return nativeActiveElementDescriptor.get.call(document);
  } else if (!settings.hasDescriptors) {
    return document.activeElement;
  }
}

function activeElementForNode(node) {
  let active = getDocumentActiveElement();
  // In IE11, activeElement might be an empty object if the document is
  // contained in an iframe.
  // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/10998788/
  if (!active || !active.nodeType) {
    return null;
  }
  let isShadyRoot$$1 = !!(isShadyRoot(node));
  if (node !== document) {
    // If this node isn't a document or shady root, then it doesn't have
    // an active element.
    if (!isShadyRoot$$1) {
      return null;
    }
    // If this shady root's host is the active element or the active
    // element is not a descendant of the host (in the composed tree),
    // then it doesn't have an active element.
    if (node.host === active ||
        !node.host.contains(active)) {
      return null;
    }
  }
  // This node is either the document or a shady root of which the active
  // element is a (composed) descendant of its host; iterate upwards to
  // find the active element's most shallow host within it.
  let activeRoot = ownerShadyRootForNode(active);
  while (activeRoot && activeRoot !== node) {
    active = activeRoot.host;
    activeRoot = ownerShadyRootForNode(active);
  }
  if (node === document) {
    // This node is the document, so activeRoot should be null.
    return activeRoot ? null : active;
  } else {
    // This node is a non-document shady root, and it should be
    // activeRoot.
    return activeRoot === node ? active : null;
  }
}

let OutsideAccessors = {

  parentElement: {
    /** @this {Node} */
    get() {
      let l = this.__shady && this.__shady.parentNode;
      if (l && l.nodeType !== Node.ELEMENT_NODE) {
        l = null;
      }
      return l !== undefined ? l : parentElement(this);
    },
    configurable: true
  },

  parentNode: {
    /** @this {Node} */
    get() {
      let l = this.__shady && this.__shady.parentNode;
      return l !== undefined ? l : parentNode(this);
    },
    configurable: true
  },

  nextSibling: {
    /** @this {Node} */
    get() {
      let l = this.__shady && this.__shady.nextSibling;
      return l !== undefined ? l : nextSibling(this);
    },
    configurable: true
  },

  previousSibling: {
    /** @this {Node} */
    get() {
      let l = this.__shady && this.__shady.previousSibling;
      return l !== undefined ? l : previousSibling(this);
    },
    configurable: true
  },

  className: {
    /**
     * @this {HTMLElement}
     */
    get() {
      return this.getAttribute('class') || '';
    },
    /**
     * @this {HTMLElement}
     */
    set(value) {
      this.setAttribute('class', value);
    },
    configurable: true
  },

  // fragment, element, document
  nextElementSibling: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (this.__shady && this.__shady.nextSibling !== undefined) {
        let n = this.nextSibling;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.nextSibling;
        }
        return n;
      } else {
        return nextElementSibling(this);
      }
    },
    configurable: true
  },

  previousElementSibling: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (this.__shady && this.__shady.previousSibling !== undefined) {
        let n = this.previousSibling;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.previousSibling;
        }
        return n;
      } else {
        return previousElementSibling(this);
      }
    },
    configurable: true
  }

};

let InsideAccessors = {

  childNodes: {
    /**
     * @this {HTMLElement}
     */
    get() {
      let childNodes$$1;
      if (this.__shady && this.__shady.firstChild !== undefined) {
        if (!this.__shady.childNodes) {
          this.__shady.childNodes = [];
          for (let n=this.firstChild; n; n=n.nextSibling) {
            this.__shady.childNodes.push(n);
          }
        }
        childNodes$$1 = this.__shady.childNodes;
      } else {
        childNodes$$1 = childNodes(this);
      }
      childNodes$$1.item = function(index) {
        return childNodes$$1[index];
      };
      return childNodes$$1;
    },
    configurable: true
  },

  childElementCount: {
    /** @this {HTMLElement} */
    get() {
      return this.children.length;
    },
    configurable: true
  },

  firstChild: {
    /** @this {HTMLElement} */
    get() {
      let l = this.__shady && this.__shady.firstChild;
      return l !== undefined ? l : firstChild(this);
    },
    configurable: true
  },

  lastChild: {
  /** @this {HTMLElement} */
    get() {
      let l = this.__shady && this.__shady.lastChild;
      return l !== undefined ? l : lastChild(this);
    },
    configurable: true
  },

  textContent: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (this.__shady && this.__shady.firstChild !== undefined) {
        let tc = [];
        for (let i = 0, cn = this.childNodes, c; (c = cn[i]); i++) {
          if (c.nodeType !== Node.COMMENT_NODE) {
            tc.push(c.textContent);
          }
        }
        return tc.join('');
      } else {
        return textContent(this);
      }
    },
    /**
     * @this {HTMLElement}
     */
    set(text) {
      if (this.nodeType !== Node.ELEMENT_NODE) {
        // TODO(sorvell): can't do this if patch nodeValue.
        this.nodeValue = text;
      } else {
        clearNode(this);
        this.appendChild(document.createTextNode(text));
      }
    },
    configurable: true
  },

  // fragment, element, document
  firstElementChild: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (this.__shady && this.__shady.firstChild !== undefined) {
        let n = this.firstChild;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.nextSibling;
        }
        return n;
      } else {
        return firstElementChild(this);
      }
    },
    configurable: true
  },

  lastElementChild: {
    /**
     * @this {HTMLElement}
     */
    get() {
      if (this.__shady && this.__shady.lastChild !== undefined) {
        let n = this.lastChild;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.previousSibling;
        }
        return n;
      } else {
        return lastElementChild(this);
      }
    },
    configurable: true
  },

  children: {
    /**
     * @this {HTMLElement}
     */
    get() {
      let children$$1;
      if (this.__shady && this.__shady.firstChild !== undefined) {
        children$$1 = Array.prototype.filter.call(this.childNodes, function(n) {
          return (n.nodeType === Node.ELEMENT_NODE);
        });
      } else {
        children$$1 = children(this);
      }
      children$$1.item = function(index) {
        return children$$1[index];
      };
      return children$$1;
    },
    configurable: true
  },

  // element (HTMLElement on IE11)
  innerHTML: {
    /**
     * @this {HTMLElement}
     */
    get() {
      let content = this.localName === 'template' ?
        /** @type {HTMLTemplateElement} */(this).content : this;
      if (this.__shady && this.__shady.firstChild !== undefined) {
        return getInnerHTML(content);
      } else {
        return innerHTML(content);
      }
    },
    /**
     * @this {HTMLElement}
     */
    set(text) {
      let content = this.localName === 'template' ?
        /** @type {HTMLTemplateElement} */(this).content : this;
      clearNode(content);
      if (nativeInnerHTMLDesc && nativeInnerHTMLDesc.set) {
        nativeInnerHTMLDesc.set.call(htmlContainer, text);
      } else {
        htmlContainer.innerHTML = text;
      }
      while (htmlContainer.firstChild) {
        content.appendChild(htmlContainer.firstChild);
      }
    },
    configurable: true
  }

};

// Note: Can be patched on element prototype on all browsers.
// Must be patched on instance on browsers that support native Shadow DOM
// but do not have builtin accessors (old Chrome).
let ShadowRootAccessor = {

  shadowRoot: {
    /**
     * @this {HTMLElement}
     */
    get() {
      return this.__shady && this.__shady.root || null;
    },
    /**
     * @this {HTMLElement}
     */
    set(value) {
      this.__shady = this.__shady || {};
      this.__shady.root = value;
    },
    configurable: true
  }
};

// Note: Can be patched on document prototype on browsers with builtin accessors.
// Must be patched separately on simulated ShadowRoot.
// Must be patched as `_activeElement` on browsers without builtin accessors.
let ActiveElementAccessor = {

  activeElement: {
    /**
     * @this {HTMLElement}
     */
    get() {
      return activeElementForNode(this);
    },
    /**
     * @this {HTMLElement}
     */
    set() {},
    configurable: true
  }

};

// patch a group of descriptors on an object only if it exists or if the `force`
// argument is true.
/**
 * @param {!Object} obj
 * @param {!Object} descriptors
 * @param {boolean=} force
 */
function patchAccessorGroup(obj, descriptors, force) {
  for (let p in descriptors) {
    let objDesc = Object.getOwnPropertyDescriptor(obj, p);
    if ((objDesc && objDesc.configurable) ||
      (!objDesc && force)) {
      Object.defineProperty(obj, p, descriptors[p]);
    } else if (force) {
      console.warn('Could not define', p, 'on', obj);
    }
  }
}

// patch dom accessors on proto where they exist
function patchAccessors(proto) {
  patchAccessorGroup(proto, OutsideAccessors);
  patchAccessorGroup(proto, InsideAccessors);
  patchAccessorGroup(proto, ActiveElementAccessor);
}

// ensure element descriptors (IE/Edge don't have em)
function patchShadowRootAccessors(proto) {
  patchAccessorGroup(proto, InsideAccessors, true);
  patchAccessorGroup(proto, ActiveElementAccessor, true);
}

// ensure an element has patched "outside" accessors; no-op when not needed
let patchOutsideElementAccessors = settings.hasDescriptors ?
  function() {} : function(element) {
    if (!(element.__shady && element.__shady.__outsideAccessors)) {
      element.__shady = element.__shady || {};
      element.__shady.__outsideAccessors = true;
      patchAccessorGroup(element, OutsideAccessors, true);
    }
  };

// ensure an element has patched "inside" accessors; no-op when not needed
let patchInsideElementAccessors = settings.hasDescriptors ?
  function() {} : function(element) {
    if (!(element.__shady && element.__shady.__insideAccessors)) {
      element.__shady = element.__shady || {};
      element.__shady.__insideAccessors = true;
      patchAccessorGroup(element, InsideAccessors, true);
      patchAccessorGroup(element, ShadowRootAccessor, true);
    }
  };

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

function recordInsertBefore(node, container, ref_node) {
  patchInsideElementAccessors(container);
  container.__shady = container.__shady || {};
  if (container.__shady.firstChild !== undefined) {
    container.__shady.childNodes = null;
  }
  // handle document fragments
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    let c$ = node.childNodes;
    for (let i=0; i < c$.length; i++) {
      linkNode(c$[i], container, ref_node);
    }
    // cleanup logical dom in doc fragment.
    node.__shady = node.__shady || {};
    let resetTo = (node.__shady.firstChild !== undefined) ? null : undefined;
    node.__shady.firstChild = node.__shady.lastChild = resetTo;
    node.__shady.childNodes = resetTo;
  } else {
    linkNode(node, container, ref_node);
  }
}

function linkNode(node, container, ref_node) {
  patchOutsideElementAccessors(node);
  ref_node = ref_node || null;
  node.__shady = node.__shady || {};
  container.__shady = container.__shady || {};
  if (ref_node) {
    ref_node.__shady = ref_node.__shady || {};
  }
  // update ref_node.previousSibling <-> node
  node.__shady.previousSibling = ref_node ? ref_node.__shady.previousSibling :
    container.lastChild;
  let ps = node.__shady.previousSibling;
  if (ps && ps.__shady) {
    ps.__shady.nextSibling = node;
  }
  // update node <-> ref_node
  let ns = node.__shady.nextSibling = ref_node;
  if (ns && ns.__shady) {
    ns.__shady.previousSibling = node;
  }
  // update node <-> container
  node.__shady.parentNode = container;
  if (ref_node) {
    if (ref_node === container.__shady.firstChild) {
      container.__shady.firstChild = node;
    }
  } else {
    container.__shady.lastChild = node;
    if (!container.__shady.firstChild) {
      container.__shady.firstChild = node;
    }
  }
  // remove caching of childNodes
  container.__shady.childNodes = null;
}

function recordRemoveChild(node, container) {
  node.__shady = node.__shady || {};
  container.__shady = container.__shady || {};
  if (node === container.__shady.firstChild) {
    container.__shady.firstChild = node.__shady.nextSibling;
  }
  if (node === container.__shady.lastChild) {
    container.__shady.lastChild = node.__shady.previousSibling;
  }
  let p = node.__shady.previousSibling;
  let n = node.__shady.nextSibling;
  if (p) {
    p.__shady = p.__shady || {};
    p.__shady.nextSibling = n;
  }
  if (n) {
    n.__shady = n.__shady || {};
    n.__shady.previousSibling = p;
  }
  // When an element is removed, logical data is no longer tracked.
  // Explicitly set `undefined` here to indicate this. This is disginguished
  // from `null` which is set if info is null.
  node.__shady.parentNode = node.__shady.previousSibling =
    node.__shady.nextSibling = undefined;
  if (container.__shady.childNodes !== undefined) {
    // remove caching of childNodes
    container.__shady.childNodes = null;
  }
}

let recordChildNodes = function(node) {
  if (!node.__shady || node.__shady.firstChild === undefined) {
    node.__shady = node.__shady || {};
    node.__shady.firstChild = firstChild(node);
    node.__shady.lastChild = lastChild(node);
    patchInsideElementAccessors(node);
    let c$ = node.__shady.childNodes = childNodes(node);
    for (let i=0, n; (i<c$.length) && (n=c$[i]); i++) {
      n.__shady = n.__shady || {};
      n.__shady.parentNode = node;
      n.__shady.nextSibling = c$[i+1] || null;
      n.__shady.previousSibling = c$[i-1] || null;
      patchOutsideElementAccessors(n);
    }
  }
};

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/**
 * Try to add node. Record logical info, track insertion points, perform
 * distribution iff needed. Return true if the add is handled.
 * @param {Node} container
 * @param {Node} node
 * @param {Node} ref_node
 * @return {boolean}
 */
function addNode(container, node, ref_node) {
  let ownerRoot = ownerShadyRootForNode(container);
  let ipAdded;
  if (ownerRoot) {
    // optimization: special insertion point tracking
    // TODO(sorvell): verify that the renderPending check here should not be needed.
    if (node['__noInsertionPoint'] && !ownerRoot._changePending) {
      ownerRoot._skipUpdateInsertionPoints = true;
    }
    // note: we always need to see if an insertion point is added
    // since this saves logical tree info; however, invalidation state
    // needs
    ipAdded = _maybeAddInsertionPoint(node, container, ownerRoot);
    // invalidate insertion points IFF not already invalid!
    if (ipAdded) {
      ownerRoot._skipUpdateInsertionPoints = false;
    }
  }
  if (container.__shady && container.__shady.firstChild !== undefined) {
    recordInsertBefore(node, container, ref_node);
  }
  // if not distributing and not adding to host, do a fast path addition
  // TODO(sorvell): revisit flow since `ipAdded` needed here if
  // node is a fragment that has a patched QSA.
  let handled = _maybeDistribute(node, container, ownerRoot, ipAdded) ||
    container.__shady.root ||
    // TODO(sorvell): we *should* consider the add "handled"
    // if the container or ownerRoot is `_renderPending`.
    // However, this will regress performance right now and is blocked on a
    // fix for https://github.com/webcomponents/shadydom/issues/95
    // handled if ref_node parent is a root that is rendering.
    (ref_node && isShadyRoot(ref_node.parentNode) &&
      ref_node.parentNode._renderPending);
  return handled;
}


/**
 * Try to remove node: update logical info and perform distribution iff
 * needed. Return true if the removal has been handled.
 * note that it's possible for both the node's host and its parent
 * to require distribution... both cases are handled here.
 * @param {Node} node
 * @return {boolean}
 */
function removeNode(node) {
  // important that we want to do this only if the node has a logical parent
  let logicalParent = node.__shady && node.__shady.parentNode;
  let distributed;
  let ownerRoot = ownerShadyRootForNode(node);
  if (logicalParent || ownerRoot) {
    // distribute node's parent iff needed
    distributed = maybeDistributeParent(node);
    if (logicalParent) {
      recordRemoveChild(node, logicalParent);
    }
    // remove node from root and distribute it iff needed
    let removedDistributed = ownerRoot &&
      _removeDistributedChildren(ownerRoot, node);
    let addedInsertionPoint = (logicalParent && ownerRoot &&
      logicalParent.localName === ownerRoot.getInsertionPointTag());
    if (removedDistributed || addedInsertionPoint) {
      ownerRoot._skipUpdateInsertionPoints = false;
      updateRootViaContentChange(ownerRoot);
    }
  }
  _removeOwnerShadyRoot(node);
  return distributed;
}

/**
 * @param {Node} node
 * @param {Node=} addedNode
 * @param {Node=} removedNode
 */
function _scheduleObserver(node, addedNode, removedNode) {
  let observer = node.__shady && node.__shady.observer;
  if (observer) {
    if (addedNode) {
      observer.addedNodes.push(addedNode);
    }
    if (removedNode) {
      observer.removedNodes.push(removedNode);
    }
    observer.schedule();
  }
}

function removeNodeFromParent(node, logicalParent) {
  if (logicalParent) {
    _scheduleObserver(logicalParent, null, node);
    return removeNode(node);
  } else {
    // composed but not logical parent
    if (node.parentNode) {
      removeChild.call(node.parentNode, node);
    }
    _removeOwnerShadyRoot(node);
  }
}

function _hasCachedOwnerRoot(node) {
  return Boolean(node.__shady && node.__shady.ownerShadyRoot !== undefined);
}

/**
 * @param {Node} node
 * @param {Object=} options
 */
function getRootNode(node, options) { // eslint-disable-line no-unused-vars
  if (!node || !node.nodeType) {
    return;
  }
  node.__shady = node.__shady || {};
  let root = node.__shady.ownerShadyRoot;
  if (root === undefined) {
    if (isShadyRoot(node)) {
      root = node;
    } else {
      let parent = node.parentNode;
      root = parent ? getRootNode(parent) : node;
    }
    // memo-ize result for performance but only memo-ize
    // result if node is in the document. This avoids a problem where a root
    // can be cached while an element is inside a fragment.
    // If this happens and we cache the result, the value can become stale
    // because for perf we avoid processing the subtree of added fragments.
    if (document.documentElement.contains(node)) {
      node.__shady.ownerShadyRoot = root;
    }
  }
  return root;
}

function _maybeDistribute(node, container, ownerRoot, ipAdded) {
  // TODO(sorvell): technically we should check non-fragment nodes for
  // <content> children but since this case is assumed to be exceedingly
  // rare, we avoid the cost and will address with some specific api
  // when the need arises.  For now, the user must call
  // distributeContent(true), which updates insertion points manually
  // and forces distribution.
  let insertionPointTag = ownerRoot && ownerRoot.getInsertionPointTag() || '';
  let fragContent = (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) &&
    !node['__noInsertionPoint'] &&
    insertionPointTag && node.querySelector(insertionPointTag);
  let wrappedContent = fragContent &&
    (fragContent.parentNode.nodeType !==
    Node.DOCUMENT_FRAGMENT_NODE);
  let hasContent = fragContent || (node.localName === insertionPointTag);
  // There are 3 possible cases where a distribution may need to occur:
  // 1. <content> being inserted (the host of the shady root where
  //    content is inserted needs distribution)
  // 2. children being inserted into parent with a shady root (parent
  //    needs distribution)
  // 3. container is an insertionPoint
  if (hasContent || (container.localName === insertionPointTag) || ipAdded) {
    if (ownerRoot) {
      // note, insertion point list update is handled after node
      // mutations are complete
      updateRootViaContentChange(ownerRoot);
    }
  }
  let needsDist = _nodeNeedsDistribution(container);
  if (needsDist) {
    let root = container.__shady && container.__shady.root;
    updateRootViaContentChange(root);
  }
  // Return true when distribution will fully handle the composition
  // Note that if a content was being inserted that was wrapped by a node,
  // and the parent does not need distribution, return false to allow
  // the nodes to be added directly, after which children may be
  // distributed and composed into the wrapping node(s)
  return needsDist || (hasContent && !wrappedContent);
}

/* note: parent argument is required since node may have an out
of date parent at this point; returns true if a <content> is being added */
function _maybeAddInsertionPoint(node, parent, root) {
  let added;
  let insertionPointTag = root.getInsertionPointTag();
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
    !node['__noInsertionPoint']) {
    let c$ = node.querySelectorAll(insertionPointTag);
    for (let i=0, n, np, na; (i<c$.length) && (n=c$[i]); i++) {
      np = n.parentNode;
      // don't allow node's parent to be fragment itself
      if (np === node) {
        np = parent;
      }
      na = _maybeAddInsertionPoint(n, np, root);
      added = added || na;
    }
  } else if (node.localName === insertionPointTag) {
    recordChildNodes(parent);
    recordChildNodes(node);
    added = true;
  }
  return added;
}

function _nodeNeedsDistribution(node) {
  let root = node && node.__shady && node.__shady.root;
  return root && root.hasInsertionPoint();
}

function _removeDistributedChildren(root, container) {
  let hostNeedsDist;
  let ip$ = root._getInsertionPoints();
  for (let i=0; i<ip$.length; i++) {
    let insertionPoint = ip$[i];
    if (_contains(container, insertionPoint)) {
      let dc$ = insertionPoint.assignedNodes({flatten: true});
      for (let j=0; j<dc$.length; j++) {
        hostNeedsDist = true;
        let node = dc$[j];
        let parent = parentNode(node);
        if (parent) {
          removeChild.call(parent, node);
        }
      }
    }
  }
  return hostNeedsDist;
}

function _contains(container, node) {
  while (node) {
    if (node == container) {
      return true;
    }
    node = node.parentNode;
  }
}

function _removeOwnerShadyRoot(node) {
  // optimization: only reset the tree if node is actually in a root
  if (_hasCachedOwnerRoot(node)) {
    let c$ = node.childNodes;
    for (let i=0, l=c$.length, n; (i<l) && (n=c$[i]); i++) {
      _removeOwnerShadyRoot(n);
    }
  }
  node.__shady = node.__shady || {};
  node.__shady.ownerShadyRoot = undefined;
}

// TODO(sorvell): This will fail if distribution that affects this
// question is pending; this is expected to be exceedingly rare, but if
// the issue comes up, we can force a flush in this case.
function firstComposedNode(insertionPoint) {
  let n$ = insertionPoint.assignedNodes({flatten: true});
  let root = getRootNode(insertionPoint);
  for (let i=0, l=n$.length, n; (i<l) && (n=n$[i]); i++) {
    // means that we're composed to this spot.
    if (root.isFinalDestination(insertionPoint, n)) {
      return n;
    }
  }
}

function maybeDistributeParent(node) {
  let parent = node.parentNode;
  if (_nodeNeedsDistribution(parent)) {
    updateRootViaContentChange(parent.__shady.root);
    return true;
  }
}

function updateRootViaContentChange(root) {
  // mark root as mutation based on a mutation
  root._changePending = true;
  root.update();
}

function distributeAttributeChange(node, name) {
  if (name === 'slot') {
    maybeDistributeParent(node);
  } else if (node.localName === 'slot' && name === 'name') {
    let root = ownerShadyRootForNode(node);
    if (root) {
      root.update();
    }
  }
}

// NOTE: `query` is used primarily for ShadyDOM's querySelector impl,
// but it's also generally useful to recurse through the element tree
// and is used by Polymer's styling system.
/**
 * @param {Node} node
 * @param {Function} matcher
 * @param {Function=} halter
 */
function query(node, matcher, halter) {
  let list = [];
  _queryElements(node.childNodes, matcher,
    halter, list);
  return list;
}

function _queryElements(elements, matcher, halter, list) {
  for (let i=0, l=elements.length, c; (i<l) && (c=elements[i]); i++) {
    if (c.nodeType === Node.ELEMENT_NODE &&
        _queryElement(c, matcher, halter, list)) {
      return true;
    }
  }
}

function _queryElement(node, matcher, halter, list) {
  let result = matcher(node);
  if (result) {
    list.push(node);
  }
  if (halter && halter(result)) {
    return result;
  }
  _queryElements(node.childNodes, matcher,
    halter, list);
}

function renderRootNode(element) {
  var root = element.getRootNode();
  if (isShadyRoot(root)) {
    root.render();
  }
}

let scopingShim = null;

function setAttribute$1(node, attr, value) {
  if (!scopingShim) {
    scopingShim = window['ShadyCSS'] && window['ShadyCSS']['ScopingShim'];
  }
  if (scopingShim && attr === 'class') {
    scopingShim['setElementClass'](node, value);
  } else {
    setAttribute.call(node, attr, value);
    distributeAttributeChange(node, attr);
  }
}

function removeAttribute$1(node, attr) {
  removeAttribute.call(node, attr);
  distributeAttributeChange(node, attr);
}

// cases in which we may not be able to just do standard native call
// 1. container has a shadyRoot (needsDistribution IFF the shadyRoot
// has an insertion point)
// 2. container is a shadyRoot (don't distribute, instead set
// container to container.host.
// 3. node is <content> (host of container needs distribution)
/**
 * @param {Node} parent
 * @param {Node} node
 * @param {Node=} ref_node
 */
function insertBefore$1(parent, node, ref_node) {
  if (ref_node) {
    let p = ref_node.__shady && ref_node.__shady.parentNode;
    if ((p !== undefined && p !== parent) ||
      (p === undefined && parentNode(ref_node) !== parent)) {
      throw Error(`Failed to execute 'insertBefore' on 'Node': The node ` +
       `before which the new node is to be inserted is not a child of this node.`);
    }
  }
  if (ref_node === node) {
    return node;
  }
  // remove node from its current position iff it's in a tree.
  if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    let parent = node.__shady && node.__shady.parentNode;
    removeNodeFromParent(node, parent);
  }
  if (!addNode(parent, node, ref_node)) {
    if (ref_node) {
      // if ref_node is an insertion point replace with first distributed node
      let root = ownerShadyRootForNode(ref_node);
      if (root) {
        ref_node = ref_node.localName === root.getInsertionPointTag() ?
          firstComposedNode(/** @type {!HTMLSlotElement} */(ref_node)) : ref_node;
      }
    }
    // if adding to a shadyRoot, add to host instead
    let container = isShadyRoot(parent) ? /** @type {ShadowRoot} */(parent).host : parent;
    if (ref_node) {
      insertBefore.call(container, node, ref_node);
    } else {
      appendChild.call(container, node);
    }
  }
  _scheduleObserver(parent, node);
  return node;
}

/**
  Removes the given `node` from the element's `lightChildren`.
  This method also performs dom composition.
*/
function removeChild$1(parent, node) {
  if (node.parentNode !== parent) {
    throw Error('The node to be removed is not a child of this node: ' +
      node);
  }
  if (!removeNode(node)) {
    // if removing from a shadyRoot, remove form host instead
    let container = isShadyRoot(parent) ?
      parent.host :
      parent;
    // not guaranteed to physically be in container; e.g.
    // undistributed nodes.
    let nativeParent = parentNode(node);
    if (container === nativeParent) {
      removeChild.call(container, node);
    }
  }
  _scheduleObserver(parent, null, node);
  return node;
}

function cloneNode$1(node, deep) {
  if (node.localName == 'template') {
    return cloneNode.call(node, deep);
  } else {
    let n = cloneNode.call(node, false);
    if (deep) {
      let c$ = node.childNodes;
      for (let i=0, nc; i < c$.length; i++) {
        nc = c$[i].cloneNode(true);
        n.appendChild(nc);
      }
    }
    return n;
  }
}

// note: Though not technically correct, we fast path `importNode`
// when called on a node not owned by the main document.
// This allows, for example, elements that cannot
// contain custom elements and are therefore not likely to contain shadowRoots
// to cloned natively. This is a fairly significant performance win.
function importNode$1(node, deep) {
  if (node.ownerDocument !== document) {
    return importNode.call(document, node, deep);
  }
  let n = importNode.call(document, node, false);
  if (deep) {
    let c$ = node.childNodes;
    for (let i=0, nc; i < c$.length; i++) {
      nc = importNode$1(c$[i], true);
      n.appendChild(nc);
    }
  }
  return n;
}

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

// https://github.com/w3c/webcomponents/issues/513#issuecomment-224183937
let alwaysComposed = {
  'blur': true,
  'focus': true,
  'focusin': true,
  'focusout': true,
  'click': true,
  'dblclick': true,
  'mousedown': true,
  'mouseenter': true,
  'mouseleave': true,
  'mousemove': true,
  'mouseout': true,
  'mouseover': true,
  'mouseup': true,
  'wheel': true,
  'beforeinput': true,
  'input': true,
  'keydown': true,
  'keyup': true,
  'compositionstart': true,
  'compositionupdate': true,
  'compositionend': true,
  'touchstart': true,
  'touchend': true,
  'touchmove': true,
  'touchcancel': true,
  'pointerover': true,
  'pointerenter': true,
  'pointerdown': true,
  'pointermove': true,
  'pointerup': true,
  'pointercancel': true,
  'pointerout': true,
  'pointerleave': true,
  'gotpointercapture': true,
  'lostpointercapture': true,
  'dragstart': true,
  'drag': true,
  'dragenter': true,
  'dragleave': true,
  'dragover': true,
  'drop': true,
  'dragend': true,
  'DOMActivate': true,
  'DOMFocusIn': true,
  'DOMFocusOut': true,
  'keypress': true
};

function pathComposer(startNode, composed) {
  let composedPath = [];
  let current = startNode;
  let startRoot = startNode === window ? window : startNode.getRootNode();
  while (current) {
    composedPath.push(current);
    if (current.assignedSlot) {
      current = current.assignedSlot;
    } else if (current.nodeType === Node.DOCUMENT_FRAGMENT_NODE && current.host && (composed || current !== startRoot)) {
      current = current.host;
    } else {
      current = current.parentNode;
    }
  }
  // event composedPath includes window when startNode's ownerRoot is document
  if (composedPath[composedPath.length - 1] === document) {
    composedPath.push(window);
  }
  return composedPath;
}

function retarget(refNode, path) {
  if (!isShadyRoot) {
    return refNode;
  }
  // If ANCESTOR's root is not a shadow root or ANCESTOR's root is BASE's
  // shadow-including inclusive ancestor, return ANCESTOR.
  let refNodePath = pathComposer(refNode, true);
  let p$ = path;
  for (let i=0, ancestor, lastRoot, root, rootIdx; i < p$.length; i++) {
    ancestor = p$[i];
    root = ancestor === window ? window : ancestor.getRootNode();
    if (root !== lastRoot) {
      rootIdx = refNodePath.indexOf(root);
      lastRoot = root;
    }
    if (!isShadyRoot(root) || rootIdx > -1) {
      return ancestor;
    }
  }
}

let eventMixin = {

  /**
   * @this {Event}
   */
  get composed() {
    // isTrusted may not exist in this browser, so just check if isTrusted is explicitly false
    if (this.isTrusted !== false && this.__composed === undefined) {
      this.__composed = alwaysComposed[this.type];
    }
    return this.__composed || false;
  },

  /**
   * @this {Event}
   */
  composedPath() {
    if (!this.__composedPath) {
      this.__composedPath = pathComposer(this['__target'], this.composed);
    }
    return this.__composedPath;
  },

  /**
   * @this {Event}
   */
  get target() {
    return retarget(this.currentTarget, this.composedPath());
  },

  // http://w3c.github.io/webcomponents/spec/shadow/#event-relatedtarget-retargeting
  /**
   * @this {Event}
   */
  get relatedTarget() {
    if (!this.__relatedTarget) {
      return null;
    }
    if (!this.__relatedTargetComposedPath) {
      this.__relatedTargetComposedPath = pathComposer(this.__relatedTarget, true);
    }
    // find the deepest node in relatedTarget composed path that is in the same root with the currentTarget
    return retarget(this.currentTarget, this.__relatedTargetComposedPath);
  },
  /**
   * @this {Event}
   */
  stopPropagation() {
    Event.prototype.stopPropagation.call(this);
    this.__propagationStopped = true;
  },
  /**
   * @this {Event}
   */
  stopImmediatePropagation() {
    Event.prototype.stopImmediatePropagation.call(this);
    this.__immediatePropagationStopped = true;
    this.__propagationStopped = true;
  }

};

function mixinComposedFlag(Base) {
  // NOTE: avoiding use of `class` here so that transpiled output does not
  // try to do `Base.call` with a dom construtor.
  let klazz = function(type, options) {
    let event = new Base(type, options);
    event.__composed = options && Boolean(options['composed']);
    return event;
  };
  // put constructor properties on subclass
  mixin(klazz, Base);
  klazz.prototype = Base.prototype;
  return klazz;
}

let nonBubblingEventsToRetarget = {
  'focus': true,
  'blur': true
};


function fireHandlers(event, node, phase) {
  let hs = node.__handlers && node.__handlers[event.type] &&
    node.__handlers[event.type][phase];
  if (hs) {
    for (let i = 0, fn; (fn = hs[i]); i++) {
      if (event.target === event.relatedTarget) {
        return;
      }
      fn.call(node, event);
      if (event.__immediatePropagationStopped) {
        return;
      }
    }
  }
}

function retargetNonBubblingEvent(e) {
  let path = e.composedPath();
  let node;
  // override `currentTarget` to let patched `target` calculate correctly
  Object.defineProperty(e, 'currentTarget', {
    get: function() {
      return node;
    },
    configurable: true
  });
  for (let i = path.length - 1; i >= 0; i--) {
    node = path[i];
    // capture phase fires all capture handlers
    fireHandlers(e, node, 'capture');
    if (e.__propagationStopped) {
      return;
    }
  }

  // set the event phase to `AT_TARGET` as in spec
  Object.defineProperty(e, 'eventPhase', {get() { return Event.AT_TARGET }});

  // the event only needs to be fired when owner roots change when iterating the event path
  // keep track of the last seen owner root
  let lastFiredRoot;
  for (let i = 0; i < path.length; i++) {
    node = path[i];
    if (i === 0 || (node.shadowRoot && node.shadowRoot === lastFiredRoot)) {
      fireHandlers(e, node, 'bubble');
      // don't bother with window, it doesn't have `getRootNode` and will be last in the path anyway
      if (node !== window) {
        lastFiredRoot = node.getRootNode();
      }
      if (e.__propagationStopped) {
        return;
      }
    }
  }
}

function listenerSettingsEqual(savedListener, node, type, capture, once, passive) {
  let {
    node: savedNode,
    type: savedType,
    capture: savedCapture,
    once: savedOnce,
    passive: savedPassive
  } = savedListener;
  return node === savedNode &&
    type === savedType &&
    capture === savedCapture &&
    once === savedOnce &&
    passive === savedPassive;
}

function findListener(wrappers, node, type, capture, once, passive) {
  for (let i = 0; i < wrappers.length; i++) {
    if (listenerSettingsEqual(wrappers[i], node, type, capture, once, passive)) {
      return i;
    }
  }
  return -1;
}

/**
 * Firefox can throw on accessing __eventWrappers inside of `removeEventListener` during a selenium run
 * Try/Catch accessing __eventWrappers to work around
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1353074
 */
function getEventWrappers(eventLike) {
  let wrappers = null;
  try {
    wrappers = eventLike.__eventWrappers;
  } catch (e) {} // eslint-disable-line no-empty
  return wrappers;
}

/**
 * @this {Event}
 */
function addEventListener$1(type, fnOrObj, optionsOrCapture) {
  if (!fnOrObj) {
    return;
  }

  // The callback `fn` might be used for multiple nodes/events. Since we generate
  // a wrapper function, we need to keep track of it when we remove the listener.
  // It's more efficient to store the node/type/options information as Array in
  // `fn` itself rather than the node (we assume that the same callback is used
  // for few nodes at most, whereas a node will likely have many event listeners).
  // NOTE(valdrin) invoking external functions is costly, inline has better perf.
  let capture, once, passive;
  if (typeof optionsOrCapture === 'object') {
    capture = Boolean(optionsOrCapture.capture);
    once = Boolean(optionsOrCapture.once);
    passive = Boolean(optionsOrCapture.passive);
  } else {
    capture = Boolean(optionsOrCapture);
    once = false;
    passive = false;
  }
  // hack to let ShadyRoots have event listeners
  // event listener will be on host, but `currentTarget`
  // will be set to shadyroot for event listener
  let target = (optionsOrCapture && optionsOrCapture.__shadyTarget) || this;

  let wrappers = fnOrObj.__eventWrappers;
  if (wrappers) {
    // Stop if the wrapper function has already been created.
    if (findListener(wrappers, target, type, capture, once, passive) > -1) {
      return;
    }
  } else {
    fnOrObj.__eventWrappers = [];
  }

  /**
   * @this {HTMLElement}
   */
  const wrapperFn = function(e) {
    // Support `once` option.
    if (once) {
      this.removeEventListener(type, fnOrObj, optionsOrCapture);
    }
    if (!e['__target']) {
      patchEvent(e);
    }
    let lastCurrentTargetDesc;
    if (target !== this) {
      // replace `currentTarget` to make `target` and `relatedTarget` correct for inside the shadowroot
      lastCurrentTargetDesc = Object.getOwnPropertyDescriptor(e, 'currentTarget');
      Object.defineProperty(e, 'currentTarget', {get() { return target }, configurable: true});
    }
    // There are two critera that should stop events from firing on this node
    // 1. the event is not composed and the current node is not in the same root as the target
    // 2. when bubbling, if after retargeting, relatedTarget and target point to the same node
    if (e.composed || e.composedPath().indexOf(target) > -1) {
      if (e.target === e.relatedTarget) {
        if (e.eventPhase === Event.BUBBLING_PHASE) {
          e.stopImmediatePropagation();
        }
        return;
      }
      // prevent non-bubbling events from triggering bubbling handlers on shadowroot, but only if not in capture phase
      if (e.eventPhase !== Event.CAPTURING_PHASE && !e.bubbles && e.target !== target) {
        return;
      }
      let ret = (typeof fnOrObj === 'object' && fnOrObj.handleEvent) ?
        fnOrObj.handleEvent(e) :
        fnOrObj.call(target, e);
      if (target !== this) {
        // replace the "correct" `currentTarget`
        if (lastCurrentTargetDesc) {
          Object.defineProperty(e, 'currentTarget', lastCurrentTargetDesc);
          lastCurrentTargetDesc = null;
        } else {
          delete e['currentTarget'];
        }
      }
      return ret;
    }
  };
  // Store the wrapper information.
  fnOrObj.__eventWrappers.push({
    node: this,
    type: type,
    capture: capture,
    once: once,
    passive: passive,
    wrapperFn: wrapperFn
  });

  if (nonBubblingEventsToRetarget[type]) {
    this.__handlers = this.__handlers || {};
    this.__handlers[type] = this.__handlers[type] ||
      {'capture': [], 'bubble': []};
    this.__handlers[type][capture ? 'capture' : 'bubble'].push(wrapperFn);
  } else {
    let ael = this instanceof Window ? windowAddEventListener :
      addEventListener;
    ael.call(this, type, wrapperFn, optionsOrCapture);
  }
}

/**
 * @this {Event}
 */
function removeEventListener$1(type, fnOrObj, optionsOrCapture) {
  if (!fnOrObj) {
    return;
  }

  // NOTE(valdrin) invoking external functions is costly, inline has better perf.
  let capture, once, passive;
  if (typeof optionsOrCapture === 'object') {
    capture = Boolean(optionsOrCapture.capture);
    once = Boolean(optionsOrCapture.once);
    passive = Boolean(optionsOrCapture.passive);
  } else {
    capture = Boolean(optionsOrCapture);
    once = false;
    passive = false;
  }
  let target = (optionsOrCapture && optionsOrCapture.__shadyTarget) || this;
  // Search the wrapped function.
  let wrapperFn = undefined;
  let wrappers = getEventWrappers(fnOrObj);
  if (wrappers) {
    let idx = findListener(wrappers, target, type, capture, once, passive);
    if (idx > -1) {
      wrapperFn = wrappers.splice(idx, 1)[0].wrapperFn;
      // Cleanup.
      if (!wrappers.length) {
        fnOrObj.__eventWrappers = undefined;
      }
    }
  }
  let rel = this instanceof Window ? windowRemoveEventListener :
    removeEventListener;
  rel.call(this, type, wrapperFn || fnOrObj, optionsOrCapture);
  if (wrapperFn && nonBubblingEventsToRetarget[type] &&
      this.__handlers && this.__handlers[type]) {
    const arr = this.__handlers[type][capture ? 'capture' : 'bubble'];
    const idx = arr.indexOf(wrapperFn);
    if (idx > -1) {
      arr.splice(idx, 1);
    }
  }
}

function activateFocusEventOverrides() {
  for (let ev in nonBubblingEventsToRetarget) {
    window.addEventListener(ev, function(e) {
      if (!e['__target']) {
        patchEvent(e);
        retargetNonBubblingEvent(e);
      }
    }, true);
  }
}

function patchEvent(event) {
  event['__target'] = event.target;
  event.__relatedTarget = event.relatedTarget;
  // patch event prototype if we can
  if (settings.hasDescriptors) {
    patchPrototype(event, eventMixin);
  // and fallback to patching instance
  } else {
    extend(event, eventMixin);
  }
}

let PatchedEvent = mixinComposedFlag(window.Event);
let PatchedCustomEvent = mixinComposedFlag(window.CustomEvent);
let PatchedMouseEvent = mixinComposedFlag(window.MouseEvent);

function patchEvents() {
  window.Event = PatchedEvent;
  window.CustomEvent = PatchedCustomEvent;
  window.MouseEvent = PatchedMouseEvent;
  activateFocusEventOverrides();
}

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

function newSplice(index, removed, addedCount) {
  return {
    index: index,
    removed: removed,
    addedCount: addedCount
  };
}

const EDIT_LEAVE = 0;
const EDIT_UPDATE = 1;
const EDIT_ADD = 2;
const EDIT_DELETE = 3;

// Note: This function is *based* on the computation of the Levenshtein
// "edit" distance. The one change is that "updates" are treated as two
// edits - not one. With Array splices, an update is really a delete
// followed by an add. By retaining this, we optimize for "keeping" the
// maximum array items in the original array. For example:
//
//   'xxxx123' -> '123yyyy'
//
// With 1-edit updates, the shortest path would be just to update all seven
// characters. With 2-edit updates, we delete 4, leave 3, and add 4. This
// leaves the substring '123' intact.
function calcEditDistances(current, currentStart, currentEnd,
                            old, oldStart, oldEnd) {
  // "Deletion" columns
  let rowCount = oldEnd - oldStart + 1;
  let columnCount = currentEnd - currentStart + 1;
  let distances = new Array(rowCount);

  // "Addition" rows. Initialize null column.
  for (let i = 0; i < rowCount; i++) {
    distances[i] = new Array(columnCount);
    distances[i][0] = i;
  }

  // Initialize null row
  for (let j = 0; j < columnCount; j++)
    distances[0][j] = j;

  for (let i = 1; i < rowCount; i++) {
    for (let j = 1; j < columnCount; j++) {
      if (equals(current[currentStart + j - 1], old[oldStart + i - 1]))
        distances[i][j] = distances[i - 1][j - 1];
      else {
        let north = distances[i - 1][j] + 1;
        let west = distances[i][j - 1] + 1;
        distances[i][j] = north < west ? north : west;
      }
    }
  }

  return distances;
}

// This starts at the final weight, and walks "backward" by finding
// the minimum previous weight recursively until the origin of the weight
// matrix.
function spliceOperationsFromEditDistances(distances) {
  let i = distances.length - 1;
  let j = distances[0].length - 1;
  let current = distances[i][j];
  let edits = [];
  while (i > 0 || j > 0) {
    if (i == 0) {
      edits.push(EDIT_ADD);
      j--;
      continue;
    }
    if (j == 0) {
      edits.push(EDIT_DELETE);
      i--;
      continue;
    }
    let northWest = distances[i - 1][j - 1];
    let west = distances[i - 1][j];
    let north = distances[i][j - 1];

    let min;
    if (west < north)
      min = west < northWest ? west : northWest;
    else
      min = north < northWest ? north : northWest;

    if (min == northWest) {
      if (northWest == current) {
        edits.push(EDIT_LEAVE);
      } else {
        edits.push(EDIT_UPDATE);
        current = northWest;
      }
      i--;
      j--;
    } else if (min == west) {
      edits.push(EDIT_DELETE);
      i--;
      current = west;
    } else {
      edits.push(EDIT_ADD);
      j--;
      current = north;
    }
  }

  edits.reverse();
  return edits;
}

/**
 * Splice Projection functions:
 *
 * A splice map is a representation of how a previous array of items
 * was transformed into a new array of items. Conceptually it is a list of
 * tuples of
 *
 *   <index, removed, addedCount>
 *
 * which are kept in ascending index order of. The tuple represents that at
 * the |index|, |removed| sequence of items were removed, and counting forward
 * from |index|, |addedCount| items were added.
 */

/**
 * Lacking individual splice mutation information, the minimal set of
 * splices can be synthesized given the previous state and final state of an
 * array. The basic approach is to calculate the edit distance matrix and
 * choose the shortest path through it.
 *
 * Complexity: O(l * p)
 *   l: The length of the current array
 *   p: The length of the old array
 */
function calcSplices(current, currentStart, currentEnd,
                      old, oldStart, oldEnd) {
  let prefixCount = 0;
  let suffixCount = 0;
  let splice;

  let minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
  if (currentStart == 0 && oldStart == 0)
    prefixCount = sharedPrefix(current, old, minLength);

  if (currentEnd == current.length && oldEnd == old.length)
    suffixCount = sharedSuffix(current, old, minLength - prefixCount);

  currentStart += prefixCount;
  oldStart += prefixCount;
  currentEnd -= suffixCount;
  oldEnd -= suffixCount;

  if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
    return [];

  if (currentStart == currentEnd) {
    splice = newSplice(currentStart, [], 0);
    while (oldStart < oldEnd)
      splice.removed.push(old[oldStart++]);

    return [ splice ];
  } else if (oldStart == oldEnd)
    return [ newSplice(currentStart, [], currentEnd - currentStart) ];

  let ops = spliceOperationsFromEditDistances(
      calcEditDistances(current, currentStart, currentEnd,
                             old, oldStart, oldEnd));

  splice = undefined;
  let splices = [];
  let index = currentStart;
  let oldIndex = oldStart;
  for (let i = 0; i < ops.length; i++) {
    switch(ops[i]) {
      case EDIT_LEAVE:
        if (splice) {
          splices.push(splice);
          splice = undefined;
        }

        index++;
        oldIndex++;
        break;
      case EDIT_UPDATE:
        if (!splice)
          splice = newSplice(index, [], 0);

        splice.addedCount++;
        index++;

        splice.removed.push(old[oldIndex]);
        oldIndex++;
        break;
      case EDIT_ADD:
        if (!splice)
          splice = newSplice(index, [], 0);

        splice.addedCount++;
        index++;
        break;
      case EDIT_DELETE:
        if (!splice)
          splice = newSplice(index, [], 0);

        splice.removed.push(old[oldIndex]);
        oldIndex++;
        break;
    }
  }

  if (splice) {
    splices.push(splice);
  }
  return splices;
}

function sharedPrefix(current, old, searchLength) {
  for (let i = 0; i < searchLength; i++)
    if (!equals(current[i], old[i]))
      return i;
  return searchLength;
}

function sharedSuffix(current, old, searchLength) {
  let index1 = current.length;
  let index2 = old.length;
  let count = 0;
  while (count < searchLength && equals(current[--index1], old[--index2]))
    count++;

  return count;
}

function equals(currentValue, previousValue) {
  return currentValue === previousValue;
}

function calculateSplices(current, previous) {
  return calcSplices(current, 0, current.length, previous, 0,
                          previous.length);
}

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

// NOTE: normalize event contruction where necessary (IE11)
let NormalizedEvent = typeof Event === 'function' ? Event :
  function(inType, params) {
    params = params || {};
    var e = document.createEvent('Event');
    e.initEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable));
    return e;
  };

var Distributor = class {

  constructor(root) {
    this.root = root;
    this.insertionPointTag = 'slot';
  }

  getInsertionPoints() {
    return this.root.querySelectorAll(this.insertionPointTag);
  }

  isInsertionPoint(node) {
    return node.localName && node.localName == this.insertionPointTag;
  }

  distribute() {
    if (this.root.hasInsertionPoint()) {
      return this.distributePool(this.root, this.collectPool());
    }
    return [];
  }

  // Gather the pool of nodes that should be distributed. We will combine
  // these with the "content root" to arrive at the composed tree.
  collectPool() {
    let host = this.root.host;
    let pool=[], i=0;
    for (let n=host.firstChild; n; n=n.nextSibling) {
      pool[i++] = n;
    }
    return pool;
  }

  // perform "logical" distribution; note, no actual dom is moved here,
  // instead elements are distributed into storage
  // array where applicable.
  distributePool(node, pool) {
    let dirtyRoots = [];
    let p$ = this.root._getInsertionPoints();
    for (let i=0, l=p$.length, p; (i<l) && (p=p$[i]); i++) {
      this.distributeInsertionPoint(p, pool);
      // provoke redistribution on insertion point parents
      // must do this on all candidate hosts since distribution in this
      // scope invalidates their distribution.
      // only get logical parent.
      let parent = p.parentNode;
      let root = parent && parent.__shady && parent.__shady.root;
      if (root && root.hasInsertionPoint()) {
        dirtyRoots.push(root);
      }
    }
    for (let i=0; i < pool.length; i++) {
      let p = pool[i];
      if (p) {
        p.__shady = p.__shady || {};
        p.__shady.assignedSlot = undefined;
        // remove undistributed elements from physical dom.
        let parent = parentNode(p);
        if (parent) {
          removeChild.call(parent, p);
        }
      }
    }
    return dirtyRoots;
  }

  distributeInsertionPoint(insertionPoint, pool) {
    let prevAssignedNodes = insertionPoint.__shady.assignedNodes;
    if (prevAssignedNodes) {
      this.clearAssignedSlots(insertionPoint, true);
    }
    insertionPoint.__shady.assignedNodes = [];
    let needsSlotChange = false;
    // distribute nodes from the pool that this selector matches
    let anyDistributed = false;
    for (let i=0, l=pool.length, node; i < l; i++) {
      node=pool[i];
      // skip nodes that were already used
      if (!node) {
        continue;
      }
      // distribute this node if it matches
      if (this.matchesInsertionPoint(node, insertionPoint)) {
        if (node.__shady._prevAssignedSlot != insertionPoint) {
          needsSlotChange = true;
        }
        this.distributeNodeInto(node, insertionPoint);
        // remove this node from the pool
        pool[i] = undefined;
        // since at least one node matched, we won't need fallback content
        anyDistributed = true;
      }
    }
    // Fallback content if nothing was distributed here
    if (!anyDistributed) {
      let children$$1 = insertionPoint.childNodes;
      for (let j = 0, node; j < children$$1.length; j++) {
        node = children$$1[j];
        if (node.__shady._prevAssignedSlot != insertionPoint) {
          needsSlotChange = true;
        }
        this.distributeNodeInto(node, insertionPoint);
      }
    }
    // we're already dirty if a node was newly added to the slot
    // and we're also dirty if the assigned count decreased.
    if (prevAssignedNodes) {
      // TODO(sorvell): the tracking of previously assigned slots
      // could instead by done with a Set and then we could
      // avoid needing to iterate here to clear the info.
      for (let i=0; i < prevAssignedNodes.length; i++) {
        prevAssignedNodes[i].__shady._prevAssignedSlot = null;
      }
      if (insertionPoint.__shady.assignedNodes.length < prevAssignedNodes.length) {
        needsSlotChange = true;
      }
    }
    this.setDistributedNodesOnInsertionPoint(insertionPoint);
    if (needsSlotChange) {
      this._fireSlotChange(insertionPoint);
    }
  }

  clearAssignedSlots(slot, savePrevious) {
    let n$ = slot.__shady.assignedNodes;
    if (n$) {
      for (let i=0; i < n$.length; i++) {
        let n = n$[i];
        if (savePrevious) {
          n.__shady._prevAssignedSlot = n.__shady.assignedSlot;
        }
        // only clear if it was previously set to this slot;
        // this helps ensure that if the node has otherwise been distributed
        // ignore it.
        if (n.__shady.assignedSlot === slot) {
          n.__shady.assignedSlot = null;
        }
      }
    }
  }

  matchesInsertionPoint(node, insertionPoint) {
    let slotName = insertionPoint.getAttribute('name');
    slotName = slotName ? slotName.trim() : '';
    let slot = node.getAttribute && node.getAttribute('slot');
    slot = slot ? slot.trim() : '';
    return (slot == slotName);
  }

  distributeNodeInto(child, insertionPoint) {
    insertionPoint.__shady.assignedNodes.push(child);
    child.__shady.assignedSlot = insertionPoint;
  }

  setDistributedNodesOnInsertionPoint(insertionPoint) {
    let n$ = insertionPoint.__shady.assignedNodes;
    insertionPoint.__shady.distributedNodes = [];
    for (let i=0, n; (i<n$.length) && (n=n$[i]) ; i++) {
      if (this.isInsertionPoint(n)) {
        let d$ = n.__shady.distributedNodes;
        if (d$) {
          for (let j=0; j < d$.length; j++) {
            insertionPoint.__shady.distributedNodes.push(d$[j]);
          }
        }
      } else {
        insertionPoint.__shady.distributedNodes.push(n$[i]);
      }
    }
  }

  _fireSlotChange(insertionPoint) {
    // NOTE: cannot bubble correctly here so not setting bubbles: true
    // Safari tech preview does not bubble but chrome does
    // Spec says it bubbles (https://dom.spec.whatwg.org/#mutation-observers)
    dispatchEvent.call(insertionPoint, new NormalizedEvent('slotchange'));
    if (insertionPoint.__shady.assignedSlot) {
      this._fireSlotChange(insertionPoint.__shady.assignedSlot);
    }
  }

  isFinalDestination(insertionPoint) {
    return !(insertionPoint.__shady.assignedSlot);
  }

};

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

// Do not export this object. It must be passed as the first argument to the
// ShadyRoot constructor in `attachShadow` to prevent the constructor from
// throwing. This prevents the user from being able to manually construct a
// ShadyRoot (i.e. `new ShadowRoot()`).
const ShadyRootConstructionToken = {};

/**
 * @constructor
 * @extends {ShadowRoot}
 */
let ShadyRoot = function(token, host) {
  if (token !== ShadyRootConstructionToken) {
    throw new TypeError('Illegal constructor');
  }
  // NOTE: this strange construction is necessary because
  // DocumentFragment cannot be subclassed on older browsers.
  let shadowRoot = document.createDocumentFragment();
  shadowRoot.__proto__ = ShadyRoot.prototype;
  /** @type {ShadyRoot} */ (shadowRoot)._init(host);
  return shadowRoot;
};

ShadyRoot.prototype = Object.create(DocumentFragment.prototype);

ShadyRoot.prototype._init = function(host) {
  // NOTE: set a fake local name so this element can be
  // distinguished from a DocumentFragment when patching.
  // FF doesn't allow this to be `localName`
  this.__localName = 'ShadyRoot';
  // logical dom setup
  recordChildNodes(host);
  recordChildNodes(this);
  // root <=> host
  host.shadowRoot = this;
  this.host = host;
  // state flags
  this._renderPending = false;
  this._hasRendered = false;
  this._changePending = false;
  this._distributor = new Distributor(this);
  this.update();
};


// async render
ShadyRoot.prototype.update = function() {
  if (!this._renderPending) {
    this._renderPending = true;
    enqueue(() => this.render());
  }
};

// returns the oldest renderPending ancestor root.
ShadyRoot.prototype._getRenderRoot = function() {
  let renderRoot = this;
  let root = this;
  while (root) {
    if (root._renderPending) {
      renderRoot = root;
    }
    root = root._rendererForHost();
  }
  return renderRoot;
};

// Returns the shadyRoot `this.host` if `this.host`
// has children that require distribution.
ShadyRoot.prototype._rendererForHost = function() {
  let root = this.host.getRootNode();
  if (isShadyRoot(root)) {
    let c$ = this.host.childNodes;
    for (let i=0, c; i < c$.length; i++) {
      c = c$[i];
      if (this._distributor.isInsertionPoint(c)) {
        return root;
      }
    }
  }
};

ShadyRoot.prototype.render = function() {
  if (this._renderPending) {
    this._getRenderRoot()['_render']();
  }
};

// NOTE: avoid renaming to ease testability.
ShadyRoot.prototype['_render'] = function() {
  this._renderPending = false;
  this._changePending = false;
  if (!this._skipUpdateInsertionPoints) {
    this.updateInsertionPoints();
  } else if (!this._hasRendered) {
    this.__insertionPoints = [];
  }
  this._skipUpdateInsertionPoints = false;
  // TODO(sorvell): can add a first render optimization here
  // to use if there are no insertion points
  // 1. clear host node of composed children
  // 2. appendChild the shadowRoot itself or (more robust) its logical children
  // NOTE: this didn't seem worth it in perf testing
  // but not ready to delete this info.
  // logical
  this.distribute();
  // physical
  this.compose();
  this._hasRendered = true;
};

ShadyRoot.prototype.forceRender = function() {
  this._renderPending = true;
  this.render();
};

ShadyRoot.prototype.distribute = function() {
  let dirtyRoots = this._distributor.distribute();
  for (let i=0; i<dirtyRoots.length; i++) {
    dirtyRoots[i]['_render']();
  }
};

ShadyRoot.prototype.updateInsertionPoints = function() {
  let i$ = this._insertionPoints;
  // if any insertion points have been removed, clear their distribution info
  if (i$) {
    for (let i=0, c; i < i$.length; i++) {
      c = i$[i];
      if (c.getRootNode() !== this) {
        this._distributor.clearAssignedSlots(c);
      }
    }
  }
  i$ = this._insertionPoints = this._distributor.getInsertionPoints();
  // ensure insertionPoints's and their parents have logical dom info.
  // save logical tree info
  // a. for shadyRoot
  // b. for insertion points (fallback)
  // c. for parents of insertion points
  for (let i=0, c; i < i$.length; i++) {
    c = i$[i];
    c.__shady = c.__shady || {};
    recordChildNodes(c);
    recordChildNodes(c.parentNode);
  }
};

ShadyRoot.prototype.compose = function() {
  // compose self
  // note: it's important to mark this clean before distribution
  // so that attachment that provokes additional distribution (e.g.
  // adding something to your parentNode) works
  this._composeTree();
  // TODO(sorvell): See fast paths here in Polymer v1
  // (these seem unnecessary)
};

// Reify dom such that it is at its correct rendering position
// based on logical distribution.
ShadyRoot.prototype._composeTree = function() {
  this._updateChildNodes(this.host, this._composeNode(this.host));
  let p$ = this._getInsertionPoints();
  for (let i=0, l=p$.length, p, parent; (i<l) && (p=p$[i]); i++) {
    parent = p.parentNode;
    if ((parent !== this.host) && (parent !== this)) {
      this._updateChildNodes(parent, this._composeNode(parent));
    }
  }
};

// Returns the list of nodes which should be rendered inside `node`.
ShadyRoot.prototype._composeNode = function(node) {
  let children$$1 = [];
  let c$ = ((node.__shady && node.__shady.root) || node).childNodes;
  for (let i = 0; i < c$.length; i++) {
    let child = c$[i];
    if (this._distributor.isInsertionPoint(child)) {
      let distributedNodes = child.__shady.distributedNodes ||
        (child.__shady.distributedNodes = []);
      for (let j = 0; j < distributedNodes.length; j++) {
        let distributedNode = distributedNodes[j];
        if (this.isFinalDestination(child, distributedNode)) {
          children$$1.push(distributedNode);
        }
      }
    } else {
      children$$1.push(child);
    }
  }
  return children$$1;
};

ShadyRoot.prototype.isFinalDestination = function(insertionPoint, node) {
  return this._distributor.isFinalDestination(
    insertionPoint, node);
};

// Ensures that the rendered node list inside `container` is `children`.
ShadyRoot.prototype._updateChildNodes = function(container, children$$1) {
  let composed = childNodes(container);
  let splices = calculateSplices(children$$1, composed);
  // process removals
  for (let i=0, d=0, s; (i<splices.length) && (s=splices[i]); i++) {
    for (let j=0, n; (j < s.removed.length) && (n=s.removed[j]); j++) {
      // check if the node is still where we expect it is before trying
      // to remove it; this can happen if we move a node and
      // then schedule its previous host for distribution resulting in
      // the node being removed here.
      if (parentNode(n) === container) {
        removeChild.call(container, n);
      }
      composed.splice(s.index + d, 1);
    }
    d -= s.addedCount;
  }
  // process adds
  for (let i=0, s, next; (i<splices.length) && (s=splices[i]); i++) { //eslint-disable-line no-redeclare
    next = composed[s.index];
    for (let j=s.index, n; j < s.index + s.addedCount; j++) {
      n = children$$1[j];
      insertBefore.call(container, n, next);
      // TODO(sorvell): is this splice strictly needed?
      composed.splice(j, 0, n);
    }
  }
};

ShadyRoot.prototype.getInsertionPointTag = function() {
  return this._distributor.insertionPointTag;
};

ShadyRoot.prototype.hasInsertionPoint = function() {
  return Boolean(this._insertionPoints && this._insertionPoints.length);
};

ShadyRoot.prototype._getInsertionPoints = function() {
  if (!this._insertionPoints) {
    this.updateInsertionPoints();
  }
  return this._insertionPoints;
};

ShadyRoot.prototype.addEventListener = function(type, fn, optionsOrCapture) {
  if (typeof optionsOrCapture !== 'object') {
    optionsOrCapture = {
      capture: Boolean(optionsOrCapture)
    };
  }
  optionsOrCapture.__shadyTarget = this;
  this.host.addEventListener(type, fn, optionsOrCapture);
};

ShadyRoot.prototype.removeEventListener = function(type, fn, optionsOrCapture) {
  if (typeof optionsOrCapture !== 'object') {
    optionsOrCapture = {
      capture: Boolean(optionsOrCapture)
    };
  }
  optionsOrCapture.__shadyTarget = this;
  this.host.removeEventListener(type, fn, optionsOrCapture);
};

ShadyRoot.prototype.getElementById = function(id) {
  return this.querySelector(`#${id}`);
};

/**
  Implements a pared down version of ShadowDOM's scoping, which is easy to
  polyfill across browsers.
*/
function attachShadow(host, options) {
  if (!host) {
    throw 'Must provide a host.';
  }
  if (!options) {
    throw 'Not enough arguments.'
  }
  return new ShadyRoot(ShadyRootConstructionToken, host);
}

patchShadowRootAccessors(ShadyRoot.prototype);

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

function getAssignedSlot(node) {
  renderRootNode(node);
  return node.__shady && node.__shady.assignedSlot || null;
}

let windowMixin = {

  // NOTE: ensure these methods are bound to `window` so that `this` is correct
  // when called directly from global context without a receiver; e.g.
  // `addEventListener(...)`.
  addEventListener: addEventListener$1.bind(window),

  removeEventListener: removeEventListener$1.bind(window)

};

let nodeMixin = {

  addEventListener: addEventListener$1,

  removeEventListener: removeEventListener$1,

  appendChild(node) {
    return insertBefore$1(this, node);
  },

  insertBefore(node, ref_node) {
    return insertBefore$1(this, node, ref_node);
  },

  removeChild(node) {
    return removeChild$1(this, node);
  },

  /**
   * @this {Node}
   */
  replaceChild(node, ref_node) {
    this.insertBefore(node, ref_node);
    this.removeChild(ref_node);
    return node;
  },

  /**
   * @this {Node}
   */
  cloneNode(deep) {
    return cloneNode$1(this, deep);
  },

  /**
   * @this {Node}
   */
  getRootNode(options) {
    return getRootNode(this, options);
  },

  /**
   * @this {Node}
   */
  get isConnected() {
    // Fast path for distributed nodes.
    const ownerDocument = this.ownerDocument;
    if (ownerDocument && ownerDocument.contains && ownerDocument.contains(this)) return true;
    const ownerDocumentElement = ownerDocument.documentElement;
    if (ownerDocumentElement && ownerDocumentElement.contains && ownerDocumentElement.contains(this)) return true;

    let node = this;
    while (node && !(node instanceof Document)) {
      node = node.parentNode || (node instanceof ShadyRoot ? /** @type {ShadowRoot} */(node).host : undefined);
    }
    return !!(node && node instanceof Document);
  },

  /**
   * @this {Node}
   */
  dispatchEvent(event) {
    flush();
    return dispatchEvent.call(this, event);
  }

};

// NOTE: For some reason `Text` redefines `assignedSlot`
let textMixin = {
  /**
   * @this {Text}
   */
  get assignedSlot() {
    return getAssignedSlot(this);
  }
};

let fragmentMixin = {

  // TODO(sorvell): consider doing native QSA and filtering results.
  /**
   * @this {DocumentFragment}
   */
  querySelector(selector) {
    // match selector and halt on first result.
    let result = query(this, function(n) {
      return matchesSelector(n, selector);
    }, function(n) {
      return Boolean(n);
    })[0];
    return result || null;
  },

  /**
   * @this {DocumentFragment}
   */
  querySelectorAll(selector) {
    return query(this, function(n) {
      return matchesSelector(n, selector);
    });
  }

};

let slotMixin = {

  /**
   * @this {HTMLSlotElement}
   */
  assignedNodes(options) {
    if (this.localName === 'slot') {
      renderRootNode(this);
      return this.__shady ?
        ((options && options.flatten ? this.__shady.distributedNodes :
        this.__shady.assignedNodes) || []) :
        [];
    }
  }

};

let elementMixin = extendAll({

  /**
   * @this {HTMLElement}
   */
  setAttribute(name, value) {
    setAttribute$1(this, name, value);
  },

  /**
   * @this {HTMLElement}
   */
  removeAttribute(name) {
    removeAttribute$1(this, name);
  },

  /**
   * @this {HTMLElement}
   */
  attachShadow(options) {
    return attachShadow(this, options);
  },

  /**
   * @this {HTMLElement}
   */
  get slot() {
    return this.getAttribute('slot');
  },

  /**
   * @this {HTMLElement}
   */
  set slot(value) {
    this.setAttribute('slot', value);
  },

  /**
   * @this {HTMLElement}
   */
  get assignedSlot() {
    return getAssignedSlot(this);
  }

}, fragmentMixin, slotMixin);

Object.defineProperties(elementMixin, ShadowRootAccessor);

let documentMixin = extendAll({
  /**
   * @this {Document}
   */
  importNode(node, deep) {
    return importNode$1(node, deep);
  },

  /**
   * @this {Document}
   */
  getElementById(id) {
    return this.querySelector(`#${id}`);
  }

}, fragmentMixin);

Object.defineProperties(documentMixin, {
  '_activeElement': ActiveElementAccessor.activeElement
});

let nativeBlur = HTMLElement.prototype.blur;

let htmlElementMixin = extendAll({
  /**
   * @this {HTMLElement}
   */
  blur() {
    let root = this.shadowRoot;
    let shadowActive = root && root.activeElement;
    if (shadowActive) {
      shadowActive.blur();
    } else {
      nativeBlur.call(this);
    }
  }
});

function patchBuiltin(proto, obj) {
  let n$ = Object.getOwnPropertyNames(obj);
  for (let i=0; i < n$.length; i++) {
    let n = n$[i];
    let d = Object.getOwnPropertyDescriptor(obj, n);
    // NOTE: we prefer writing directly here because some browsers
    // have descriptors that are writable but not configurable (e.g.
    // `appendChild` on older browsers)
    if (d.value) {
      proto[n] = d.value;
    } else {
      Object.defineProperty(proto, n, d);
    }
  }
}


// Apply patches to builtins (e.g. Element.prototype). Some of these patches
// can be done unconditionally (mostly methods like
// `Element.prototype.appendChild`) and some can only be done when the browser
// has proper descriptors on the builtin prototype
// (e.g. `Element.prototype.firstChild`)`. When descriptors are not available,
// elements are individually patched when needed (see e.g.
// `patchInside/OutsideElementAccessors` in `patch-accessors.js`).
function patchBuiltins() {
  let nativeHTMLElement =
    (window['customElements'] && window['customElements']['nativeHTMLElement']) ||
    HTMLElement;
  // These patches can always be done, for all supported browsers.
  patchBuiltin(window.Node.prototype, nodeMixin);
  patchBuiltin(window.Window.prototype, windowMixin);
  patchBuiltin(window.Text.prototype, textMixin);
  patchBuiltin(window.DocumentFragment.prototype, fragmentMixin);
  patchBuiltin(window.Element.prototype, elementMixin);
  patchBuiltin(window.Document.prototype, documentMixin);
  if (window.HTMLSlotElement) {
    patchBuiltin(window.HTMLSlotElement.prototype, slotMixin);
  }
  patchBuiltin(nativeHTMLElement.prototype, htmlElementMixin);
  // These patches can *only* be done
  // on browsers that have proper property descriptors on builtin prototypes.
  // This includes: IE11, Edge, Chrome >= 4?; Safari >= 10, Firefox
  // On older browsers (Chrome <= 4?, Safari 9), a per element patching
  // strategy is used for patching accessors.
  if (settings.hasDescriptors) {
    patchAccessors(window.Node.prototype);
    patchAccessors(window.Text.prototype);
    patchAccessors(window.DocumentFragment.prototype);
    patchAccessors(window.Element.prototype);
    patchAccessors(nativeHTMLElement.prototype);
    patchAccessors(window.Document.prototype);
    if (window.HTMLSlotElement) {
      patchAccessors(window.HTMLSlotElement.prototype);
    }
  }
}

/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/**
 * Patches elements that interacts with ShadyDOM
 * such that tree traversal and mutation apis act like they would under
 * ShadowDOM.
 *
 * This import enables seemless interaction with ShadyDOM powered
 * custom elements, enabling better interoperation with 3rd party code,
 * libraries, and frameworks that use DOM tree manipulation apis.
 */

if (settings.inUse) {
  let ShadyDOM = {
    // TODO(sorvell): remove when Polymer does not depend on this.
    'inUse': settings.inUse,
    // TODO(sorvell): remove when Polymer does not depend on this
    'patch': (node) => node,
    'isShadyRoot': isShadyRoot,
    'enqueue': enqueue,
    'flush': flush,
    'settings': settings,
    'filterMutations': filterMutations,
    'observeChildren': observeChildren,
    'unobserveChildren': unobserveChildren,
    'nativeMethods': nativeMethods,
    'nativeTree': nativeTree
  };

  window['ShadyDOM'] = ShadyDOM;

  // Apply patches to events...
  patchEvents();
  // Apply patches to builtins (e.g. Element.prototype) where applicable.
  patchBuiltins();

  window.ShadowRoot = ShadyRoot;
}

}());
