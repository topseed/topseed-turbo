(function () {
  'use strict';

  const reservedTagList = new Set([
    'annotation-xml',
    'color-profile',
    'font-face',
    'font-face-src',
    'font-face-uri',
    'font-face-format',
    'font-face-name',
    'missing-glyph',
  ]);

  /**
   * @param {string} localName
   * @returns {boolean}
   */
  function isValidCustomElementName(localName) {
    const reserved = reservedTagList.has(localName);
    const validForm = /^[a-z][.0-9_a-z]*-[\-.0-9_a-z]*$/.test(localName);
    return !reserved && validForm;
  }

  /**
   * @private
   * @param {!Node} node
   * @return {boolean}
   */
  function isConnected(node) {
    // Use `Node#isConnected`, if defined.
    const nativeValue = node.isConnected;
    if (nativeValue !== undefined) {
      return nativeValue;
    }

    /** @type {?Node|undefined} */
    let current = node;
    while (current && !(current.__CE_isImportDocument || current instanceof Document)) {
      current = current.parentNode || (window.ShadowRoot && current instanceof ShadowRoot ? current.host : undefined);
    }
    return !!(current && (current.__CE_isImportDocument || current instanceof Document));
  }

  /**
   * @param {!Node} root
   * @param {!Node} start
   * @return {?Node}
   */
  function nextSiblingOrAncestorSibling(root, start) {
    let node = start;
    while (node && node !== root && !node.nextSibling) {
      node = node.parentNode;
    }
    return (!node || node === root) ? null : node.nextSibling;
  }

  /**
   * @param {!Node} root
   * @param {!Node} start
   * @return {?Node}
   */
  function nextNode(root, start) {
    return start.firstChild ? start.firstChild : nextSiblingOrAncestorSibling(root, start);
  }

  /**
   * @param {!Node} root
   * @param {!function(!Element)} callback
   * @param {!Set<Node>=} visitedImports
   */
  function walkDeepDescendantElements(root, callback, visitedImports = new Set()) {
    let node = root;
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = /** @type {!Element} */(node);

        callback(element);

        const localName = element.localName;
        if (localName === 'link' && element.getAttribute('rel') === 'import') {
          // If this import (polyfilled or not) has it's root node available,
          // walk it.
          const importNode = /** @type {!Node} */ (element.import);
          if (importNode instanceof Node && !visitedImports.has(importNode)) {
            // Prevent multiple walks of the same import root.
            visitedImports.add(importNode);

            for (let child = importNode.firstChild; child; child = child.nextSibling) {
              walkDeepDescendantElements(child, callback, visitedImports);
            }
          }

          // Ignore descendants of import links to prevent attempting to walk the
          // elements created by the HTML Imports polyfill that we just walked
          // above.
          node = nextSiblingOrAncestorSibling(root, element);
          continue;
        } else if (localName === 'template') {
          // Ignore descendants of templates. There shouldn't be any descendants
          // because they will be moved into `.content` during construction in
          // browsers that support template but, in case they exist and are still
          // waiting to be moved by a polyfill, they will be ignored.
          node = nextSiblingOrAncestorSibling(root, element);
          continue;
        }

        // Walk shadow roots.
        const shadowRoot = element.__CE_shadowRoot;
        if (shadowRoot) {
          for (let child = shadowRoot.firstChild; child; child = child.nextSibling) {
            walkDeepDescendantElements(child, callback, visitedImports);
          }
        }
      }

      node = nextNode(root, node);
    }
  }

  /**
   * Used to suppress Closure's "Modifying the prototype is only allowed if the
   * constructor is in the same scope" warning without using
   * `@suppress {newCheckTypes, duplicate}` because `newCheckTypes` is too broad.
   *
   * @param {!Object} destination
   * @param {string} name
   * @param {*} value
   */
  function setPropertyUnchecked(destination, name, value) {
    destination[name] = value;
  }

  /**
   * @enum {number}
   */
  const CustomElementState = {
    custom: 1,
    failed: 2,
  };

  class CustomElementInternals {
    constructor() {
      /** @type {!Map<string, !CustomElementDefinition>} */
      this._localNameToDefinition = new Map();

      /** @type {!Map<!Function, !CustomElementDefinition>} */
      this._constructorToDefinition = new Map();

      /** @type {!Array<!function(!Node)>} */
      this._patches = [];

      /** @type {boolean} */
      this._hasPatches = false;
    }

    /**
     * @param {string} localName
     * @param {!CustomElementDefinition} definition
     */
    setDefinition(localName, definition) {
      this._localNameToDefinition.set(localName, definition);
      this._constructorToDefinition.set(definition.constructor, definition);
    }

    /**
     * @param {string} localName
     * @return {!CustomElementDefinition|undefined}
     */
    localNameToDefinition(localName) {
      return this._localNameToDefinition.get(localName);
    }

    /**
     * @param {!Function} constructor
     * @return {!CustomElementDefinition|undefined}
     */
    constructorToDefinition(constructor) {
      return this._constructorToDefinition.get(constructor);
    }

    /**
     * @param {!function(!Node)} listener
     */
    addPatch(listener) {
      this._hasPatches = true;
      this._patches.push(listener);
    }

    /**
     * @param {!Node} node
     */
    patchTree(node) {
      if (!this._hasPatches) return;

      walkDeepDescendantElements(node, element => this.patch(element));
    }

    /**
     * @param {!Node} node
     */
    patch(node) {
      if (!this._hasPatches) return;

      if (node.__CE_patched) return;
      node.__CE_patched = true;

      for (let i = 0; i < this._patches.length; i++) {
        this._patches[i](node);
      }
    }

    /**
     * @param {!Node} root
     */
    connectTree(root) {
      const elements = [];

      walkDeepDescendantElements(root, element => elements.push(element));

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element.__CE_state === CustomElementState.custom) {
          this.connectedCallback(element);
        } else {
          this.upgradeElement(element);
        }
      }
    }

    /**
     * @param {!Node} root
     */
    disconnectTree(root) {
      const elements = [];

      walkDeepDescendantElements(root, element => elements.push(element));

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element.__CE_state === CustomElementState.custom) {
          this.disconnectedCallback(element);
        }
      }
    }

    /**
     * Upgrades all uncustomized custom elements at and below a root node for
     * which there is a definition. When custom element reaction callbacks are
     * assumed to be called synchronously (which, by the current DOM / HTML spec
     * definitions, they are *not*), callbacks for both elements customized
     * synchronously by the parser and elements being upgraded occur in the same
     * relative order.
     *
     * NOTE: This function, when used to simulate the construction of a tree that
     * is already created but not customized (i.e. by the parser), does *not*
     * prevent the element from reading the 'final' (true) state of the tree. For
     * example, the element, during truly synchronous parsing / construction would
     * see that it contains no children as they have not yet been inserted.
     * However, this function does not modify the tree, the element will
     * (incorrectly) have children. Additionally, self-modification restrictions
     * for custom element constructors imposed by the DOM spec are *not* enforced.
     *
     *
     * The following nested list shows the steps extending down from the HTML
     * spec's parsing section that cause elements to be synchronously created and
     * upgraded:
     *
     * The "in body" insertion mode:
     * https://html.spec.whatwg.org/multipage/syntax.html#parsing-main-inbody
     * - Switch on token:
     *   .. other cases ..
     *   -> Any other start tag
     *      - [Insert an HTML element](below) for the token.
     *
     * Insert an HTML element:
     * https://html.spec.whatwg.org/multipage/syntax.html#insert-an-html-element
     * - Insert a foreign element for the token in the HTML namespace:
     *   https://html.spec.whatwg.org/multipage/syntax.html#insert-a-foreign-element
     *   - Create an element for a token:
     *     https://html.spec.whatwg.org/multipage/syntax.html#create-an-element-for-the-token
     *     - Will execute script flag is true?
     *       - (Element queue pushed to the custom element reactions stack.)
     *     - Create an element:
     *       https://dom.spec.whatwg.org/#concept-create-element
     *       - Sync CE flag is true?
     *         - Constructor called.
     *         - Self-modification restrictions enforced.
     *       - Sync CE flag is false?
     *         - (Upgrade reaction enqueued.)
     *     - Attributes appended to element.
     *       (`attributeChangedCallback` reactions enqueued.)
     *     - Will execute script flag is true?
     *       - (Element queue popped from the custom element reactions stack.
     *         Reactions in the popped stack are invoked.)
     *   - (Element queue pushed to the custom element reactions stack.)
     *   - Insert the element:
     *     https://dom.spec.whatwg.org/#concept-node-insert
     *     - Shadow-including descendants are connected. During parsing
     *       construction, there are no shadow-*excluding* descendants.
     *       However, the constructor may have validly attached a shadow
     *       tree to itself and added descendants to that shadow tree.
     *       (`connectedCallback` reactions enqueued.)
     *   - (Element queue popped from the custom element reactions stack.
     *     Reactions in the popped stack are invoked.)
     *
     * @param {!Node} root
     * @param {!Set<Node>=} visitedImports
     */
    patchAndUpgradeTree(root, visitedImports = new Set()) {
      const elements = [];

      const gatherElements = element => {
        if (element.localName === 'link' && element.getAttribute('rel') === 'import') {
          // The HTML Imports polyfill sets a descendant element of the link to
          // the `import` property, specifically this is *not* a Document.
          const importNode = /** @type {?Node} */ (element.import);

          if (importNode instanceof Node && importNode.readyState === 'complete') {
            importNode.__CE_isImportDocument = true;

            // Connected links are associated with the registry.
            importNode.__CE_hasRegistry = true;
          } else {
            // If this link's import root is not available, its contents can't be
            // walked. Wait for 'load' and walk it when it's ready.
            element.addEventListener('load', () => {
              const importNode = /** @type {!Node} */ (element.import);

              if (importNode.__CE_documentLoadHandled) return;
              importNode.__CE_documentLoadHandled = true;

              importNode.__CE_isImportDocument = true;

              // Connected links are associated with the registry.
              importNode.__CE_hasRegistry = true;

              // Clone the `visitedImports` set that was populated sync during
              // the `patchAndUpgradeTree` call that caused this 'load' handler to
              // be added. Then, remove *this* link's import node so that we can
              // walk that import again, even if it was partially walked later
              // during the same `patchAndUpgradeTree` call.
              const clonedVisitedImports = new Set(visitedImports);
              visitedImports.delete(importNode);

              this.patchAndUpgradeTree(importNode, visitedImports);
            });
          }
        } else {
          elements.push(element);
        }
      };

      // `walkDeepDescendantElements` populates (and internally checks against)
      // `visitedImports` when traversing a loaded import.
      walkDeepDescendantElements(root, gatherElements, visitedImports);

      if (this._hasPatches) {
        for (let i = 0; i < elements.length; i++) {
          this.patch(elements[i]);
        }
      }

      for (let i = 0; i < elements.length; i++) {
        this.upgradeElement(elements[i]);
      }
    }

    /**
     * @param {!Element} element
     */
    upgradeElement(element) {
      const currentState = element.__CE_state;
      if (currentState !== undefined) return;

      const definition = this.localNameToDefinition(element.localName);
      if (!definition) return;

      definition.constructionStack.push(element);

      const constructor = definition.constructor;
      try {
        try {
          let result = new (constructor)();
          if (result !== element) {
            throw new Error('The custom element constructor did not produce the element being upgraded.');
          }
        } finally {
          definition.constructionStack.pop();
        }
      } catch (e) {
        element.__CE_state = CustomElementState.failed;
        throw e;
      }

      element.__CE_state = CustomElementState.custom;
      element.__CE_definition = definition;

      if (definition.attributeChangedCallback) {
        const observedAttributes = definition.observedAttributes;
        for (let i = 0; i < observedAttributes.length; i++) {
          const name = observedAttributes[i];
          const value = element.getAttribute(name);
          if (value !== null) {
            this.attributeChangedCallback(element, name, null, value, null);
          }
        }
      }

      if (isConnected(element)) {
        this.connectedCallback(element);
      }
    }

    /**
     * @param {!Element} element
     */
    connectedCallback(element) {
      const definition = element.__CE_definition;
      if (definition.connectedCallback) {
        definition.connectedCallback.call(element);
      }
    }

    /**
     * @param {!Element} element
     */
    disconnectedCallback(element) {
      const definition = element.__CE_definition;
      if (definition.disconnectedCallback) {
        definition.disconnectedCallback.call(element);
      }
    }

    /**
     * @param {!Element} element
     * @param {string} name
     * @param {?string} oldValue
     * @param {?string} newValue
     * @param {?string} namespace
     */
    attributeChangedCallback(element, name, oldValue, newValue, namespace) {
      const definition = element.__CE_definition;
      if (
        definition.attributeChangedCallback &&
        definition.observedAttributes.indexOf(name) > -1
      ) {
        definition.attributeChangedCallback.call(element, name, oldValue, newValue, namespace);
      }
    }
  }

  class DocumentConstructionObserver {
    constructor(internals, doc) {
      /**
       * @type {!CustomElementInternals}
       */
      this._internals = internals;

      /**
       * @type {!Document}
       */
      this._document = doc;

      /**
       * @type {MutationObserver|undefined}
       */
      this._observer = undefined;


      // Simulate tree construction for all currently accessible nodes in the
      // document.
      this._internals.patchAndUpgradeTree(this._document);

      if (this._document.readyState === 'loading') {
        this._observer = new MutationObserver(this._handleMutations.bind(this));

        // Nodes created by the parser are given to the observer *before* the next
        // task runs. Inline scripts are run in a new task. This means that the
        // observer will be able to handle the newly parsed nodes before the inline
        // script is run.
        this._observer.observe(this._document, {
          childList: true,
          subtree: true,
        });
      }
    }

    disconnect() {
      if (this._observer) {
        this._observer.disconnect();
      }
    }

    /**
     * @param {!Array<!MutationRecord>} mutations
     */
    _handleMutations(mutations) {
      // Once the document's `readyState` is 'interactive' or 'complete', all new
      // nodes created within that document will be the result of script and
      // should be handled by patching.
      const readyState = this._document.readyState;
      if (readyState === 'interactive' || readyState === 'complete') {
        this.disconnect();
      }

      for (let i = 0; i < mutations.length; i++) {
        const addedNodes = mutations[i].addedNodes;
        for (let j = 0; j < addedNodes.length; j++) {
          const node = addedNodes[j];
          this._internals.patchAndUpgradeTree(node);
        }
      }
    }
  }

  /**
   * @template T
   */
  class Deferred {
    constructor() {
      /**
       * @private
       * @type {T|undefined}
       */
      this._value = undefined;

      /**
       * @private
       * @type {Function|undefined}
       */
      this._resolve = undefined;

      /**
       * @private
       * @type {!Promise<T>}
       */
      this._promise = new Promise(resolve => {
        this._resolve = resolve;

        if (this._value) {
          resolve(this._value);
        }
      });
    }

    /**
     * @param {T} value
     */
    resolve(value) {
      if (this._value) {
        throw new Error('Already resolved.');
      }

      this._value = value;

      if (this._resolve) {
        this._resolve(value);
      }
    }

    /**
     * @return {!Promise<T>}
     */
    toPromise() {
      return this._promise;
    }
  }

  /**
   * @unrestricted
   */
  class CustomElementRegistry {

    /**
     * @param {!CustomElementInternals} internals
     */
    constructor(internals) {
      /**
       * @private
       * @type {boolean}
       */
      this._elementDefinitionIsRunning = false;

      /**
       * @private
       * @type {!CustomElementInternals}
       */
      this._internals = internals;

      /**
       * @private
       * @type {!Map<string, !Deferred<undefined>>}
       */
      this._whenDefinedDeferred = new Map();

      /**
       * The default flush callback triggers the document walk synchronously.
       * @private
       * @type {!Function}
       */
      this._flushCallback = fn => fn();

      /**
       * @private
       * @type {boolean}
       */
      this._flushPending = false;

      /**
       * @private
       * @type {!Array<string>}
       */
      this._unflushedLocalNames = [];

      /**
       * @private
       * @type {!DocumentConstructionObserver}
       */
      this._documentConstructionObserver = new DocumentConstructionObserver(internals, document);
    }

    /**
     * @param {string} localName
     * @param {!Function} constructor
     */
    define(localName, constructor) {
      if (!(constructor instanceof Function)) {
        throw new TypeError('Custom element constructors must be functions.');
      }

      if (!isValidCustomElementName(localName)) {
        throw new SyntaxError(`The element name '${localName}' is not valid.`);
      }

      if (this._internals.localNameToDefinition(localName)) {
        throw new Error(`A custom element with name '${localName}' has already been defined.`);
      }

      if (this._elementDefinitionIsRunning) {
        throw new Error('A custom element is already being defined.');
      }
      this._elementDefinitionIsRunning = true;

      let connectedCallback;
      let disconnectedCallback;
      let adoptedCallback;
      let attributeChangedCallback;
      let observedAttributes;
      try {
        /** @type {!Object} */
        const prototype = constructor.prototype;
        if (!(prototype instanceof Object)) {
          throw new TypeError('The custom element constructor\'s prototype is not an object.');
        }

        function getCallback(name) {
          const callbackValue = prototype[name];
          if (callbackValue !== undefined && !(callbackValue instanceof Function)) {
            throw new Error(`The '${name}' callback must be a function.`);
          }
          return callbackValue;
        }

        connectedCallback = getCallback('connectedCallback');
        disconnectedCallback = getCallback('disconnectedCallback');
        adoptedCallback = getCallback('adoptedCallback');
        attributeChangedCallback = getCallback('attributeChangedCallback');
        observedAttributes = constructor['observedAttributes'] || [];
      } catch (e) {
        return;
      } finally {
        this._elementDefinitionIsRunning = false;
      }

      const definition = {
        localName,
        constructor,
        connectedCallback,
        disconnectedCallback,
        adoptedCallback,
        attributeChangedCallback,
        observedAttributes,
        constructionStack: [],
      };

      this._internals.setDefinition(localName, definition);

      this._unflushedLocalNames.push(localName);

      // If we've already called the flush callback and it hasn't called back yet,
      // don't call it again.
      if (!this._flushPending) {
        this._flushPending = true;
        this._flushCallback(() => this._flush());
      }
    }

    _flush() {
      // If no new definitions were defined, don't attempt to flush. This could
      // happen if a flush callback keeps the function it is given and calls it
      // multiple times.
      if (this._flushPending === false) return;

      this._flushPending = false;
      this._internals.patchAndUpgradeTree(document);

      while (this._unflushedLocalNames.length > 0) {
        const localName = this._unflushedLocalNames.shift();
        const deferred = this._whenDefinedDeferred.get(localName);
        if (deferred) {
          deferred.resolve(undefined);
        }
      }
    }

    /**
     * @param {string} localName
     * @return {Function|undefined}
     */
    get(localName) {
      const definition = this._internals.localNameToDefinition(localName);
      if (definition) {
        return definition.constructor;
      }

      return undefined;
    }

    /**
     * @param {string} localName
     * @return {!Promise<undefined>}
     */
    whenDefined(localName) {
      if (!isValidCustomElementName(localName)) {
        return Promise.reject(new SyntaxError(`'${localName}' is not a valid custom element name.`));
      }

      const prior = this._whenDefinedDeferred.get(localName);
      if (prior) {
        return prior.toPromise();
      }

      const deferred = new Deferred();
      this._whenDefinedDeferred.set(localName, deferred);

      const definition = this._internals.localNameToDefinition(localName);
      // Resolve immediately only if the given local name has a definition *and*
      // the full document walk to upgrade elements with that local name has
      // already happened.
      if (definition && this._unflushedLocalNames.indexOf(localName) === -1) {
        deferred.resolve(undefined);
      }

      return deferred.toPromise();
    }

    polyfillWrapFlushCallback(outer) {
      this._documentConstructionObserver.disconnect();
      const inner = this._flushCallback;
      this._flushCallback = flush => outer(() => inner(flush));
    }
  }

  // Closure compiler exports.
  window['CustomElementRegistry'] = CustomElementRegistry;
  CustomElementRegistry.prototype['define'] = CustomElementRegistry.prototype.define;
  CustomElementRegistry.prototype['get'] = CustomElementRegistry.prototype.get;
  CustomElementRegistry.prototype['whenDefined'] = CustomElementRegistry.prototype.whenDefined;
  CustomElementRegistry.prototype['polyfillWrapFlushCallback'] = CustomElementRegistry.prototype.polyfillWrapFlushCallback;

  var Native = {
    Document_createElement: window.Document.prototype.createElement,
    Document_createElementNS: window.Document.prototype.createElementNS,
    Document_importNode: window.Document.prototype.importNode,
    Document_prepend: window.Document.prototype['prepend'],
    Document_append: window.Document.prototype['append'],
    Node_cloneNode: window.Node.prototype.cloneNode,
    Node_appendChild: window.Node.prototype.appendChild,
    Node_insertBefore: window.Node.prototype.insertBefore,
    Node_removeChild: window.Node.prototype.removeChild,
    Node_replaceChild: window.Node.prototype.replaceChild,
    Node_textContent: Object.getOwnPropertyDescriptor(window.Node.prototype, 'textContent'),
    Element_attachShadow: window.Element.prototype['attachShadow'],
    Element_innerHTML: Object.getOwnPropertyDescriptor(window.Element.prototype, 'innerHTML'),
    Element_getAttribute: window.Element.prototype.getAttribute,
    Element_setAttribute: window.Element.prototype.setAttribute,
    Element_removeAttribute: window.Element.prototype.removeAttribute,
    Element_getAttributeNS: window.Element.prototype.getAttributeNS,
    Element_setAttributeNS: window.Element.prototype.setAttributeNS,
    Element_removeAttributeNS: window.Element.prototype.removeAttributeNS,
    Element_insertAdjacentElement: window.Element.prototype['insertAdjacentElement'],
    Element_prepend: window.Element.prototype['prepend'],
    Element_append: window.Element.prototype['append'],
    Element_before: window.Element.prototype['before'],
    Element_after: window.Element.prototype['after'],
    Element_replaceWith: window.Element.prototype['replaceWith'],
    Element_remove: window.Element.prototype['remove'],
    HTMLElement: window.HTMLElement,
    HTMLElement_innerHTML: Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'innerHTML'),
    HTMLElement_insertAdjacentElement: window.HTMLElement.prototype['insertAdjacentElement'],
  };

  /**
   * This class exists only to work around Closure's lack of a way to describe
   * singletons. It represents the 'already constructed marker' used in custom
   * element construction stacks.
   *
   * https://html.spec.whatwg.org/#concept-already-constructed-marker
   */
  class AlreadyConstructedMarker {}

  var AlreadyConstructedMarker$1 = new AlreadyConstructedMarker();

  /**
   * @param {!CustomElementInternals} internals
   */
  var PatchHTMLElement = function(internals) {
    window['HTMLElement'] = (function() {
      /**
       * @type {function(new: HTMLElement): !HTMLElement}
       */
      function HTMLElement() {
        // This should really be `new.target` but `new.target` can't be emulated
        // in ES5. Assuming the user keeps the default value of the constructor's
        // prototype's `constructor` property, this is equivalent.
        /** @type {!Function} */
        const constructor = this.constructor;

        const definition = internals.constructorToDefinition(constructor);
        if (!definition) {
          throw new Error('The custom element being constructed was not registered with `customElements`.');
        }

        const constructionStack = definition.constructionStack;

        if (constructionStack.length === 0) {
          const element = Native.Document_createElement.call(document, definition.localName);
          Object.setPrototypeOf(element, constructor.prototype);
          element.__CE_state = CustomElementState.custom;
          element.__CE_definition = definition;
          internals.patch(element);
          return element;
        }

        const lastIndex = constructionStack.length - 1;
        const element = constructionStack[lastIndex];
        if (element === AlreadyConstructedMarker$1) {
          throw new Error('The HTMLElement constructor was either called reentrantly for this constructor or called multiple times.');
        }
        constructionStack[lastIndex] = AlreadyConstructedMarker$1;

        Object.setPrototypeOf(element, constructor.prototype);
        internals.patch(/** @type {!HTMLElement} */ (element));

        return element;
      }

      HTMLElement.prototype = Native.HTMLElement.prototype;

      return HTMLElement;
    })();
  };

  /**
   * @param {!CustomElementInternals} internals
   * @param {!Object} destination
   * @param {!ParentNodeNativeMethods} builtIn
   */
  var PatchParentNode = function(internals, destination, builtIn) {
    /**
     * @param {...(!Node|string)} nodes
     */
    destination['prepend'] = function(...nodes) {
      // TODO: Fix this for when one of `nodes` is a DocumentFragment!
      const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
        // DocumentFragments are not connected and will not be added to the list.
        return node instanceof Node && isConnected(node);
      }));

      builtIn.prepend.apply(this, nodes);

      for (let i = 0; i < connectedBefore.length; i++) {
        internals.disconnectTree(connectedBefore[i]);
      }

      if (isConnected(this)) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (node instanceof Element) {
            internals.connectTree(node);
          }
        }
      }
    };

    /**
     * @param {...(!Node|string)} nodes
     */
    destination['append'] = function(...nodes) {
      // TODO: Fix this for when one of `nodes` is a DocumentFragment!
      const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
        // DocumentFragments are not connected and will not be added to the list.
        return node instanceof Node && isConnected(node);
      }));

      builtIn.append.apply(this, nodes);

      for (let i = 0; i < connectedBefore.length; i++) {
        internals.disconnectTree(connectedBefore[i]);
      }

      if (isConnected(this)) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (node instanceof Element) {
            internals.connectTree(node);
          }
        }
      }
    };
  };

  /**
   * @param {!CustomElementInternals} internals
   */
  var PatchDocument = function(internals) {
    setPropertyUnchecked(Document.prototype, 'createElement',
      /**
       * @this {Document}
       * @param {string} localName
       * @return {!Element}
       */
      function(localName) {
        // Only create custom elements if this document is associated with the registry.
        if (this.__CE_hasRegistry) {
          const definition = internals.localNameToDefinition(localName);
          if (definition) {
            return new (definition.constructor)();
          }
        }

        const result = /** @type {!Element} */
          (Native.Document_createElement.call(this, localName));
        internals.patch(result);
        return result;
      });

    setPropertyUnchecked(Document.prototype, 'importNode',
      /**
       * @this {Document}
       * @param {!Node} node
       * @param {boolean=} deep
       * @return {!Node}
       */
      function(node, deep) {
        const clone = Native.Document_importNode.call(this, node, deep);
        // Only create custom elements if this document is associated with the registry.
        if (!this.__CE_hasRegistry) {
          internals.patchTree(clone);
        } else {
          internals.patchAndUpgradeTree(clone);
        }
        return clone;
      });

    const NS_HTML = "http://www.w3.org/1999/xhtml";

    setPropertyUnchecked(Document.prototype, 'createElementNS',
      /**
       * @this {Document}
       * @param {?string} namespace
       * @param {string} localName
       * @return {!Element}
       */
      function(namespace, localName) {
        // Only create custom elements if this document is associated with the registry.
        if (this.__CE_hasRegistry && (namespace === null || namespace === NS_HTML)) {
          const definition = internals.localNameToDefinition(localName);
          if (definition) {
            return new (definition.constructor)();
          }
        }

        const result = /** @type {!Element} */
          (Native.Document_createElementNS.call(this, namespace, localName));
        internals.patch(result);
        return result;
      });

    PatchParentNode(internals, Document.prototype, {
      prepend: Native.Document_prepend,
      append: Native.Document_append,
    });
  };

  /**
   * @param {!CustomElementInternals} internals
   */
  var PatchNode = function(internals) {
    // `Node#nodeValue` is implemented on `Attr`.
    // `Node#textContent` is implemented on `Attr`, `Element`.

    setPropertyUnchecked(Node.prototype, 'insertBefore',
      /**
       * @this {Node}
       * @param {!Node} node
       * @param {?Node} refNode
       * @return {!Node}
       */
      function(node, refNode) {
        if (node instanceof DocumentFragment) {
          const insertedNodes = Array.prototype.slice.apply(node.childNodes);
          const nativeResult = Native.Node_insertBefore.call(this, node, refNode);

          // DocumentFragments can't be connected, so `disconnectTree` will never
          // need to be called on a DocumentFragment's children after inserting it.

          if (isConnected(this)) {
            for (let i = 0; i < insertedNodes.length; i++) {
              internals.connectTree(insertedNodes[i]);
            }
          }

          return nativeResult;
        }

        const nodeWasConnected = isConnected(node);
        const nativeResult = Native.Node_insertBefore.call(this, node, refNode);

        if (nodeWasConnected) {
          internals.disconnectTree(node);
        }

        if (isConnected(this)) {
          internals.connectTree(node);
        }

        return nativeResult;
      });

    setPropertyUnchecked(Node.prototype, 'appendChild',
      /**
       * @this {Node}
       * @param {!Node} node
       * @return {!Node}
       */
      function(node) {
        if (node instanceof DocumentFragment) {
          const insertedNodes = Array.prototype.slice.apply(node.childNodes);
          const nativeResult = Native.Node_appendChild.call(this, node);

          // DocumentFragments can't be connected, so `disconnectTree` will never
          // need to be called on a DocumentFragment's children after inserting it.

          if (isConnected(this)) {
            for (let i = 0; i < insertedNodes.length; i++) {
              internals.connectTree(insertedNodes[i]);
            }
          }

          return nativeResult;
        }

        const nodeWasConnected = isConnected(node);
        const nativeResult = Native.Node_appendChild.call(this, node);

        if (nodeWasConnected) {
          internals.disconnectTree(node);
        }

        if (isConnected(this)) {
          internals.connectTree(node);
        }

        return nativeResult;
      });

    setPropertyUnchecked(Node.prototype, 'cloneNode',
      /**
       * @this {Node}
       * @param {boolean=} deep
       * @return {!Node}
       */
      function(deep) {
        const clone = Native.Node_cloneNode.call(this, deep);
        // Only create custom elements if this element's owner document is
        // associated with the registry.
        if (!this.ownerDocument.__CE_hasRegistry) {
          internals.patchTree(clone);
        } else {
          internals.patchAndUpgradeTree(clone);
        }
        return clone;
      });

    setPropertyUnchecked(Node.prototype, 'removeChild',
      /**
       * @this {Node}
       * @param {!Node} node
       * @return {!Node}
       */
      function(node) {
        const nodeWasConnected = isConnected(node);
        const nativeResult = Native.Node_removeChild.call(this, node);

        if (nodeWasConnected) {
          internals.disconnectTree(node);
        }

        return nativeResult;
      });

    setPropertyUnchecked(Node.prototype, 'replaceChild',
      /**
       * @this {Node}
       * @param {!Node} nodeToInsert
       * @param {!Node} nodeToRemove
       * @return {!Node}
       */
      function(nodeToInsert, nodeToRemove) {
        if (nodeToInsert instanceof DocumentFragment) {
          const insertedNodes = Array.prototype.slice.apply(nodeToInsert.childNodes);
          const nativeResult = Native.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);

          // DocumentFragments can't be connected, so `disconnectTree` will never
          // need to be called on a DocumentFragment's children after inserting it.

          if (isConnected(this)) {
            internals.disconnectTree(nodeToRemove);
            for (let i = 0; i < insertedNodes.length; i++) {
              internals.connectTree(insertedNodes[i]);
            }
          }

          return nativeResult;
        }

        const nodeToInsertWasConnected = isConnected(nodeToInsert);
        const nativeResult = Native.Node_replaceChild.call(this, nodeToInsert, nodeToRemove);
        const thisIsConnected = isConnected(this);

        if (thisIsConnected) {
          internals.disconnectTree(nodeToRemove);
        }

        if (nodeToInsertWasConnected) {
          internals.disconnectTree(nodeToInsert);
        }

        if (thisIsConnected) {
          internals.connectTree(nodeToInsert);
        }

        return nativeResult;
      });


    function patch_textContent(destination, baseDescriptor) {
      Object.defineProperty(destination, 'textContent', {
        enumerable: baseDescriptor.enumerable,
        configurable: true,
        get: baseDescriptor.get,
        set: /** @this {Node} */ function(assignedValue) {
          // If this is a text node then there are no nodes to disconnect.
          if (this.nodeType === Node.TEXT_NODE) {
            baseDescriptor.set.call(this, assignedValue);
            return;
          }

          let removedNodes = undefined;
          // Checking for `firstChild` is faster than reading `childNodes.length`
          // to compare with 0.
          if (this.firstChild) {
            // Using `childNodes` is faster than `children`, even though we only
            // care about elements.
            const childNodes = this.childNodes;
            const childNodesLength = childNodes.length;
            if (childNodesLength > 0 && isConnected(this)) {
              // Copying an array by iterating is faster than using slice.
              removedNodes = new Array(childNodesLength);
              for (let i = 0; i < childNodesLength; i++) {
                removedNodes[i] = childNodes[i];
              }
            }
          }

          baseDescriptor.set.call(this, assignedValue);

          if (removedNodes) {
            for (let i = 0; i < removedNodes.length; i++) {
              internals.disconnectTree(removedNodes[i]);
            }
          }
        },
      });
    }

    if (Native.Node_textContent && Native.Node_textContent.get) {
      patch_textContent(Node.prototype, Native.Node_textContent);
    } else {
      internals.addPatch(function(element) {
        patch_textContent(element, {
          enumerable: true,
          configurable: true,
          // NOTE: This implementation of the `textContent` getter assumes that
          // text nodes' `textContent` getter will not be patched.
          get: /** @this {Node} */ function() {
            /** @type {!Array<string>} */
            const parts = [];

            for (let i = 0; i < this.childNodes.length; i++) {
              parts.push(this.childNodes[i].textContent);
            }

            return parts.join('');
          },
          set: /** @this {Node} */ function(assignedValue) {
            while (this.firstChild) {
              Native.Node_removeChild.call(this, this.firstChild);
            }
            Native.Node_appendChild.call(this, document.createTextNode(assignedValue));
          },
        });
      });
    }
  };

  /**
   * @param {!CustomElementInternals} internals
   * @param {!Object} destination
   * @param {!ChildNodeNativeMethods} builtIn
   */
  var PatchChildNode = function(internals, destination, builtIn) {
    /**
     * @param {...(!Node|string)} nodes
     */
    destination['before'] = function(...nodes) {
      // TODO: Fix this for when one of `nodes` is a DocumentFragment!
      const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
        // DocumentFragments are not connected and will not be added to the list.
        return node instanceof Node && isConnected(node);
      }));

      builtIn.before.apply(this, nodes);

      for (let i = 0; i < connectedBefore.length; i++) {
        internals.disconnectTree(connectedBefore[i]);
      }

      if (isConnected(this)) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (node instanceof Element) {
            internals.connectTree(node);
          }
        }
      }
    };

    /**
     * @param {...(!Node|string)} nodes
     */
    destination['after'] = function(...nodes) {
      // TODO: Fix this for when one of `nodes` is a DocumentFragment!
      const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
        // DocumentFragments are not connected and will not be added to the list.
        return node instanceof Node && isConnected(node);
      }));

      builtIn.after.apply(this, nodes);

      for (let i = 0; i < connectedBefore.length; i++) {
        internals.disconnectTree(connectedBefore[i]);
      }

      if (isConnected(this)) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (node instanceof Element) {
            internals.connectTree(node);
          }
        }
      }
    };

    /**
     * @param {...(!Node|string)} nodes
     */
    destination['replaceWith'] = function(...nodes) {
      // TODO: Fix this for when one of `nodes` is a DocumentFragment!
      const connectedBefore = /** @type {!Array<!Node>} */ (nodes.filter(node => {
        // DocumentFragments are not connected and will not be added to the list.
        return node instanceof Node && isConnected(node);
      }));

      const wasConnected = isConnected(this);

      builtIn.replaceWith.apply(this, nodes);

      for (let i = 0; i < connectedBefore.length; i++) {
        internals.disconnectTree(connectedBefore[i]);
      }

      if (wasConnected) {
        internals.disconnectTree(this);
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (node instanceof Element) {
            internals.connectTree(node);
          }
        }
      }
    };

    destination['remove'] = function() {
      const wasConnected = isConnected(this);

      builtIn.remove.call(this);

      if (wasConnected) {
        internals.disconnectTree(this);
      }
    };
  };

  /**
   * @param {!CustomElementInternals} internals
   */
  var PatchElement = function(internals) {
    if (Native.Element_attachShadow) {
      setPropertyUnchecked(Element.prototype, 'attachShadow',
        /**
         * @this {Element}
         * @param {!{mode: string}} init
         * @return {ShadowRoot}
         */
        function(init) {
          const shadowRoot = Native.Element_attachShadow.call(this, init);
          this.__CE_shadowRoot = shadowRoot;
          return shadowRoot;
        });
    } else {
      console.warn('Custom Elements: `Element#attachShadow` was not patched.');
    }


    function patch_innerHTML(destination, baseDescriptor) {
      Object.defineProperty(destination, 'innerHTML', {
        enumerable: baseDescriptor.enumerable,
        configurable: true,
        get: baseDescriptor.get,
        set: /** @this {Element} */ function(htmlString) {
          const isConnected$$1 = isConnected(this);

          // NOTE: In IE11, when using the native `innerHTML` setter, all nodes
          // that were previously descendants of the context element have all of
          // their children removed as part of the set - the entire subtree is
          // 'disassembled'. This work around walks the subtree *before* using the
          // native setter.
          /** @type {!Array<!Element>|undefined} */
          let removedElements = undefined;
          if (isConnected$$1) {
            removedElements = [];
            walkDeepDescendantElements(this, element => {
              if (element !== this) {
                removedElements.push(element);
              }
            });
          }

          baseDescriptor.set.call(this, htmlString);

          if (removedElements) {
            for (let i = 0; i < removedElements.length; i++) {
              const element = removedElements[i];
              if (element.__CE_state === CustomElementState.custom) {
                internals.disconnectedCallback(element);
              }
            }
          }

          // Only create custom elements if this element's owner document is
          // associated with the registry.
          if (!this.ownerDocument.__CE_hasRegistry) {
            internals.patchTree(this);
          } else {
            internals.patchAndUpgradeTree(this);
          }
          return htmlString;
        },
      });
    }

    if (Native.Element_innerHTML && Native.Element_innerHTML.get) {
      patch_innerHTML(Element.prototype, Native.Element_innerHTML);
    } else if (Native.HTMLElement_innerHTML && Native.HTMLElement_innerHTML.get) {
      patch_innerHTML(HTMLElement.prototype, Native.HTMLElement_innerHTML);
    } else {

      /** @type {HTMLDivElement} */
      const rawDiv = Native.Document_createElement.call(document, 'div');

      internals.addPatch(function(element) {
        patch_innerHTML(element, {
          enumerable: true,
          configurable: true,
          // Implements getting `innerHTML` by performing an unpatched `cloneNode`
          // of the element and returning the resulting element's `innerHTML`.
          // TODO: Is this too expensive?
          get: /** @this {Element} */ function() {
            return Native.Node_cloneNode.call(this, true).innerHTML;
          },
          // Implements setting `innerHTML` by creating an unpatched element,
          // setting `innerHTML` of that element and replacing the target
          // element's children with those of the unpatched element.
          set: /** @this {Element} */ function(assignedValue) {
            // NOTE: re-route to `content` for `template` elements.
            // We need to do this because `template.appendChild` does not
            // route into `template.content`.
            /** @type {!Node} */
            const content = this.localName === 'template' ? (/** @type {!HTMLTemplateElement} */ (this)).content : this;
            rawDiv.innerHTML = assignedValue;

            while (content.childNodes.length > 0) {
              Native.Node_removeChild.call(content, content.childNodes[0]);
            }
            while (rawDiv.childNodes.length > 0) {
              Native.Node_appendChild.call(content, rawDiv.childNodes[0]);
            }
          },
        });
      });
    }


    setPropertyUnchecked(Element.prototype, 'setAttribute',
      /**
       * @this {Element}
       * @param {string} name
       * @param {string} newValue
       */
      function(name, newValue) {
        // Fast path for non-custom elements.
        if (this.__CE_state !== CustomElementState.custom) {
          return Native.Element_setAttribute.call(this, name, newValue);
        }

        const oldValue = Native.Element_getAttribute.call(this, name);
        Native.Element_setAttribute.call(this, name, newValue);
        newValue = Native.Element_getAttribute.call(this, name);
        internals.attributeChangedCallback(this, name, oldValue, newValue, null);
      });

    setPropertyUnchecked(Element.prototype, 'setAttributeNS',
      /**
       * @this {Element}
       * @param {?string} namespace
       * @param {string} name
       * @param {string} newValue
       */
      function(namespace, name, newValue) {
        // Fast path for non-custom elements.
        if (this.__CE_state !== CustomElementState.custom) {
          return Native.Element_setAttributeNS.call(this, namespace, name, newValue);
        }

        const oldValue = Native.Element_getAttributeNS.call(this, namespace, name);
        Native.Element_setAttributeNS.call(this, namespace, name, newValue);
        newValue = Native.Element_getAttributeNS.call(this, namespace, name);
        internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
      });

    setPropertyUnchecked(Element.prototype, 'removeAttribute',
      /**
       * @this {Element}
       * @param {string} name
       */
      function(name) {
        // Fast path for non-custom elements.
        if (this.__CE_state !== CustomElementState.custom) {
          return Native.Element_removeAttribute.call(this, name);
        }

        const oldValue = Native.Element_getAttribute.call(this, name);
        Native.Element_removeAttribute.call(this, name);
        if (oldValue !== null) {
          internals.attributeChangedCallback(this, name, oldValue, null, null);
        }
      });

    setPropertyUnchecked(Element.prototype, 'removeAttributeNS',
      /**
       * @this {Element}
       * @param {?string} namespace
       * @param {string} name
       */
      function(namespace, name) {
        // Fast path for non-custom elements.
        if (this.__CE_state !== CustomElementState.custom) {
          return Native.Element_removeAttributeNS.call(this, namespace, name);
        }

        const oldValue = Native.Element_getAttributeNS.call(this, namespace, name);
        Native.Element_removeAttributeNS.call(this, namespace, name);
        // In older browsers, `Element#getAttributeNS` may return the empty string
        // instead of null if the attribute does not exist. For details, see;
        // https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttributeNS#Notes
        const newValue = Native.Element_getAttributeNS.call(this, namespace, name);
        if (oldValue !== newValue) {
          internals.attributeChangedCallback(this, name, oldValue, newValue, namespace);
        }
      });


    function patch_insertAdjacentElement(destination, baseMethod) {
      setPropertyUnchecked(destination, 'insertAdjacentElement',
        /**
         * @this {Element}
         * @param {string} where
         * @param {!Element} element
         * @return {?Element}
         */
        function(where, element) {
          const wasConnected = isConnected(element);
          const insertedElement = /** @type {!Element} */
            (baseMethod.call(this, where, element));

          if (wasConnected) {
            internals.disconnectTree(element);
          }

          if (isConnected(insertedElement)) {
            internals.connectTree(element);
          }
          return insertedElement;
        });
    }

    if (Native.HTMLElement_insertAdjacentElement) {
      patch_insertAdjacentElement(HTMLElement.prototype, Native.HTMLElement_insertAdjacentElement);
    } else if (Native.Element_insertAdjacentElement) {
      patch_insertAdjacentElement(Element.prototype, Native.Element_insertAdjacentElement);
    } else {
      console.warn('Custom Elements: `Element#insertAdjacentElement` was not patched.');
    }


    PatchParentNode(internals, Element.prototype, {
      prepend: Native.Element_prepend,
      append: Native.Element_append,
    });

    PatchChildNode(internals, Element.prototype, {
      before: Native.Element_before,
      after: Native.Element_after,
      replaceWith: Native.Element_replaceWith,
      remove: Native.Element_remove,
    });
  };

  /**
   * @license
   * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
   */

  const priorCustomElements = window['customElements'];

  if (!priorCustomElements ||
       priorCustomElements['forcePolyfill'] ||
       (typeof priorCustomElements['define'] != 'function') ||
       (typeof priorCustomElements['get'] != 'function')) {
    /** @type {!CustomElementInternals} */
    const internals = new CustomElementInternals();

    PatchHTMLElement(internals);
    PatchDocument(internals);
    PatchNode(internals);
    PatchElement(internals);

    // The main document is always associated with the registry.
    document.__CE_hasRegistry = true;

    /** @type {!CustomElementRegistry} */
    const customElements = new CustomElementRegistry(internals);

    Object.defineProperty(window, 'customElements', {
      configurable: true,
      enumerable: true,
      value: customElements,
    });
  }

}());
