// ====== DEFINED FOR TESTING PURPOSES ======
const updateVirtualDOM = function () {
    console.log('updateVirtualDOM()');
    return "updating...";
};
// ====== PLEASE REMOVE FUNCTION ABOVE ======

// const vdomTypes = {
//     VirtualElement: Symbol('VirtualElement'),
//     Component: Symbol('ClassComponent'),
//     ClassComponent: Symbol('ClassComponent'),
//     FunctionalComponent: Symbol('FunctionalComponent'),
//     MetaComponent: Symbol('MetaComponent')
// }

const vdomTypes = {
    VirtualElement: { virtualElement: true },
    Component: { component: true },
    ClassComponent: { classComponent: true },
    FunctionalComponent: { functionalComponent: true },
    MetaComponent: { metaComponent: true }
}


const _stuff = {};


const extendObject = function (targetObj, newObj) {
    // agnostic tool to map object properties onto another object
    let keys = Object.keys(newObj), i = keys.length;
    while (i--) {
        targetObj[keys[i]] = newObj[keys[i]];
    };
    return targetObj;
}

const createClass = function (SuperClass, ClassConstructor, protoMethods, staticMethods, options = { bindMethods: [] }) {
    ClassConstructor.prototype = Object.create(SuperClass.prototype);
    ClassConstructor.prototype.constructor = ClassConstructor;
    if (protoMethods) { extendObject(ClassConstructor.prototype, protoMethods); }
    if (staticMethods) { extendObject(ClassConstructor, staticMethods); }
    if (options.bindMethods.length > 0) {
        options.bindMethods.forEach(function (method) {
            ClassConstructor[method] = protoMethods[method].bind(ClassConstructor);
        });
    }
    ClassConstructor.extend = function (ClassConstructor, protoMethods, staticMethods, options = { bindMethods: [] }) {
        return createClass(this, ClassConstructor, protoMethods, staticMethods, options);
    };
    return ClassConstructor;
}



const declare = {
    classComponent: function (component) {
        setType(component, vdomTypes.ClassComponent);
    },
    functionalComponent: function (component) {
        setType(component, vdomTypes.FunctionalComponent);
    }
}



const MetaComponent = function (args = {
    archetype: null,
    inheritedProps: null,
    inheritedChildren: null,
    instance: null,
    virtualElement: null,
    $element: null,
    metaComponentID: null,
    __$type$__: null
}) {
    const _this = this;
    this.archetype = args.archetype;
    this.inheritedProps = args.inheritedProps;
    this.inheritedChildren = args.inheritedChildren;
    this.instance = args.instance;
    this.componentSubTree = args.componentSubTree;
    this.$element = args.$element;
    this.metaComponentID = ("" + Math.random()).slice(3);
    this.__$type$__ = args.__$type$__;
    this.name = this.archetype.name;
    this.initialized = false;
}
MetaComponent.prototype = {
    createInstance: function (props = {}) {
        if (this.__$type$__ === vdomTypes.ClassComponent) {
            let instance = new this.archetype(props);
            instance.instanceID = ("" + Math.random()).slice(3);
            return instance;
        } else if (this.__$type$__ === vdomTypes.FunctionalComponent) {
            throw new TypeError("Cannot create new instance of functional component:", this.archetype);
        }
    },
    updateComponent: function (props = {}, children = []) {
        // Updates the 'instance' property with new instance of user-defined component;
        let _this = this;
        let renderResult;
        if (this.__$type$__ === vdomTypes.FunctionalComponent) {
            this.inheritedProps = props;
            this.inheritedChildren = children;
            renderResult = this.archetype(props);
        } else if (this.__$type$__ === vdomTypes.ClassComponent) {
            this.inheritedProps = props
            this.inheritedChildren = children;
            this.instance = this.createInstance(props);
            renderResult = this.instance.render(props);
        } else throw new TypeError("MetaComponent.__$type$__ not defined");
        if (renderResult === undefined) { throw new TypeError('renderResult is undefined') }
        this.componentSubTree = renderResult;
        // console.log(this.inheritedChildren);
        if (this.componentSubTree.__$type$__ === vdomTypes.VirtualElement) {
            _this.inheritedChildren.forEach(function (child) {
                _this.componentSubTree.children.push(child);
            });
        }
        this.initialized = true;
    },
    renderComponent: function (props = {}) {
        if (!this.componentSubTree) {
            this.updateComponent(props);
        }
        return this.componentSubTree;
    }

}

