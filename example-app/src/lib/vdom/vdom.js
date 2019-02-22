console.log('VDOM Library Loaded');


const createVDOM = function () {
    // let $rootNode;
    // if (typeof rootNode === 'string') {
    //     $rootNode = document.getElementById(rootNode);
    // } else {
    //     $rootNode = rootNode;
    // }


    /* Constructing the virtual DOM class to export */
    let VDOM = {}
    VDOM.$rootNode = undefined;

    VDOM.currentVirtualDOM = undefined; // To be defined after first application update

    // ==============================================================================================
    // =================================  DOM Manipulation Methods  =================================
    // ==============================================================================================

    VDOM.VirtualElement = function (type, props = {}, children = []) {
        this.type = type;
        this.props = props;
        this.children = children;
    }
    VDOM.createVirtualElement = (type, props = {}, children = []) => {
        return new VDOM.VirtualElement(type, props, children);
    }
    VDOM.isCustomProp = (name) => {
        return false // For now...
    }
    VDOM.setBooleanProp = ($target, propName, value) => {
        if (value) {
            $target.setAttribute(propName, value);
            $target[propName] = true;
        } else {
            $target[propName] = false;
        }
    }
    VDOM.removeBooleanProp = ($target, propName) => {
        $target.removeAttribute(propName);
        $target[propName] = false;
    }
    VDOM.setProp = ($target, propName, value = null) => {
        if (VDOM.isCustomProp(propName)) {
            // Temporarily set to return without setting a custom prop. In place for future development purposes.
            return;
        } else if (propName === 'events') {
            Object.keys(value).forEach((eventName) => {
                let callback = value[eventName];
                $target.addEventListener(eventName, callback);
            });
        } else if (propName === 'style') { /* Style expected to be object containing single objects for each style property */
            Object.keys(value).forEach((prop) => {
                $target.style[prop] = value[prop];
            });
        } else if (propName === 'className') { /* We use "className" to refer to the HTML "class" attribute */
            $target.setAttribute('class', value);
        } else if (typeof value === 'boolean') {
            VDOM.setBooleanProp($target, propName, value);
        } else {
            $target.setAttribute(propName, value);
        }
    }
    VDOM.removeProp = ($target, propName, value = null) => {
        if (VDOM.isCustomProp(propName)) {
            return;
        } else if (propName === 'events') {
            Object.keys(value).forEach((eventName) => {
                $target.removeEventListener(eventName);
            });
        } else if (propName === 'style') {
            Object.keys(value).forEach((prop) => {
                $target.style[prop] = null;
            });
        }
        else if (propName === 'className') {
            $target.removeAttribute('class');
        } else if (typeof value === 'boolean') {
            VDOM.removeBooleanProp($target, propName);
        }
    }
    VDOM.updateProp = ($target, propName, newValue, oldValue) => {
        if (!newValue) {
            VDOM.removeProp($target, propName, oldValue);
        } else if (!oldValue || newValue !== oldValue) {
            VDOM.setProp($target, propName, newValue);
        }
    }
    VDOM.updateProps = ($target, newProps, oldProps) => {
        // console.log('New Props: ', newProps, '| Old Props:', oldProps)
        const props = Object.assign({}, newProps, oldProps);
        Object.keys(props).forEach(propName => {
            /* Call updateProp, passing undefined props as __explicitly__ undefined values */
            VDOM.updateProp($target, propName, (newProps ? newProps[propName] : undefined), (oldProps ? oldProps[propName] : undefined));
        });
    }
    VDOM.nodeHasChanged = (vNode1, vNode2) => {
        if ((typeof vNode1 !== vNode2) || (typeof vNode1 === 'string' && vNode1 !== vNode2) || (vNode1.type !== vNode2.type)) {
            return true;
        } else {
            return false;
        }
    }
    VDOM.createNewElement = (vNode = { type: undefined, props: {}, children: [] }) => {
        const createEl = (vNode) => {
            let $element; // <-- will be conditionally defined DOM node.
            const appendChildren = ($el, children) => {
                if (!!$el && !!children) {
                    children.map((val) => {
                        let res = createEl(val);
                        return res;
                    }).forEach((child, index) => {
                        if ($el && child) {
                            $el.appendChild(child);
                        }
                    });
                }
            }
            if (typeof vNode === 'string') { // for a string, create textNode
                $element = document.createTextNode(vNode);
            } else if (vNode instanceof Node) {
                $element = vNode;
            } else if (vNode instanceof Array) { // for arrays of srings, create textNodes
                vNode.forEach((item) => {
                    createEl(item);
                });
                // } else if (typeof vNode === 'object' && vNode.prototype && 'render' in vNode.prototype) {
            } else if (vNode instanceof VDOMComponent) {
                let result = vNode.render();
                $element = document.createElement(result.type);
                VDOM.updateProps($element, result.props, null);
                appendChildren($element, result.children);
            } else if (typeof vNode === 'function') {
                // if a function is passed to 'createNewElement()'
                let funcResult = vNode();
                VDOM.createNewElement(funcResult);
            } else if (vNode === null) {
                $element = document.createTextNode('');
                createEl($element);
            }
            else {
                $element = document.createElement(vNode.type);
                if (vNode.children) {
                    appendChildren($element, vNode.children);
                }
            }
            if (vNode && vNode.props) {
                VDOM.updateProps($element, vNode.props);
            }
            return $element;
        }
        $node = createEl(vNode);
        return $node;
    }
    VDOM.isComponent = (vNode) => {
        // Test whether the value passed through a component chain is a VDOM component.
        // VDOM components expect to call the 'render' method, whereas other functions will simply be executed.
        if (vNode instanceof VDOMComponent) {
            return vNode.render(vNode);
        } else if (typeof vNode === 'function') {
            return vNode();
        }
    }
    // Main virtual DOM diffing algorithm.
    // 'newNode' and 'oldNode' represent two (potentially different) versions of the same target node.
    // If there are differences between versions, newNode will take precedence.
    // If the node was scheduled for removal from the DOM, then we expect to see
    VDOM.updateElement = ($parent, newNode, oldNode, index = 0) => {
        console.log($parent, newNode, oldNode, index);
        if (!oldNode) {             /* If reference to cached node does not exist */
            const $node = VDOM.createNewElement(newNode);
            console.log($node);
            if ($node instanceof Node) { /* In case a component or function is called, the return value should be of type Node */
                $parent.appendChild($node);
            }
        } else if (!newNode) {      /* If reference to old node exists but the new node is undefined */
            $parent.removeChild($parent.childNodes[index]);
        } else if (VDOM.nodeHasChanged(newNode, oldNode) === true) {
            $parent.replaceChild(VDOM.createNewElement(newNode), $parent.childNodes[index]);
        } else if (newNode.type) {
            /* If both versions of the target node exist
            (i.e. the node has already been created and hasn't been removed from the document) */
            VDOM.updateProps($parent.childNodes[index], newNode.props, oldNode.props);
            const newLength = newNode.children.length;
            const oldLength = oldNode.children.length;
            /* Recursively iterate through 'children' array of $parent node,
            stopping at the length of longest array, to ensure we run through each possible child.*/
            for (let i = 0; (i < newLength || i < oldLength); i++) {
                VDOM.updateElement($parent.childNodes[index], newNode.children[i], oldNode.children[i], i);
            }
        }
    };






    VDOM.v$ = function (type, props = {}, children = {}) {
        return { type, props, children };
    };

    const VDOMComponent = function (props) {
        Object.keys(props).forEach((propName) => {
            this[propName] = props[propName];
        });
        this.selfRef = this;
        if (!this.render) {
            this.render = () => {
                // To be defined in the component instance.
                // Initially returns undefined to throw an error if not overwritten.
                return new Error('ROOTComponent.render is undefined');
            }
        }
        this.update = () => {
            console.log('Root Component:', VDOM.rootComponent)
            VDOM.rootComponent.update();
        }
        this.setState = (newState) => {
            console.log('Old State:', this.state);
            if (newState) {
                Object.keys(newState).forEach((prop) => {
                    this.state[prop] = newState[prop];
                });
            }
            console.log('New State:', this.state);
        }
    }
    // createClass is a factory function that creates and returns another factory function. 
    const createClass = function (classProps = {}) {
        let ComponentClass = function (parentProps = {}) {
            let mergedProps = Object.assign({}, classProps, { parentProps: parentProps });
            return new VDOMComponent(mergedProps);
        }
        return ComponentClass;
    }
    /* Each 'normal' Component instance will be able to call their own 'update' methods,
 Which calls the UNIQUE 'update' method of the ROOT COMPONENT to generate the render tree. */
    VDOM.rootComponent = undefined;

    VDOM.setRootComponent = (rootComp) => {
        console.log('rootComp:', rootComp);
        if (!!rootComp && 'render' in rootComp) {
            rootComp.update = () => {
                console.log('==================  Updating VDOM  ==================');
                let oldVDOMTree = VDOM.currentVirtualDOM;
                let newVDOMTree = rootComp.render();
                VDOM.updateElement(VDOM.$rootNode, newVDOMTree, oldVDOMTree);
                VDOM.currentVirtualDOM = newVDOMTree;
                console.log('==================  Update Complete  =================');
            }
            VDOM.rootComponent = rootComp;

        } else {
            console.error('Invalid Root Component:', rootComp);
        }
    }

    VDOM.config = function (options = {
        rootNode: undefined,
        rootComponent: undefined,
        plugins: undefined,
        mixins: undefined,
    }) {
        if (options.rootNode) {
            if (options.rootNode instanceof Node) {
                VDOM.$rootNode = options.rootNode;
            } else throw new TypeError("Invalid argument type for 'rootNode'");
        }
        if (options.rootComponent) {
            if ('render' in options.rootComponent) {
                VDOM.setRootComponent(options.rootComponent);
            } else throw new TypeError("Invalid argument type for 'rootComponent'");
        }
    }

    return {
        VDOMComponent: VDOMComponent,
        createClass: createClass,
        createVirtualElement: VDOM.createVirtualElement,
        v$: VDOM.createVirtualElement,
        setRootComponent: VDOM.setRootComponent,
        config: VDOM.config
    };
}


 

const VDOM = createVDOM();

module.exports = VDOM;

// =============================================================================================
// =========================================  TESTING  =========================================
// =============================================================================================






