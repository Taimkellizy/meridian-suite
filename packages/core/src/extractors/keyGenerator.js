import fs from 'fs';
import nodePath from 'path';
import crypto from 'crypto';

// NOTE: Data-promoted keys (strings sourced from src/config, src/data, src/content, src/constants, etc.
// via the data-file scanner) must never be passed to generateContextAwareKey.
// They must continue using flat runtime keys where the English value is the key, exactly as documented.
// This code path (data-file scanner -> flat key) and the new code path
// (static JSX text -> extractJSX.js -> generateContextAwareKey) are separate and must stay separate.

// NOTE: if extraction is ever parallelized, this needs a write-lock or atomic merge strategy.

const KEY_MAP_PATH = nodePath.resolve(process.cwd(), '.meridian', 'key-map.json');

let keyMap = {};
let isKeyMapLoaded = false;
let namespaceAllocations = new Map();
const stemToPaths = new Map();

export const resetKeyGeneratorStateForTesting = () => {
    keyMap = {};
    isKeyMapLoaded = false;
    namespaceAllocations = new Map();
    stemToPaths.clear();
};

export const loadKeyMap = () => {
    if (isKeyMapLoaded) return;
    try {
        if (fs.existsSync(KEY_MAP_PATH)) {
            keyMap = JSON.parse(fs.readFileSync(KEY_MAP_PATH, 'utf-8'));
            for (const entry of Object.keys(keyMap)) {
                try {
                    const parsed = JSON.parse(entry);
                    if (parsed.filePath) {
                        const normalizedPath = parsed.filePath.replace(/\\/g, '/');
                        let relativeToSrc = normalizedPath;
                        const srcIndex = normalizedPath.lastIndexOf('src/');
                        if (srcIndex !== -1) {
                            relativeToSrc = normalizedPath.substring(srcIndex + 4);
                        }
                        const parts = relativeToSrc.split('/');
                        const stem = nodePath.basename(parts[parts.length - 1], nodePath.extname(parts[parts.length - 1])).toLowerCase();
                        if (!stemToPaths.has(stem)) stemToPaths.set(stem, new Set());
                        stemToPaths.get(stem).add(relativeToSrc);
                    }
                } catch (e) {}
            }
        }
    } catch (e) {
        console.warn('Failed to load key-map.json', e);
    }
    isKeyMapLoaded = true;
};

export const saveKeyMap = () => {
    try {
        const dir = nodePath.dirname(KEY_MAP_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(KEY_MAP_PATH, JSON.stringify(keyMap, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save key-map.json', e);
    }
};

const getSourceTextHash = (text) => {
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 8);
};

export const getNamespace = (filePath) => {
    if (!filePath) return 'common';
    
    const normalizedPath = filePath.replace(/\\/g, '/');
    let relativeToSrc = normalizedPath;
    const srcIndex = normalizedPath.lastIndexOf('src/');
    if (srcIndex !== -1) {
        relativeToSrc = normalizedPath.substring(srcIndex + 4);
    }
    
    const parts = relativeToSrc.split('/');
    const stem = nodePath.basename(parts[parts.length - 1], nodePath.extname(parts[parts.length - 1])).toLowerCase();
    const parentDir = parts.length > 1 ? parts[parts.length - 2].toLowerCase() : '';
    
    if (!stemToPaths.has(stem)) stemToPaths.set(stem, new Set());
    stemToPaths.get(stem).add(relativeToSrc);
    
    const pathsForStem = stemToPaths.get(stem);
    if (pathsForStem.size > 1 && parentDir) {
        return `${parentDir}_${stem}`;
    }
    
    return stem;
};

const getAstPathSignature = (path) => {
    const parts = [];
    let current = path;
    
    while (current) {
        if (current.isJSXElement()) {
            const nameNode = current.node.openingElement.name;
            let elName = 'Unknown';
            if (nameNode.type === 'JSXIdentifier') elName = nameNode.name;
            else if (nameNode.type === 'JSXMemberExpression') elName = `${nameNode.object.name}.${nameNode.property.name}`;
            
            let index = 0;
            if (current.parentPath && (current.parentPath.isJSXElement() || current.parentPath.isJSXFragment())) {
                const siblings = current.parentPath.node.children;
                if (siblings) {
                    for (const sibling of siblings) {
                        if (sibling === current.node) break;
                        if (sibling.type === 'JSXElement') {
                            const sibNameNode = sibling.openingElement.name;
                            let sibName = 'Unknown';
                            if (sibNameNode.type === 'JSXIdentifier') sibName = sibNameNode.name;
                            else if (sibNameNode.type === 'JSXMemberExpression') sibName = `${sibNameNode.object.name}.${sibNameNode.property.name}`;
                            if (sibName === elName) index++;
                        }
                    }
                }
            }
            parts.push(`${elName}/${index}`);
        } else if (current.isFunctionDeclaration() && current.node.id) {
            parts.push(current.node.id.name);
        } else if (current.isVariableDeclarator() && current.node.id && current.node.id.type === 'Identifier') {
            if (current.node.init && (current.node.init.type === 'ArrowFunctionExpression' || current.node.init.type === 'FunctionExpression')) {
                parts.push(current.node.id.name);
            }
        }
        current = current.parentPath;
    }
    
    return parts.reverse().join('/');
};

const getScope = (path, namespace) => {
    let current = path;
    let scopeName = '';
    while (current) {
        if (current.isFunctionDeclaration() && current.node.id) {
            scopeName = current.node.id.name;
            break;
        } else if (current.isVariableDeclarator() && current.node.id && current.node.id.type === 'Identifier') {
            if (current.node.init && (current.node.init.type === 'ArrowFunctionExpression' || current.node.init.type === 'FunctionExpression')) {
                scopeName = current.node.id.name;
                break;
            }
        }
        current = current.parentPath;
    }
    
    if (!scopeName) return '';
    
    scopeName = scopeName.charAt(0).toLowerCase() + scopeName.slice(1);
    
    if (scopeName.toLowerCase() === namespace.toLowerCase() || scopeName === namespace) {
        return '';
    }
    return scopeName;
};

const slugify = (text) => {
    const words = text.trim().split(/\s+/).slice(0, 4);
    let camel = words.map((w, i) => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, '');
        if (!clean) return '';
        if (i === 0) return clean.toLowerCase();
        return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    }).filter(Boolean).join('');
    return camel;
};

