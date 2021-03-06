// const removeEvent = ($target, eventType, useCapture) => {

// }
// const addEvent = ($target = undefined, eventType = undefined, handlerFunction = undefined, options = { preventDefault: false, useCapture: false, stopPropogation: false }) => {

// }

export function isCustomProp(name) {
    return false // For now...
}
export function setBooleanProp($target, propName, value) {
    if (value) {
        $target.setAttribute(propName, value);
        $target[propName] = true;
    } else {
        $target[propName] = false;
    }
}
export function removeBooleanProp($target, propName) {
    $target.removeAttribute(propName);
    $target[propName] = false;
}
export function setProp($target, propName, value = null) {
    // console.log('Set Prop:', $target.id, propName, value);
    if (isCustomProp(propName)) {
        // Temporarily set to return without setting a custom prop. In place for future development purposes.
        return;
    } else if (propName === 'events') {
        console.log('Event set:');
        console.log('Value:', value);
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
        setBooleanProp($target, propName, value);
    }
    else {
        $target.setAttribute(propName, value);
    }
}
export function removeProp($target, propName, value = null) {
    if (isCustomProp(propName)) {
        return;
    } else if (propName === 'events') {
        Object.keys(value).forEach((eventName) => {
            let callback = value[eventName]
            $target.removeEventListener(eventName, callback);
        });
    } else if (propName === 'style') {
        Object.keys(value).forEach((prop) => {
            $target.style[prop] = null;
        });
    }
    else if (propName === 'className') {
        $target.removeAttribute('class');
    } else if (typeof value === 'boolean') {
        removeBooleanProp($target, propName);
    }
}
export function updateProp($target, propName, newValue, oldValue) {
    // console.log("____ update SINGLE prop ____");

    if (!newValue) {
        removeProp($target, propName, oldValue);
    } else if (!oldValue) {
        // console.log("Old prop value is undefined");
        setProp($target, propName, newValue);
    } else if (newValue !== oldValue) {
        // Logging to see how many are set during each update;
        if (propName === "events") {
            /*
            KNOWN BUG & WORK-AROUND:

            There is currently an issue where event handler functions in old/new
            virtual DOM instances are evaluating as unequal, despite their
            contexts referring to the same Component class constructor function.
            Below is a workaround that removes the old event listener and adds the new
            one for each VDOM update cycle. This may become a performance issue as more
            event listeners are added in larger applications.

            Currently working on alternative solution that uses top-level event delegation
            at the document level for all event types. This would eliminate the need for new
            event listeners, but it doesn't solve the underlying prop-diffing error,
            so it would still add new event handler functions as props to the virutal DOM.
            These would still need to be removed on each update as a work-around until we
            find a way to maintain references to the original bound event handler functions.
            */
            if (oldValue.click && newValue.click) {
                // console.log("oldvalue:", oldValue.click);
                // console.log("newValue:", newValue.click);

                console.log(oldValue.click === newValue.click);
                console.log(oldValue.click == newValue.click);

                // vdomDebugger.data.forEach(handler => {
                //     if (handler === newValue.click) {console.log(true);}
                //     else console.log(false);
                //     if (handler === oldValue.click) {console.log(true, 'Old Handler Equal?');}
                //     else console.log(false);
                // });

            }
            let args = Array.prototype.slice.call(arguments, 0);
            console.log(args);
            // vdomDebugger.data.push(args);
            removeProp($target, propName, oldValue);
        }


        setProp($target, propName, newValue);
    }
}
export function updateProps($target, newProps, oldProps) {
    // console.log('________ updateProps ________', $target.id, $target);

    // console.log('Old Props:', oldProps);
    // console.log('New Props:', newProps);
    const props = Object.assign({}, newProps, oldProps);
    Object.keys(props).forEach(propName => {
        /* Call updateProp, passing undefined props as __explicitly__ undefined values */

        let np = (newProps && newProps[propName] ? newProps[propName] : undefined);
        let op = (oldProps && oldProps[propName] ? oldProps[propName] : undefined);

        updateProp($target, propName, np, op);

    });
}
export function createNewElement(vNode = { type: undefined, props: {}, children: [] }) => {
    console.log("Start createNewElement()");
    const createEl = (vNode) => {
        let $element; // <-- will be conditionally defined DOM node.
        const appendChildren = ($el, children) => {
            if (!!$el && children) {
                children.map((val) => {
                    let res = createEl(val);
                    return res;
                }).forEach((child, index) => {
                    if ($el && child) {
                        // console.log(`appending`, child, 'to', $el);
                        $el.appendChild(child);
                    }
                });
            }
        }
        if (typeof vNode === 'string') { // for a string, create textNode
            $element = document.createTextNode(vNode);
        } else if (vNode instanceof Node) {
            $element = vNode;
        } else if (Array.isArray(vNode) === true) { // for arrays of srings, create textNodes
            vNode.forEach((item) => {
                createEl(item);
            });
        } else if (typeof vNode === 'function') {
            // if a function is passed to 'createNewElement()'
            let funcResult = vNode();
            createNewElement(funcResult);
        } else if (vNode === null) {
            $element = document.createTextNode('');
            createEl($element);
        }
        else {
            // console.log('new node created:', vNode);
            $element = document.createElement(vNode.type);
            if (vNode.children) {
                appendChildren($element, vNode.children);
            }
        }
        if (vNode && vNode.props) {
            updateProps($element, vNode.props);
        }
        return $element;
    }
    $node = createEl(vNode);
    return $node;
}