// ============================================================================
const Component = function (props = {}) {
    if (props) {
        Object.keys(props).forEach((propName) => {
            this[propName] = props[propName];
        });
    }
    this.state = {};
}
Component.prototype = {
    constructor: Component,
    __$type$__: vdomTypes.ClassComponent,
    render: function () {
        return new Error('render is undefined');
    },
    update: function () {
        updateVirtualDOM();
    },
    setState: function (newState) {
        if (newState) {
            Object.keys(newState).forEach((prop) => {
                Component.state[prop] = newState[prop];
            });
        }
    }
}
// ============================================================================

const VirtualElement = function (type, props = {}, children = []) {
    this.type = type;
    this.props = props;
    this.children = children;
    this.__$type$__ = vdomTypes.VirtualElement;
}
VirtualElement.prototype.constructor = VirtualElement;

function createVirtualElement(type, props = {}, children = []) {
    if (typeof type === 'string') {
        return new VirtualElement(type, props, children);
    }
    else if (typeof type === "function") {
        if (type.prototype && type.prototype.__$type$__ && type.prototype.__$type$__ === vdomTypes.ClassComponent) {
            return new MetaComponent({ archetype: type, inheritedProps: props, inheritedChildren: children, __$type$__: vdomTypes.ClassComponent });
        } else {
            return new MetaComponent({ archetype: type, inheritedProps: props, inheritedChildren: children, __$type$__: vdomTypes.FunctionalComponent });
        }
    }
}
const $ = createVirtualElement;





const propsHaveChanged = function (newProps, oldProps) {
    if (!oldProps && newProps) return true;
    if (oldProps && !newProps) return true;
    if (oldProps && newProps) {
        const props = Object.assign({}, newProps, oldProps);
        let propKeys = Object.keys(props);
        for (let i = 0; i < propKeys.length; i++) {
            if (!newProps[propKeys[i]] || !oldProps[propKeys[i]]) return true; // should catch null/undefined
            else if (typeof newProps[propKeys[i]] !== typeof oldProps[propKeys[i]]) return true;
            else if (typeof newProps[propKeys[i]] === 'object') {
                if (propsHaveChanged(newProps[propKeys[i]], oldProps[propKeys[i]]) === true) {
                    return true;
                };
            }
            else if (newProps[propKeys[i]] != oldProps[propKeys[i]]) {
                return true;
            }
        };
    }
    return false;
}



