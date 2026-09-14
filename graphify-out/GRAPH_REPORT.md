# Graph Report - C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite  (2026-07-05)

## Corpus Check
- 93 files · ~96,308 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 386 nodes · 593 edges · 45 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 138 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `runModifications()` - 32 edges
2. `runSync()` - 18 edges
3. `injectProvider()` - 14 edges
4. `applyEdits()` - 11 edges
5. `isMemberExpressionLike()` - 11 edges
6. `handleTextRun()` - 11 edges
7. `analyzeJSX()` - 10 edges
8. `nextLayoutFixer()` - 10 edges
9. `injectTailwindLogical()` - 10 edges
10. `extractAndTransformJSX()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `runTest()` --calls--> `runSync()`  [INFERRED]
  C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite\packages\cli\test\sync-incremental.test.js → C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite\packages\cli\utils\sync-runner.js
- `runTest()` --calls--> `runSync()`  [INFERRED]
  C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite\packages\cli\test\sync-migration.test.js → C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite\packages\cli\utils\sync-runner.js
- `runTests()` --calls--> `runSync()`  [INFERRED]
  C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite\packages\cli\test\sync-reconciliation.test.js → C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite\packages\cli\utils\sync-runner.js
- `getActiveAdapterInstance()` --calls--> `detectAdapter()`  [INFERRED]
  C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite\packages\cli\utils\adapter-utils.js → C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite\packages\core\src\adapters\index.js
- `getActiveAdapterInstance()` --calls--> `getAdapter()`  [INFERRED]
  C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite\packages\cli\utils\adapter-utils.js → C:\Users\taimk\Desktop\Hackthon project 1\meridian-suite\packages\core\src\adapters\index.js

## Hyperedges (group relationships)
- **Meridian Website UI Composition** — app, hero, solution, masonry_gallery, workflow_filmstrip, comparison, code_example, cta_section, topnav [EXTRACTED 1.00]
- **GSAP ScrollTrigger Animation Pattern** — hero, solution, masonry_gallery, workflow_filmstrip, comparison, code_example, cta_section [EXTRACTED 1.00]
- **CLI Modification Pipeline** — meridian_cli, config_manager, modification_runner, ast_injector, i18n_generator, dependency_installer [EXTRACTED 1.00]
- **** — analyzeCSS, cssDetectRTL, cssFixStyles, cssScoring [INFERRED]
- **** — analyzeHTML, htmlParse, htmlDetectStructure, htmlDetectMeta, htmlDetectA11y, htmlInjectLang [INFERRED]
- **** — analyzeJSX, jsxDetectRTL, jsxFixStyles, jsxInjectLang, jsxDetectA11y [INFERRED]
- **** — TranslationProvider, DeepLProvider, GoogleProvider, LibreProvider, MockTranslationAdapter [INFERRED]
- **** — extractJSX, injectTranslation, hashKey, i18nExtractTransform [INFERRED]
- **** — reactInjector, detectScope, vanillaInjector, reactGenerators, i18nExtractTransform [INFERRED]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (30): analyzeCSS(), injectI18nImport(), atomicWriteFile(), findIndexHtml(), injectDirToHtml(), generateI18nConfig(), installI18nDependencies(), saveKeyMap() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (28): buildLocaleNode(), checkIsESM(), ensureSkipLibCheck(), findAppLayoutFile(), findPageFiles(), findPagesAppFile(), findProperty(), injectServerSideTranslationsToPage() (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (29): addStringLiteralEdit(), addTranslationEdit(), assertNotDataPromoted(), buildTextReplacement(), collectTextRun(), extractMemberInfo(), findNearestArrowFunction(), findTranslatableFieldInExpression() (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (25): analyzeProviderScope(), analyzeAppRouterLayout(), analyzeExportDefault(), analyzeToggleTarget(), generateProviderWrapperEdit(), generateToggleInsertEdit(), injectToggleNode(), wrapExportWithProvider() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (24): applyEdits(), findLastImportEnd(), injectDirAttribute(), parseSource(), computeRelativeImport(), findDocumentNodes(), getHtmlAttributesEdits(), getImportsEdits() (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (25): scanAndPromoteDataFiles(), classifyString(), collectValues(), extractDataPaths(), findDataFiles(), getAllFiles(), parseJsFile(), parseJsonFile() (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (12): analyzeHTML(), analyzeJSX(), detectA11y(), detectA11yVisitor(), detectMeta(), detectRTLVisitor(), detectStructure(), fixStylesVisitor() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (8): getActiveAdapterInstance(), detectAdapter(), getAdapter(), TranslatorService, NextIntlAdapter, runTest(), TranslationProvider, runTranslations()

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (11): generateContextAwareKey(), getAstPathSignature(), getNamespace(), getRole(), getScope(), getSourceTextHash(), loadKeyMap(), resetKeyGeneratorStateForTesting() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (9): applyTailwindLogicalSupport(), atomicWriteFile(), parseJsxSource(), rewriteClassNameValue(), rewriteClassToken(), rewriteStringLiteralNode(), rewriteTailwindClasses(), rewriteTemplateLiteralClassName() (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.27
Nodes (7): buildExtractVisitor(), extractAndTransformJSX(), findHookInsertionPoint(), findLastImportEnd(), getReactComponentAncestor(), injectImportStatements(), isReactComponent()

### Community 11 - "Community 11"
Cohesion: 0.44
Nodes (7): findConfigExportNode(), findProperty(), injectDefaultLocale(), injectI18nProperty(), injectLocales(), nextConfigFixer(), parseNextConfig()

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (1): NextI18nextAdapter

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (2): Hero(), useMousePosition()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (1): MyDocument

### Community 16 - "Community 16"
Cohesion: 0.83
Nodes (3): getRegexForLanguages(), runDoctor(), scanDir()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (2): detectRTLAndFix(), applyFixes()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (1): GoogleProvider

### Community 20 - "Community 20"
Cohesion: 0.5
Nodes (1): LibreProvider

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (1): MockTranslationAdapter

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (2): checkEnvironment(), getMajorVersion()

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (1): DeepLProvider

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 27`** (2 nodes): `App()`, `App.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `CodeExample.jsx`, `CodeExample()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `Comparison.jsx`, `Comparison()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `CtaSection.jsx`, `CtaSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `Solution.jsx`, `Solution()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `TerminalDemo.jsx`, `TerminalDemo()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `TopNav.jsx`, `TopNav()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `WorkflowFilmstrip.jsx`, `WorkflowFilmstrip()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `scratch.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `constants.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `keyGenerator.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `injection.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `nextConfigFixer.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `nextFixer.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `runModifications()` connect `Community 0` to `Community 1`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.326) - this node is a cross-community bridge._
- **Why does `extractAndTransformJSX()` connect `Community 10` to `Community 0`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `applyEdits()` connect `Community 4` to `Community 1`, `Community 10`, `Community 3`, `Community 9`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Are the 21 inferred relationships involving `runModifications()` (e.g. with `getActiveAdapterInstance()` and `runSyncConfig()`) actually correct?**
  _`runModifications()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `runSync()` (e.g. with `runTest()` and `runTest()`) actually correct?**
  _`runSync()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `injectProvider()` (e.g. with `handleInjections()` and `analyzeProviderScope()`) actually correct?**
  _`injectProvider()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `applyEdits()` (e.g. with `injectDirAttribute()` and `extractAndTransformJSX()`) actually correct?**
  _`applyEdits()` has 10 INFERRED edges - model-reasoned connections that need verification._