export function nodeHasChanged(vNode1, vNode2) {
    if (typeof vNode1 !== typeof vNode2) {
        return true;
    };
    if (typeof vNode1 === 'string' && vNode1 !== vNode2) {
        return true;
    };
    if (vNode1.type !== vNode2.type) {
        return true;
    };
    return false;
}

// Main virtual DOM diffing algorithm.
// 'newNode' and 'oldNode' represent two (potentially different) versions of the same target node.
// If there are differences between versions, newNode will take precedence.
// If the node was scheduled for removal from the DOM, then we expect to see
export function updateElement($parent, newNode, oldNode, index = 0) {
    console.log(newNode);
    if (!oldNode) {             /* If reference to cached node does not exist */
        const $node = createNewElement(newNode);
        if ($node instanceof Node) { /* In case a component or function is called, the return value should be of type Node */
            $parent.appendChild($node);
        }
    } else if (!newNode) {      /* If reference to old node exists but the new node is undefined */
        $parent.removeChild($parent.childNodes[index]);
    } else if (typeof newNode === 'object' && newNode.render) {
        updateElement($parent, newNode.render(), oldNode.render(), index);
    }
    else if (nodeHasChanged(newNode, oldNode) === true) {
        $parent.replaceChild(createNewElement(newNode), $parent.childNodes[index]);
    } else if (newNode.type) {
        /* If both versions of the target node exist
        (i.e. the node has already been created and hasn't been removed from the document) */
        updateProps($parent.childNodes[index], newNode.props, oldNode.props);
        const newLength = newNode.children.length;
        const oldLength = oldNode.children.length;
        /* Recursively iterate through 'children' array of $parent node,
        stopping at the length of longest array, to ensure we run through each possible child.*/
        for (let i = 0; (i < newLength || i < oldLength); i++) {
            // console.log('BEFORE UPDATING PROPS:', 'index:', index, 'id:', $parent.childNodes[index].id,  $parent.childNodes[index].style);
            updateElement($parent.childNodes[index], newNode.children[i], oldNode.children[i], i);
            // console.log('AFTER UPDATING PROPS:', 'index:', index, 'id:', $parent.childNodes[index].id,  $parent.childNodes[index].style);
        }
    }
};


export default updateElement;