// Special case of reconcileVirtualDOM, performed on initial render of application.
// Omits comparison to previous virtual DOM object (since it doesn't exist yet). 
function initializeVirtualDOM(rootComponent) {
    let result;
    result = initialWalk(rootComponent);

    function initialWalk(vNode) {
        // console.dir("~~~~~~~~ vNode ~~~~~~~~ \r\n", { vNode });
        let target;
        if (vNode === undefined) { console.log('!vNode'); return vNode; };
        if (vNode === null) { console.log('vNode is null'); return vNode; };

        if (!vNode.__$type$__) {
            // console.log('__$type$__ false');
            switch (typeof vNode) {
                case 'object':
                    // console.log("typeof vNode === 'object'");
                    if (Array.isArray(vNode)) {
                        // console.log("isArray === true");
                        if (vNode.length > 0) {
                            target = vNode.map(function (item) {
                                return initialWalk(item);
                            });
                        } else target = [];
                    } else {
                        // console.log("isArray === false");
                        target = {};
                        const propKeys = Object.keys(vNode);
                        for (let i = 0; i < propKeys.length; i++) {
                            target[propKeys[i]] = vNode[propKeys[i]];
                        }
                    }
                    break;
                default:
                    target = vNode;
            }
        } else {
            // console.log('__$type$__ true');
            switch (vNode.__$type$__) {
                case vdomTypes.VirtualElement:
                    // console.log('Virtual Element', vNode);
                    target = new VirtualElement(
                        initialWalk(vNode.type), // 'type' property can contain components, so we need to walk the tree;
                        initialWalk(vNode.props),
                        initialWalk(vNode.children), // each array element parsed by the walk agorithm;
                    );
                    break;
                case vdomTypes.ClassComponent:
                    // console.log('Class Component', vNode);
                    if (!vNode.componentSubTree) {
                        // console.log('instance NULL');
                        vNode.updateComponent(vNode.inheritedProps, vNode.inheritedChildren);
                        // console.log('vNode.componentSubTree', vNode.componentSubTree);
                        if (!vNode.componentSubTree) {
                            throw new TypeError('vNode instance undefined');
                        } else {
                            target = vNode;
                            target.componentSubTree = initialWalk(vNode.componentSubTree);
                        }
                    } else {
                        target = vNode;
                        target.componentSubTree = initialWalk(vNode.componentSubTree);
                    }
                    break;
                case vdomTypes.FunctionalComponent:
                    // console.log('Functional Component', vNode);
                    if (!vNode.componentSubTree) {
                        vNode.updateComponent(vNode.inheritedProps, vNode.inheritedChildren);
                        // console.log('vNode.componentSubTree', vNode.componentSubTree);
                        if (!vNode.componentSubTree) {
                            throw new TypeError('vNode instance undefined');
                        } else {
                            target = vNode;
                            target.componentSubTree = initialWalk(vNode.componentSubTree);
                        }
                    } else {
                        target = vNode;
                        target.componentSubTree = initialWalk(vNode.componentSubTree);
                    }
                    break;
                default:
                    throw new TypeError("Invalid value for property '__$type$__' on component");
            }
        }
        // console.log('Target:', target);
        return target;
    }
    return result;
}



// ==================================================================================================================
// ============================================  RECONCILE VIRTUAL DOM  =============================================
// ==================================================================================================================



function reconcileVirtualDOM(newVirtualDOM, oldVirtualDOM) {
    let result;
    if (!oldVirtualDOM) {
        console.log("!oldVirtualDOM");
        result = (newVirtualDOM);
    } else {
        result = walkAndReconcile(newVirtualDOM, oldVirtualDOM);
    }
    function walkAndReconcile(newNode, oldNode) {
        let target;
        if (newNode === undefined) { console.log("!newNode"); return newNode };
        if (newNode === null) { console.log("newNode is null"); return newNode };
        if (typeof newNode !== typeof oldNode) { return newNode; }

        if (!newNode.__$type$__) {
            // Fill out non-component value handling here...
        } else {
            switch (newNode.__$type$__) {
                case vdomTypes.VirtualElement:
                    if (newNode === oldNode) {

                    }
                    break;
                case vdomTypes.ClassComponent:
                    if (!vNode.componentSubTree) {

                    } else {

                    }
                    break;
                case vdomTypes.FunctionalComponent:
                    if (!vNode.componentSubTree) {

                        if (!vNode.componentSubTree) {

                        } else {

                        }
                    } else {

                    }
                    break;
                default:
                    throw new TypeError("Invalid value for property '__$type$__' on component");
            }

        }
        return target;



        // ========================  Helper methods for Reconciler  ========================

        function reconcileChildren(newChildren, oldChildren) {
            // determine which node's 'children' array has the most children, so we can iterate through ALL of them.
            const maxLength = (newChildren.length >= oldChildren.length ? newChildren.length : oldChildren.length);
            const result = [];
            for (let i = 0; i < maxLength; i++) {
                const child = walkAndReconcile(newNode.children[i], oldNode.children[i]);
                result.push(child);
            }
            return result;
        }

        function reconcileVirtualElements(newNode, oldNode) {
            // Input is expected to be VirtualElement instances for both arguments.
            // Check virtual elements themselves
            if (!newNode && oldNode) { return oldNode; }
            else if (!oldNode && newNode) { return newNode; }
            else if (typeof newNode !== typeof oldNode) { return newNode; }

            // Compare the 'type' properties of virtual elements
            if (typeof newNode.type !== typeof oldNode.type) { return newNode; }
            if (typeof newNode.type === 'string') {
                if (newNode.type === oldNode.type) { // the node types look the same!
                    // So let's check the props
                    let updatedNode;
                    if (propsHaveChanged(newNode.props, oldNode.props) === true) { updatedNode = newNode; }
                    // if props have changed, then we will use the new node, but we still need to compare children.
                    else { updatedNode = oldNode }

                    updatedNode.children = reconcileChildren(newNode.children, oldNode.children);
                    return updatedNode;
                }
                else { return newNode; }
            }
            if (typeof newNode.type === 'object') { // Possibly a MetaComponent object
                if (newNode.type.__$type$__) {
                    if (!oldNode.type.__$type$__ || newNode.type.__$type$__ !== oldNode.type.__$type$__) { return newNode; }
                    else { return walkAndReconcile (newNode.type, oldNode.type); }
                } else { throw new Error('Unidentified VDOM Object in VirtualElement.type'); }
            }
            if (propsHaveChanged(newNode.props, oldNode.props) === true) {
                return newNode;
            } else return oldNode;
        }
        function reconcileClassComponents(newNode, oldNode) {
            if (propsHaveChanged(newNode.inheritedProps, oldNode.inheritedProps) === true) {
                return newNode;
            } else return oldNode;
        }
        function reconcileFunctionalComponents(newNode, oldNode) {
            if (propsHaveChanged(newNode.inheritedProps, oldNode.inheritedProps) === true) {
                return newNode;
            } else return oldNode;
        }




    }

    console.log('Result:', result);
    return result;
}
// ==================================================================================================================
// ==========================================  END RECONCILE VIRTUAL DOM  ===========================================
// ==================================================================================================================

