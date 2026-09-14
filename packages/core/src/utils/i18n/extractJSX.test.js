import { extractAndTransformJSX } from '../i18nExtractTransform.js';
import { resetKeyGeneratorStateForTesting, saveKeyMap } from '../../extractors/keyGenerator.js';
import fs from 'fs';
import nodePath from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';

const wrap = (body) => `
export default function Hero() {
    return (
        <div>
${body}
        </div>
    );
}
`;

test('extractJSX test suite', async (t) => {
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

    await t.test('A1: extracts simple text run with t()', () => {
        const result = extractAndTransformJSX(wrap('            <p>Hello world</p>'), { fileName: 'src/components/Hero.jsx' });
        assert.deepEqual([...result.extractedStrings.entries()], [['hero.body', 'Hello world']]);
        assert.ok(result.modifiedCode.includes('<p>{t("hero.body")}</p>'), result.modifiedCode);
        assert.ok(result.modifiedCode.includes('import { useTranslation } from "react-i18next"'));
    });

    await t.test('A2: extracts identifier interpolation as named variable', () => {
        const result = extractAndTransformJSX(wrap('            <p>You have {count} tasks</p>'), { fileName: 'src/components/Hero.jsx' });
        assert.deepEqual([...result.extractedStrings.entries()], [['hero.body', 'You have {{count}} tasks']]);
        assert.match(result.modifiedCode, /<p>\{t\("hero\.body", \{\s*count\s*\}\)\}<\/p>/, result.modifiedCode);
    });

    await t.test('A3: data-promoted member expressions keep dynamic t() keys', () => {
        const registry = { plan: { translatable: ['price'] } };
        const code = `
export default function Pricing({ plan }) {
    return (
        <div>
            <p>{plan.price}/mo</p>
        </div>
    );
}
`;
        const result = extractAndTransformJSX(code, { fileName: 'src/components/Pricing.jsx', registry });
        assert.equal(result.extractedStrings.size, 0);
        assert.ok(result.modifiedCode.includes('<p>{t(plan.price)}/mo</p>'), result.modifiedCode);
    });

    await t.test('A4: multiline text normalizes value and preserves indentation', () => {
        const code = `
export default function Hero() {
    return (
        <div>
            <p>
                Hello world
                with more words
            </p>
        </div>
    );
}
`;
        const result = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        assert.deepEqual([...result.extractedStrings.entries()], [['hero.body', 'Hello world with more words']]);
        assert.ok(result.modifiedCode.includes('\n                {t("hero.body")}\n            '), result.modifiedCode);
    });

    await t.test('A5: extracts placeholder and title attributes', () => {
        const result = extractAndTransformJSX(wrap('            <input placeholder="Enter your name" title="Name field" />'), { fileName: 'src/components/Hero.jsx' });
        const entries = [...result.extractedStrings.entries()];
        assert.ok(entries.some(([k, v]) => k === 'hero.enterYourName' && v === 'Enter your name'), JSON.stringify(entries));
        assert.ok(entries.some(([k, v]) => k === 'hero.nameField' && v === 'Name field'), JSON.stringify(entries));
        assert.ok(result.modifiedCode.includes('placeholder={t("hero.enterYourName")}'), result.modifiedCode);
        assert.ok(result.modifiedCode.includes('title={t("hero.nameField")}'), result.modifiedCode);
    });

    await t.test('A6: data-meridian-ignore leaves the element untouched', () => {
        const code = `
export default function Hero() {
    return (
        <div>
            <p data-meridian-ignore="true">Skip me {unknowable()}</p>
        </div>
    );
}
`;
        const result = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        assert.equal(result.extractedStrings.size, 0);
        assert.ok(!result.modifiedCode.includes('useTranslation'));
    });

    await t.test('B1: mixed text and bare strong becomes one Trans unit', () => {
        const result = extractAndTransformJSX(wrap('            <p>Hello <strong>{name}</strong></p>'), { fileName: 'src/components/Hero.jsx' });
        assert.deepEqual([...result.extractedStrings.entries()], [['hero.body', 'Hello <strong>{{name}}</strong>']]);
        assert.match(result.modifiedCode, /<Trans i18nKey="hero\.body">\s*Hello\s*<strong>\{\{\s*name\s*\}\}<\/strong>\s*<\/Trans>/, result.modifiedCode);
        assert.ok(!/<strong>\{name\}<\/strong>/.test(result.modifiedCode), 'bare interpolation must become object shorthand: ' + result.modifiedCode);
        assert.ok(result.modifiedCode.includes('Trans'));
    });

    await t.test('B2: attributed element keeps props in code, indexed tag in value', () => {
        const result = extractAndTransformJSX(wrap('            <p>Please read our <a href="/tos">terms and conditions</a></p>'), { fileName: 'src/components/Hero.jsx' });
        const entries = [...result.extractedStrings.entries()];
        assert.equal(entries.length, 1);
        assert.equal(entries[0][1], 'Please read our <1>terms and conditions</1>');
        assert.ok(result.modifiedCode.includes('<a href="/tos">terms and conditions</a>'), 'element source must stay verbatim: ' + result.modifiedCode);
        assert.ok(!result.modifiedCode.includes('{{href}}'), 'prop placeholders must not leak into the value');
    });

    await t.test('B3: multiple bare tags with text between become one Trans unit', () => {
        const result = extractAndTransformJSX(wrap('            <p>Hello <em>{name}</em>, you have <b>{unreadCount}</b> messages</p>'), { fileName: 'src/components/Hero.jsx' });
        const entries = [...result.extractedStrings.entries()];
        assert.equal(entries.length, 1);
        assert.equal(entries[0][1], 'Hello <em>{{name}}</em>, you have <b>{{unreadCount}}</b> messages');
    });

    await t.test('B4: attributed span stays verbatim and gets an indexed tag', () => {
        const result = extractAndTransformJSX(wrap('            <p>Highlight <span className="hl">this text</span> please</p>'), { fileName: 'src/components/Hero.jsx' });
        const entries = [...result.extractedStrings.entries()];
        assert.equal(entries.length, 1);
        assert.equal(entries[0][1], 'Highlight <1>this text</1> please');
        assert.ok(result.modifiedCode.includes('<span className="hl">this text</span>'), result.modifiedCode);
    });

    await t.test('B5: nested bare wrappers keep readable tags in value', () => {
        const result = extractAndTransformJSX(wrap('            <p>This is <strong>bold <em>both</em></strong></p>'), { fileName: 'src/components/Hero.jsx' });
        const entries = [...result.extractedStrings.entries()];
        assert.equal(entries.length, 1);
        assert.equal(entries[0][1], 'This is <strong>bold <em>both</em></strong>');
    });

    await t.test('B6: custom component mid-sentence uses indexed tag', () => {
        const result = extractAndTransformJSX(wrap('            <p>Intro text <Link to="/a">click</Link> now</p>'), { fileName: 'src/components/Hero.jsx' });
        const entries = [...result.extractedStrings.entries()];
        assert.equal(entries.length, 1);
        assert.equal(entries[0][1], 'Intro text <1>click</1> now');
        assert.ok(result.modifiedCode.includes('<Link to="/a">click</Link>'), 'component source must stay verbatim: ' + result.modifiedCode);
    });

    await t.test('C1: call expression aborts the whole element silently', () => {
        const code = `
export default function Hero() {
    return (
        <div>
            <p>{formatCurrency(price)}/mo</p>
        </div>
    );
}
`;
        const result = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        assert.equal(result.modifiedCode, code);
        assert.equal(result.extractedStrings.size, 0);
        assert.equal(result.skipped.length, 1);
        assert.equal(result.skipped[0].tag, 'p');
    });

    await t.test('C2: conditional expression aborts the whole element', () => {
        const code = `
export default function Hero() {
    return (
        <div>
            <p>{x > 0 ? count : 0} items</p>
        </div>
    );
}
`;
        const result = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        assert.equal(result.modifiedCode, code);
        assert.equal(result.extractedStrings.size, 0);
        assert.equal(result.skipped.length, 1);
    });

    await t.test('D1: extracts alt and aria-label attributes', () => {
        const code = `
export default function Hero() {
    return (
        <div>
            <img src="logo.png" alt="Company logo" />
            <button aria-label="Close menu">×</button>
        </div>
    );
}
`;
        const result = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        const entries = [...result.extractedStrings.entries()];
        assert.ok(entries.some(([, v]) => v === 'Company logo'), JSON.stringify(entries));
        assert.ok(entries.some(([, v]) => v === 'Close menu'), JSON.stringify(entries));
        assert.ok(result.modifiedCode.includes('alt={t('), result.modifiedCode);
        assert.ok(result.modifiedCode.includes('aria-label={t('), result.modifiedCode);
    });

    await t.test('D2: every component that needs t() gets its own hook', () => {
        const code = `
export function Header() {
    return (
        <div>
            <p>Header text</p>
        </div>
    );
}

export function Footer() {
    return (
        <div>
            <p>Footer text</p>
        </div>
    );
}
`;
        const result = extractAndTransformJSX(code, { fileName: 'src/components/Chrome.jsx' });
        const hookCount = (result.modifiedCode.match(/const \{ t \} = useTranslation\(\);/g) || []).length;
        assert.equal(hookCount, 2);
        assert.ok(result.modifiedCode.includes('header.body'), [...result.extractedStrings.keys()]);
        assert.ok(result.modifiedCode.includes('footer.body'), [...result.extractedStrings.keys()]);
    });

    await t.test('D3: extraction is idempotent on repeated runs', () => {
        const code = wrap('            <p>Hello <strong>{name}</strong></p>');
        const run1 = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        saveKeyMap();
        resetKeyGeneratorStateForTesting();
        const run2 = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        saveKeyMap();
        assert.equal(run1.modifiedCode, run2.modifiedCode);
        assert.deepEqual([...run1.extractedStrings.entries()], [...run2.extractedStrings.entries()]);
    });

    await t.test('D4: merges Trans into an existing react-i18next import without duplicates', () => {
        const code = `
import { useTranslation } from 'react-i18next';

export default function Hero() {
    const { t } = useTranslation();
    return (
        <div>
            <p>Hello <strong>{name}</strong></p>
        </div>
    );
}
`;
        const result = extractAndTransformJSX(code, { fileName: 'src/components/Hero.jsx' });
        const importCount = (result.modifiedCode.match(/from ['"]react-i18next['"]/g) || []).length;
        assert.equal(importCount, 1, 'duplicate react-i18next import: ' + result.modifiedCode);
        assert.ok(/import \{[^}]*Trans[^}]*\} from ['"]react-i18next['"]/.test(result.modifiedCode), result.modifiedCode);
    });
});
