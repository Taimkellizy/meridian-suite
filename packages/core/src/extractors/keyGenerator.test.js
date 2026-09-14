import { extractAndTransformJSX } from '../utils/i18nExtractTransform.js';
import { resetKeyGeneratorStateForTesting, saveKeyMap } from './keyGenerator.js';
import fs from 'fs';
import nodePath from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';

test('keyGenerator test suite', async (t) => {
    t.beforeEach(() => {
        resetKeyGeneratorStateForTesting();
        const keyMapPath = nodePath.resolve(process.cwd(), '.meridian', 'key-map.json');
        if (fs.existsSync(keyMapPath)) {
            fs.unlinkSync(keyMapPath);
        }
    });

    t.afterEach(() => {
        resetKeyGeneratorStateForTesting();
        const keyMapPath = nodePath.resolve(process.cwd(), '.meridian', 'key-map.json');
        if (fs.existsSync(keyMapPath)) {
            fs.unlinkSync(keyMapPath);
        }
    });

    await t.test('handles collisions by appending a counter', () => {
        const code = `
            export default function Hero() {
                return (
                    <div>
                        <p>First paragraph</p>
                        <p>Second paragraph</p>
                    </div>
                );
            }
        `;
        const result = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        
        const keys = Array.from(result.extractedStrings.keys());
        assert(keys.includes('hero.body'), 'hero.body missing');
        assert(keys.includes('hero.body2'), 'hero.body2 missing');
        assert.equal(keys.length, 2);
    });

    await t.test('scopes collisions per-namespace', () => {
        const heroCode = `
            export default function Hero() {
                return <p>Hero text</p>;
            }
        `;
        const pricingCode = `
            export default function Pricing() {
                return <p>Pricing text</p>;
            }
        `;
        const heroResult = extractAndTransformJSX(heroCode, { fileName: 'src/components/Hero.jsx' });
        const pricingResult = extractAndTransformJSX(pricingCode, { fileName: 'src/pages/Pricing.jsx' });
        
        const heroKeys = Array.from(heroResult.extractedStrings.keys());
        const pricingKeys = Array.from(pricingResult.extractedStrings.keys());
        
        assert(heroKeys.includes('hero.body'));
        assert(pricingKeys.includes('pricing.body'));
        assert(!heroKeys.includes('hero.body2'));
        assert(!pricingKeys.includes('pricing.body2'));
    });

    await t.test('supports developer comment hint overrides', () => {
        const code = `
            export default function Header() {
                return (
                    <div>
                        {/* i18n: headline */}
                        <h1>Main Headline</h1>
                    </div>
                );
            }
        `;
        const result = extractAndTransformJSX(code, { fileName: 'src/components/Header.jsx' });
        
        const keys = Array.from(result.extractedStrings.keys());
        assert(keys.includes('header.headline'), 'Keys: ' + keys.join(', '));
    });

    await t.test('is idempotent on identical source input', () => {
        const code = `
            export default function Hero() {
                return (
                    <div>
                        <h1>Title</h1>
                        <p>Description</p>
                    </div>
                );
            }
        `;
        
        // Run 1
        const result1 = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        saveKeyMap();
        const keyMapPath = nodePath.resolve(process.cwd(), '.meridian', 'key-map.json');
        const keyMap1 = fs.readFileSync(keyMapPath, 'utf8');
        
        // Reset state
        resetKeyGeneratorStateForTesting();
        
        // Run 2
        const result2 = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        saveKeyMap();
        const keyMap2 = fs.readFileSync(keyMapPath, 'utf8');
        
        // byte-for-byte identical output
        assert.equal(result1.modifiedCode, result2.modifiedCode);
        
        // identical .meridian/key-map.json content
        assert.equal(keyMap1, keyMap2);
        
        const keys = Array.from(result2.extractedStrings.keys());
        assert(keys.includes('hero.title'));
        assert(keys.includes('hero.body'));
        assert(!keys.includes('hero.title2'));
        assert(!keys.includes('hero.body2'));
    });

    await t.test('never processes data-promoted keys through keyGenerator', () => {
        const dataRegistry = {
            "name": {
                translatable: ["name"],
                type: "config"
            }
        };
        
        const code = `
            export default function Pricing({ config }) {
                return (
                    <div>
                        <h1>Plan Name</h1>
                        <h2>{config.name}</h2>
                    </div>
                );
            }
        `;
        
        const result = extractAndTransformJSX(code, { 
            fileName: 'src/components/Pricing.jsx',
            registry: dataRegistry
        });
        
        const keys = Array.from(result.extractedStrings.keys());
        assert(keys.includes('pricing.title'));
        
        saveKeyMap();
        const keyMapPath = nodePath.resolve(process.cwd(), '.meridian', 'key-map.json');
        const keyMap = JSON.parse(fs.readFileSync(keyMapPath, 'utf8'));
        
        assert.equal(Object.keys(keyMap).length, 1);
        assert.equal(Object.values(keyMap)[0], 'pricing.title');
        
        assert.throws(() => {
            extractAndTransformJSX(code, { fileName: 'src/config/pricing.js', registry: dataRegistry });
        }, /Data-promoted keys must never be passed/);
    });
});