function prepareRenderScheme(reconciledVdom) {
    let result;
    result = walkSubTree(reconciledVdom);

    function walkSubTree(vNode) {
        let target;
        if (typeof vNode === 'object') {
            switch (vNode.__$type$__) {
                case vdomTypes.VirtualElement:
                    // console.log('VirtualElement');
                    target = vNode;
                    target.children = vNode.children.map(function (child) {
                        return walkSubTree(child);
                    });
                    break;
                case vdomTypes.FunctionalComponent:
                    // console.log('FunctionalComponent');
                    target = walkSubTree(vNode.componentSubTree);
                    break;
                case vdomTypes.ClassComponent:
                    // console.log('ClassComponent');
                    target = walkSubTree(vNode.componentSubTree);
                    break;
                default:
                    throw new ReferenceError('__$$type$$__ property does not exist for this virtual node');
            }
        } else {
            target = vNode;
        }
        return target;
    }
    return result;
}






// testing ================================================================================================
// testing ================================================================================================
// testing ================================================================================================


const AppFooter = function (props = {}) {
    let footerClassName = props.footerClassName ? props.footerClassName : 'app-header';
    return (
        $('div', { className: 'app-footer' }, [
            $('h1', { className: footerClassName, style: { backgroundColor: 'blue' } }, [
                "Header Text"
            ])
        ])
    );
}


class AppBody extends Component {
    constructor(props) {
        super(props);
        this.props = props;
        this.randomID = ("" + Math.random()).slice(2);
        this.item = 'item';
        this.constructorMethod1 = function () {
            return 'staticMethod1';
        }
        this.arrowFunc = () => {
            return 'boundStaticMethod';
        }
    }
    protoMethod1() {
        return 'protoMethod1';
    }
    protoMethod2() {
        return 'protoMethod2 is bound to constructore';
    }
    render() {
        let className;
        if (this.props.inheritedProp) {
            className = this.props.inheritedProp;
        } else {
            className = 'app-body';
        }
        return (
            $('div', { className: className, width: '3em' })
        )
    }
}


const AppHeader = createClass(
    Component,
    function AppHeader(props) {
        Component.apply(this, arguments);
        this.props = props;
        this.stuff = 'newStuff';
    }, {
        myMethod1: function () {
            return this.props;
        },
        render: function () {
            return (
                $('div', { className: 'main-header', style: { backgroundColor: 'blue', textAlign: 'center' } }, [
                    $('h1', { className: 'header-text', style: { color: 'pink' } }, [
                        'Application Header'
                    ])
                ])
            )
        }
    }, {
        myStaticMethod: function () {
            return this;
        }
    }, { bindMethods: ['myMethod1'] }
)
AppHeader.prototype.subClassProtoMethod = function (things) {
    return things;
}