const getRole = (path, sourceText) => {
    const checkComments = (node) => {
        if (node && node.leadingComments) {
            for (const comment of node.leadingComments) {
                const match = comment.value.match(/i18n:\s*([a-zA-Z0-9_]+)/);
                if (match) return match[1];
            }
        }
        return null;
    };
    
    let hint = checkComments(path.node);
    if (!hint && path.parentPath && path.parentPath.isJSXElement()) {
        hint = checkComments(path.parentPath.node);
    }
    if (hint) return hint;
    
    if (path.parentPath && (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment())) {
        const siblings = path.parentPath.node.children;
        if (siblings) {
            const myIndex = siblings.indexOf(path.node);
            if (myIndex > 0) {
                for (let i = myIndex - 1; i >= 0; i--) {
                    const sibling = siblings[i];
                    if (sibling.type === 'JSXText' && sibling.value.trim() === '') {
                        continue;
                    }
                    if (sibling.type === 'JSXExpressionContainer' && sibling.expression.type === 'JSXEmptyExpression') {
                        const comments = sibling.expression.innerComments || sibling.innerComments;
                        if (comments) {
                            for (const comment of comments) {
                                const match = comment.value.match(/i18n:\s*([a-zA-Z0-9_]+)/);
                                if (match) return match[1];
                            }
                        }
                    }
                    break;
                }
            }
        }
    }
    
    if (path.isJSXAttribute() || (path.isStringLiteral() && path.parentPath.isJSXAttribute())) {
        const attrPath = path.isJSXAttribute() ? path : path.parentPath;
        const attrName = attrPath.node.name.name;
        if (attrName === 'alt') return 'alt';
        if (attrName === 'placeholder') return 'placeholder';
        if (attrName === 'aria-label') return 'ariaLabel';
        if (attrName === 'title') return 'title';
    }
    
    let elPath = path;
    while (elPath && !elPath.isJSXElement()) {
        elPath = elPath.parentPath;
    }
    
    if (elPath && elPath.isJSXElement()) {
        const nameNode = elPath.node.openingElement.name;
        if (nameNode.type === 'JSXIdentifier') {
            const elName = nameNode.name.toLowerCase();
            if (['h1', 'h2', 'h3'].includes(elName)) return elName === 'h1' ? 'title' : (elName === 'h2' ? 'subtitle' : 'heading');
            if (elName === 'p') return 'body';
            if (elName === 'button' || elName === 'a') return 'cta';
            if (elName === 'li') return 'item';
            if (elName === 'span' || elName === 'label') return 'label';
        }
    }
    
    const slug = slugify(sourceText);
    return slug || 'text';
};

export const generateContextAwareKey = (path, ctx, sourceText) => {
    loadKeyMap();

    const filePath = ctx.fileName || 'unknown.jsx';
    const sourceTextHash = getSourceTextHash(sourceText);
    const astPathSignature = getAstPathSignature(path);
    
    const identifierObj = { filePath, sourceTextHash, astPathSignature };
    const identifierStr = JSON.stringify(identifierObj);
    
    if (keyMap[identifierStr]) {
        // Idempotent: Add to allocated so it doesn't collide with new keys
        const ns = getNamespace(filePath);
        if (!namespaceAllocations.has(ns)) namespaceAllocations.set(ns, new Set());
        namespaceAllocations.get(ns).add(keyMap[identifierStr]);
        return keyMap[identifierStr];
    }
    
    const namespace = getNamespace(filePath);
    const scope = getScope(path, namespace);
    const role = getRole(path, sourceText);
    
    let baseKey = namespace;
    if (scope) baseKey += `.${scope}`;
    baseKey += `.${role}`;
    
    if (!namespaceAllocations.has(namespace)) {
        namespaceAllocations.set(namespace, new Set());
    }
    const allocated = namespaceAllocations.get(namespace);
    
    let finalKey = baseKey;
    let counter = 2;
    while (allocated.has(finalKey)) {
        finalKey = `${baseKey}${counter}`;
        counter++;
    }
    
    allocated.add(finalKey);
    keyMap[identifierStr] = finalKey;
    
    return finalKey;
};