let NewClass1 = AppHeader.extend(
    function NewClass1(props) {
        AppHeader.apply(this, arguments);
        this.props = props;
        this.data = 'data';
    }, {
        myMethod2: function () {
            return this.props;
        }
    }, {
        staticMethod2: function () {
            return this;
        }
    }, {
        bindMethods: ['myMethod2']
    }
)


class App1 extends Component {
    constructor(props) {
        super(props);
        this.numbers = 12345;
    }
    render() {
        return (
            $('div', { className: 'App1' }, [
                $(AppHeader),
                $(AppBody, { inheritedProp: 'INHERITED PROP' }, [
                    $('div', { className: 'body-content' }, [
                        $('div', { className: 'row' }, ['This is row 1']),
                        $('div', { className: 'row' }, ['This is row 2']),
                        $('div', { className: 'row' }, ['This is row 2'])
                    ]),
                ]),
                $(AppFooter, { stuff: 'stuff' }, ['text'])
            ])
        );
    }
}

class App2 extends Component {
    constructor(props) {
        super(props);
        this.numbers = 12345;
    }
    render() {
        return (
            $('div', { className: 'App2' }, [
                $(AppHeader),
                $(AppBody, { inheritedProp: 'PROP CHANGED' }, [
                    $('div', { className: 'body-content' }, [
                        $('div', { className: 'row' }, ['This is row 4']),
                        $('div', { className: 'row' }, ['This is row 5']),
                        $('div', { className: 'row' }, ['This is row 6']),
                        $('div', { className: 'row' }, ['This is row 7']),
                    ]),
                ]),
                $(AppFooter, { stuff: 'stuff' }, ['text'])
            ])
        );
    }
}


let rootComponent = $(App1);
let ROOT = document.getElementById('ROOT');

let currentVirtualDOM;
let newVirtualDOM;
let renderScheme;
let oldRenderScheme;
let newRenderScheme;

function test_initializeVirtualDOM() {
    console.log(' ----------  Initializing Virtual DOM  ----------- ');
    currentVirtualDOM = initializeVirtualDOM($(App1));
    console.log("currentVirtualDOM:\r\n");
    console.log(currentVirtualDOM);
    console.log(' --------------------  DONE  --------------------- ');
}

function test_prepareRenderScheme(virtualDomObject) {
    console.log(' ----------  Preparing Render Scheme  ------------ ');

    renderScheme = prepareRenderScheme(currentVirtualDOM);

    console.log('renderScheme:\r\n');
    console.log(renderScheme);
    console.log(' --------------------  DONE  --------------------- ');
}

function test_reconcileVirtualDOM() {
    console.log(' ----------  Preparing Render Scheme  ------------ ');
    currentVirtualDOM = initializeVirtualDOM($(App1));
    newVirtualDOM = initializeVirtualDOM($(App2));
    oldRenderScheme = prepareRenderScheme(currentVirtualDOM);
    newRenderScheme = prepareRenderScheme(newVirtualDOM);

    console.log(currentVirtualDOM);
    console.log(newVirtualDOM);


    console.log('oldRenderScheme:\r\n');
    console.log(oldRenderScheme);
    console.log('newRenderScheme:\r\n');
    console.log(newRenderScheme);

    console.log(' --------------------  DONE  --------------------- ');
}



const testBtn1 = document.createElement('button');
testBtn1Text = document.createTextNode('Initialize VDOM');
testBtn1.appendChild(testBtn1Text);
testBtn1.onclick = test_initializeVirtualDOM;
document.body.appendChild(testBtn1);

const testBtn2 = document.createElement('button');
testBtn2Text = document.createTextNode('Prepare Render Scheme');
testBtn2.appendChild(testBtn2Text);
testBtn2.onclick = test_prepareRenderScheme;
document.body.appendChild(testBtn2);

test_reconcileVirtualDOM()