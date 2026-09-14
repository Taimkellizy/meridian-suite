# **🌍 MERIDIAN: Project Brief & Vision Document**

**Version 1.0 | February 2026**

---

## **📋 Executive Summary**

**Meridian** is a comprehensive internationalization automation tool that transforms any React application into a global-ready product with a single command. Unlike traditional i18n libraries that require manual setup and configuration, Meridian handles the entire migration process: CSS modernization, string extraction, translation, i18next setup, and ongoing prevention through linter integration.

**One Command. Global Ready.**

```bash
npm install -g meridian
meridian init
```

---

## **🔄 Evolution: From Arabify to Meridian**

### **What Arabify Was:**

**Arabify** (v0.7.0) was an RTL-first static analysis tool focused primarily on:

- ✅ Analyzing HTML/CSS/JS for RTL readiness
- ✅ Detecting physical CSS properties (margin-left, float: left, etc.)
- ✅ Auto-fixing to logical properties
- ✅ Scoring system (0-100) for RTL readiness
- ✅ Web-based interface (arabify-by-taim-kellizy.vercel.app)
- ✅ Educational blog content

**Limitations:**

- ❌ Arabic/RTL-focused branding (too narrow)
- ❌ Web-only interface (no CLI)
- ❌ One-time analysis tool (no continuous prevention)
- ❌ No i18n setup automation
- ❌ No string extraction
- ❌ No translation capabilities
- ❌ Positioned as niche tool vs comprehensive solution

### **What Meridian Will Be:**

**Meridian** is a complete i18n automation platform with:

- ✅ **CLI-first** approach (one-command setup)
- ✅ **Universal scope** (all languages, not just Arabic)
- ✅ **Complete workflow** (CSS + i18n + translation + prevention)
- ✅ **ESLint/Stylelint integration** (continuous enforcement)
- ✅ **npm package ecosystem** (professional distribution)
- ✅ **Automated i18next setup** (no manual configuration)
- ✅ **String extraction** (Babel-powered)
- ✅ **Auto-translation** (Google/DeepL/LibreTranslate APIs)
- ✅ **Professional positioning** (enterprise-ready tool)

---

## **🎯 Vision & Mission**

### **Mission Statement:**

> "Make every web application accessible to global audiences by automating the complex, tedious process of internationalization."

### **Vision:**

To become the **standard tool** developers use when making React applications multilingual - as essential as `create-react-app` is for starting projects.

### **Core Philosophy:**

**Automation First:** Developers shouldn't spend days learning i18n best practices, manually extracting strings, or fixing CSS. One command should handle everything.

**Prevention, Not Just Fixing:** Migration is step one. Continuous prevention through linters ensures the codebase stays clean.

**Developer Experience:** Beautiful CLI output, clear error messages, comprehensive documentation, and sensible defaults.

---

## **🏗️ Technical Architecture**

### **Monorepo Structure:**

```
meridian/
├── packages/
│   ├── cli/                    # Main CLI tool
│   │   ├── commands/
│   │   │   ├── init.js        # Full setup command
│   │   │   ├── fix-css.js     # CSS-only fixes
│   │   │   ├── extract.js     # String extraction only
│   │   │   ├── translate.js   # Translation only
│   │   │   └── add-button.js  # Language switcher injection
│   │   ├── utils/
│   │   │   ├── installer.js   # Dependency management
│   │   │   ├── config.js      # Config file handling
│   │   │   └── reporter.js    # Progress/results reporting
│   │   └── templates/
│   │       ├── i18n-config.js # i18next config template
│   │       └── components/    # Language button templates
│   │
│   ├── core/                   # Shared logic (from Arabify)
│   │   ├── parsers/
│   │   │   ├── cssParser.js   # PostCSS-based
│   │   │   ├── jsxParser.js   # Babel-based
│   │   │   └── tsParser.js    # TypeScript support
│   │   ├── detectors/
│   │   │   ├── margins.js
│   │   │   ├── padding.js
│   │   │   ├── floats.js
│   │   │   ├── textAlign.js
│   │   │   └── positioning.js
│   │   ├── fixers/
│   │   │   ├── cssFixers.js
│   │   │   └── jsxFixers.js
│   │   └── constants.js        # RTL property mappings
│   │
│   ├── eslint-plugin/          # Real-time prevention
│   │   ├── index.js
│   │   ├── rules/
│   │   │   ├── no-physical-properties.js
│   │   │   ├── prefer-logical-margins.js
│   │   │   └── prefer-logical-padding.js
│   │   └── configs/
│   │       └── recommended.js
│   │
│   ├── stylelint-plugin/       # CSS prevention
│   │   ├── index.js
│   │   └── rules/
│   │       └── no-physical-properties.js
│   │
│   └── translator/             # Translation service
│       ├── providers/
│       │   ├── google.js
│       │   ├── deepl.js
│       │   └── libre.js
│       └── utils/
│           └── variable-preservation.js
│
├── website/                    # Documentation site
│   ├── docs/
│   ├── blog/                   # Educational content (from Arabify)
│   └── examples/
│
└── examples/                   # Before/after showcase repos
    ├── bootstrap/
    ├── material-ui/
    └── tailwind/
```

---

## **✨ Feature Set**

### **Phase 1: Core Migration Tool (Weeks 1-4)**

#### **1. CSS Modernization (Existing from Arabify)**

```bash
meridian fix-css ./src
```

**What it does:**

- Scans all CSS, JSX, TSX files
- Detects physical properties: margin-left/right, padding-left/right, float, text-align, border, positioning
- Auto-fixes to logical properties: margin-inline-start/end, padding-inline-start/end, float: inline-start, text-align: start
- **Includes padding fix** (4-value padding swapping)
- Context-aware (distinguishes style objects from data objects)
- Preserves formatting and indentation
- Generates before/after report

**Technical improvements:**

- Fixed padding parser (handles 4-value, 2-value)
- TypeScript support (`as const` assertions)
- Handles border-left-width, border-left-style, border-left-color

#### **2. String Extraction (New)**

```bash
meridian extract ./src
```

**What it does:**

- Uses `babel-plugin-i18next-extract` under the hood
- Scans JSX for hardcoded strings
- Generates extraction report
- Creates `en/translation.json` with hierarchical keys
- Preserves variables: `"Hello {{name}}"` → kept intact
- Supports namespaces for organization

**Output:**

```json
// public/locales/en/translation.json
{
  "common": {
    "welcome": "Welcome to our site",
    "buttons": {
      "submit": "Submit",
      "cancel": "Cancel"
    }
  },
  "dashboard": {
    "title": "Dashboard",
    "greeting": "Hello {{name}}!"
  }
}
```

#### **3. Auto-Translation (New)**

```bash
meridian translate --languages ar,es,fr --provider google --api-key XXX
```

**What it does:**

- Supports multiple providers: Google Translate, DeepL, LibreTranslate
- Translates all extracted strings
- Preserves interpolation variables: `{{name}}`, `{{count}}`
- Rate-limited to respect API limits
- Generates translation files for each language
- Manual mode: generates empty files for human translation

**Smart features:**

- Detects existing translations (doesn't re-translate)
- Handles pluralization keys
- Preserves formatting
- Shows progress bar

#### **4. i18next Setup (New)**

```bash
meridian setup-i18n
```

**What it does:**

- Installs dependencies: `i18next`, `react-i18next`
- Creates `src/i18n.js` configuration file
- Wraps root component with `I18nextProvider`
- Adds language detection
- Configures resource loading
- Updates `package.json` scripts

**Generated config:**

```javascript
// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require("./locales/en/translation.json") },
      ar: { translation: require("./locales/ar/translation.json") },
      // ... more languages
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

#### **5. Language Switcher Injection (Enhanced from Arabify)**

```bash
meridian add-button --style dropdown --position nav
```

**What it does:**

- Configurable styles: button, dropdown, nav-list, select
- Configurable positions: nav, header, footer, custom selector
- Smart placement: detects structure and inserts appropriately
- Respects indentation (2-space or 4-space)
- Generates accessible component
- Includes flag emojis (optional)

**Configuration options:**

```json
// .meridianrc.json
{
  "languageSwitcher": {
    "style": "dropdown", // button | dropdown | nav-list | select
    "position": "nav", // nav | header | footer | custom
    "placement": "end", // start | end | center
    "showFlags": true,
    "languages": [
      { "code": "en", "label": "English", "flag": "🇺🇸" },
      { "code": "ar", "label": "العربية", "flag": "🇸🇦", "dir": "rtl" }
    ]
  }
}
```

#### **6. Full Initialization (New - The Main Command)**

```bash
meridian init
```

**Interactive prompts:**

```
? Which languages do you want to support? (en, ar, es, fr)
? Translation method? (Google Translate, DeepL, LibreTranslate, Manual)
? Google Translate API key? (enter or skip)
? Language switcher style? (button, dropdown, nav-list)
? Where to place language switcher? (nav, header, footer)
? Install ESLint/Stylelint plugins? (Yes)
```

**What it does (in order):**

1. Analyzes project structure
2. Fixes CSS to logical properties
3. Sets up i18next (installs deps, creates config)
4. Extracts all strings
5. Translates to selected languages (if API provided)
6. Injects language switcher
7. Installs ESLint/Stylelint plugins
8. Generates `.meridianrc.json` config
9. Creates comprehensive report

**Output:**

```bash
🌍 Initializing Meridian...

📐 Fixing CSS logical properties...
   ✅ Fixed 247 issues in 43 files

🌐 Setting up i18next...
   ✅ Installed dependencies
   ✅ Created i18n.js config
   ✅ Updated App.js

📝 Extracting strings...
   ✅ Found 342 translatable strings
   ✅ Created en/translation.json

🔄 Translating to 3 languages...
   ✅ Arabic (342 strings)
   ✅ Spanish (342 strings)
   ✅ French (342 strings)

🎚️ Injecting language switcher...
   ✅ Added dropdown to navigation

🛡️ Installing linter plugins...
   ✅ Installed eslint-plugin-meridian
   ✅ Installed stylelint-meridian
   ✅ Updated .eslintrc.js

✨ Configuration saved to .meridianrc.json

🎉 Done! Your app is now global-ready.

📖 Next steps:
   1. Review changes: git diff
   2. Test locally: npm start
   3. Update translations: meridian translate --update
   4. ESLint will now prevent future RTL issues
```

---

### **Phase 2: Linter Integration (Weeks 5-6)**

#### **ESLint Plugin**

```bash
npm install --save-dev eslint-plugin-meridian
```

**What it does:**

- Detects physical properties in JSX inline styles
- Shows warnings/errors in real-time (VS Code)
- Provides auto-fix via Quick Fix menu
- Configurable severity (warn/error)

**Rules:**

- `meridian/no-physical-properties` - Disallow margin-left, padding-right, etc.
- `meridian/prefer-logical-margins` - Suggest logical margin properties
- `meridian/prefer-logical-padding` - Suggest logical padding properties
- `meridian/no-directional-floats` - Disallow float: left/right

**Configuration:**

```javascript
// .eslintrc.js
module.exports = {
  plugins: ["meridian"],
  extends: ["plugin:meridian/recommended"],
  rules: {
    "meridian/no-physical-properties": "warn",
  },
};
```

**Developer experience:**

```javascript
// Developer types:
const style = { marginLeft: 20 };
                ^^^^^^^^^^
// VS Code shows:
⚠️ Use 'marginInlineStart' instead of 'marginLeft' (meridian/no-physical-properties)

Quick Fix:
  ⚡ Replace with marginInlineStart
  📖 Learn about logical properties
  🚫 Disable for this line
```

#### **Stylelint Plugin**

```bash
npm install --save-dev stylelint-meridian
```

**What it does:**

- Lints CSS files for physical properties
- Shows warnings in real-time
- Auto-fix support

**Rules:**

- `meridian/no-physical-properties` - Disallow physical CSS
- `meridian/use-logical-properties` - Enforce logical properties

---

### **Phase 3: Enhanced Features (Weeks 7-8)**

#### **Configuration File Support**

```json
// .meridianrc.json
{
  "version": "1.0",
  "languages": ["en", "ar", "es", "fr"],
  "defaultLanguage": "en",
  "translation": {
    "provider": "google",
    "apiKey": "encrypted-key",
    "fallback": "manual"
  },
  "css": {
    "autofix": true,
    "preserveComments": true,
    "ignoreFiles": ["vendor/**", "legacy/**"]
  },
  "linters": {
    "eslint": true,
    "stylelint": true,
    "severity": "warn"
  },
  "languageSwitcher": {
    "style": "dropdown",
    "position": "nav",
    "showFlags": true
  },
  "extraction": {
    "namespaces": ["common", "dashboard", "settings"],
    "keyPrefix": "auto"
  }
}
```

#### **Incremental Updates**

```bash
# Update translations without re-extracting
meridian translate --update

# Re-extract new strings only
meridian extract --update

# Fix new CSS issues only
meridian fix-css --incremental
```

#### **CI/CD Integration**

```bash
# Check mode (fails if issues found)
meridian check --strict

# Output report for CI
meridian check --report json > report.json
```

**GitHub Action:**

```yaml
# .github/workflows/i18n-check.yml
name: I18n Quality Check

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g meridian
      - run: meridian check --strict
```

---

## **🎯 Target Audience**

### **Primary:**

1. **React developers** building apps for international markets
2. **Startup teams** expanding globally
3. **Development agencies** building client sites
4. **Open-source maintainers** wanting to support multiple languages

### **Secondary:**

1. **Enterprise teams** with i18n requirements
2. **Solo developers** creating SaaS products
3. **Bootcamp graduates** building portfolio projects
4. **Tech companies** with global user bases

### **Personas:**

**Persona 1: Sarah (Senior Developer at Startup)**

- **Needs:** Quick i18n setup for MVP launching in MENA region
- **Pain:** Learning i18n takes too long, manual work is tedious
- **Solution:** `meridian init` → done in 10 minutes

**Persona 2: Ahmed (Freelance Developer)**

- **Needs:** Make existing client sites work in Arabic
- **Pain:** CSS breaks in RTL, doesn't know modern best practices
- **Solution:** CSS auto-fix + prevention through linters

**Persona 3: Tech Lead at Agency**

- **Needs:** Standardize i18n across 20+ projects
- **Pain:** Every developer does it differently, quality inconsistent
- **Solution:** Meridian becomes the standard tool, enforced via CI/CD

---

## **📊 Competitive Positioning**

### **vs. i18next:**

- **i18next:** Runtime translation library (like React itself)
- **Meridian:** Setup/migration tool (like create-react-app)
- **Relationship:** Complementary - Meridian sets up projects to USE i18next

### **vs. postcss-use-logical:**

- **postcss-use-logical:** PostCSS plugin only, CSS-only, build-time
- **Meridian:** CLI tool, CSS + JSX + i18n, comprehensive solution
- **Advantage:** Much broader scope, better UX, ESLint integration

### **vs. babel-plugin-i18next-extract:**

- **babel-plugin:** String extraction only, requires manual setup
- **Meridian:** Complete workflow including translation + setup
- **Relationship:** Meridian uses it internally (wraps it)

### **vs. Manual Setup:**

- **Manual:** 2-3 days of work, requires expertise, error-prone
- **Meridian:** 5-10 minutes, zero expertise needed, automated
- **Advantage:** Massive time savings, prevention through linters

**Unique Value Proposition:**

> "The only tool that handles CSS, i18n setup, translation, AND prevention in a single command. From zero to global-ready in 10 minutes."

---

## **🚀 Go-to-Market Strategy**

### **Distribution Channels:**

1. **npm (Primary)**
   - `meridian` (CLI)
   - `eslint-plugin-meridian`
   - `stylelint-meridian`

2. **GitHub**
   - Open source repository
   - Example repos (before/after showcases)
   - Comprehensive documentation

3. **Website**
   - meridian.dev (documentation)
   - Interactive demo
   - Video tutorials
   - Blog content (SEO)

### **Marketing Tactics:**

#### **Week 1 (Pre-Launch):**

- Reserve npm namespace: `@meridian/*`
- Reserve GitHub org: `meridian-dev`
- Buy domain: `meridian.dev`
- Create Twitter: `@meridian_dev`
- Set up Discord community

#### **Week 9 (Launch Week):**

**Monday:**

- Publish to npm
- GitHub repo public
- Website live

**Tuesday:**

- Post to Reddit: r/reactjs, r/webdev, r/javascript
- Tweet storm with examples
- Post on dev.to

**Wednesday:**

- Product Hunt launch
- Hacker News (Show HN)
- LinkedIn post

**Thursday:**

- Email to mailing list (if any)
- Post in React/i18n Discord servers
- Reach out to React newsletters

**Friday:**

- Case study blog post
- Before/after video demo
- Stream coding session using Meridian

#### **Month 1-3:**

- Weekly blog posts (SEO)
- Showcase real projects using Meridian
- Conference talk submissions
- Contribute to related communities
- Build GitHub stars (organic growth)

#### **Month 4-6:**

- Sponsor React/i18n meetups
- Create video tutorial series
- Partner with coding bootcamps
- Get mentioned in React newsletters
- Build case studies

### **Content Strategy:**

**Blog Topics:**

1. "Why margin-left Breaks Your International App"
2. "The Complete Guide to CSS Logical Properties"
3. "How to Make Your React App Global-Ready in 10 Minutes"
4. "RTL Support in 2026: Modern Best Practices"
5. "Case Study: Converting Material-UI to Logical CSS"
6. "i18next Setup Made Simple"
7. "Building Global-First Applications"
8. "Avoiding Common i18n Mistakes"

**Video Content:**

1. "Meridian in 60 seconds" (demo)
2. "Complete tutorial: React app → Global app"
3. "How Meridian works under the hood"
4. "Live: Converting a real project"

---

## **📈 Success Metrics**

### **Month 1:**

- [ ] 100+ npm downloads/week
- [ ] 50+ GitHub stars
- [ ] 10+ community issues/PRs
- [ ] 1,000+ website visits

### **Month 3:**

- [ ] 1,000+ npm downloads/week
- [ ] 200+ GitHub stars
- [ ] Featured in 1 newsletter
- [ ] 5+ blog posts published

### **Month 6:**

- [ ] 5,000+ npm downloads/week
- [ ] 500+ GitHub stars
- [ ] 10+ companies using in production
- [ ] Conference talk accepted

### **Month 12:**

- [ ] 20,000+ npm downloads/week
- [ ] 1,000+ GitHub stars
- [ ] ESLint plugin widely adopted
- [ ] Mentioned in React documentation/resources
- [ ] Revenue options explored (if applicable)

---

## **⏱️ Development Timeline**

### **Weeks 1-2: Foundation**

- [ ] Set up monorepo structure
- [ ] Extract core logic from Arabify
- [ ] Implement padding fix improvements
- [ ] Set up CLI boilerplate (Commander.js)
- [ ] Create configuration system

### **Weeks 3-4: Core Features**

- [ ] Integrate babel-plugin-i18next-extract
- [ ] Build translation service (API integrations)
- [ ] Create i18next setup generator
- [ ] Implement language button configurator
- [ ] Build `meridian init` command

### **Weeks 5-6: Linter Integration**

- [ ] Build ESLint plugin
- [ ] Build Stylelint plugin
- [ ] Auto-installation in CLI
- [ ] Test integration

### **Weeks 7-8: Polish & Testing**

- [ ] Comprehensive testing (Jest)
- [ ] Documentation website
- [ ] Example projects (showcases)
- [ ] CI/CD examples
- [ ] Error handling improvements

### **Week 9: Launch**

- [ ] Publish to npm
- [ ] Make repos public
- [ ] Launch website
- [ ] Marketing blitz

### **Week 10+: Iteration**

- [ ] Community feedback
- [ ] Bug fixes
- [ ] Feature requests
- [ ] Content creation

---

## **🎨 Brand Identity**

### **Name: Meridian**

**Meaning:** Lines of longitude that circle the globe, connecting all places

### **Tagline Options:**

1. "Meridian: Navigate every language"
2. "Meridian: Where languages converge"
3. "Meridian: Circle the globe in one command"
4. "Meridian: Global development, simplified"

### **Visual Identity:**

- **Logo:** Globe with meridian lines, stylized compass rose
- **Colors:**
  - Primary: Deep blue (#1E3A8A) - trustworthy, global
  - Secondary: Teal (#14B8A6) - modern, fresh
  - Accent: Gold (#F59E0B) - premium, valuable
- **Typography:** Modern sans-serif (Inter, Manrope)
- **Icon Style:** Geometric, minimalist

### **Voice & Tone:**

- Professional but approachable
- Technical but clear
- Confident but not arrogant
- Helpful and educational

---

## **🔐 Technical Considerations**

### **Dependencies:**

**Core:**

- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `chalk` - Terminal colors
- `ora` - Spinners
- `postcss` - CSS parsing
- `@babel/core` - JS/JSX parsing
- `babel-plugin-i18next-extract` - String extraction

**Translation:**

- `axios` - HTTP requests
- `node-fetch` - API calls

**Installation:**

- `execa` - Run shell commands
- `fs-extra` - File operations

### **Testing:**

- `jest` - Unit testing
- `@testing-library/react` - React testing
- Fixture-based testing for real files

### **Build:**

- Lerna or Nx for monorepo
- Rollup for bundling
- TypeScript for type safety (internal)

---

## **🤝 Community & Contribution**

### **Open Source Strategy:**

- MIT License
- Contributor guide
- Code of conduct
- Issue templates
- PR templates
- Good first issues labeled
- Comprehensive CONTRIBUTING.md

### **Community Channels:**

- GitHub Discussions (primary)
- Discord server (for real-time help)
- Twitter for announcements
- Stack Overflow tag

---

## **📚 Documentation Structure**

```
meridian.dev/
├── Home
├── Getting Started
│   ├── Installation
│   ├── Quick Start
│   └── Your First Migration
├── CLI Reference
│   ├── meridian init
│   ├── meridian fix-css
│   ├── meridian extract
│   ├── meridian translate
│   └── meridian add-button
├── Configuration
│   ├── .meridianrc.json
│   ├── ESLint Plugin
│   └── Stylelint Plugin
├── Guides
│   ├── CSS Logical Properties
│   ├── i18next Integration
│   ├── Translation APIs
│   ├── Language Switcher
│   └── CI/CD Integration
├── Examples
│   ├── Basic React App
│   ├── Next.js App
│   ├── TypeScript Project
│   └── Large Codebase
├── Blog
└── API Reference
```

---

## **🎯 Key Differentiators**

**What makes Meridian unique:**

1. ✅ **Only tool that does migration + prevention**
2. ✅ **Handles CSS + i18n + translation in one command**
3. ✅ **JSX inline style support** (competitors miss this)
4. ✅ **Zero config by default, fully configurable**
5. ✅ **ESLint integration** (continuous quality)
6. ✅ **Beautiful developer experience** (CLI output, prompts)
7. ✅ **Comprehensive solution** (not just one piece)

---

## **✅ Next Steps (Immediate Actions)**

### **This Week:**

1. [ ] Reserve npm namespace: `meridian`, `@meridian/*`
2. [ ] Create GitHub organization: `meridian-dev`
3. [ ] Register domain: `meridian.dev`
4. [ ] Set up monorepo structure
5. [ ] Create initial README.md
6. [ ] Plan first 2-week sprint

### **Week 1 Sprint:**

1. [ ] Extract core logic from Arabify to `@meridian/core`
2. [ ] Set up CLI package with Commander.js
3. [ ] Implement `meridian fix-css` command
4. [ ] Write comprehensive tests
5. [ ] Create initial documentation

---

## **🎉 Conclusion**

**Meridian** represents a complete evolution from Arabify - from a niche Arabic/RTL tool to a comprehensive internationalization automation platform. By focusing on developer experience, automation, and prevention, Meridian has the potential to become the standard tool for React internationalization.

**The opportunity is real:**

- i18next has 10M+ downloads/week (proven market)
- postcss-use-logical has <1K downloads/week (failed execution)
- **Gap:** Comprehensive, easy-to-use migration tool doesn't exist
- **Solution:** Meridian fills this gap

**With the right execution, Meridian could reach:**

- 50,000+ weekly downloads within 12 months
- Standard tool mentioned in React documentation
- Conference talks and industry recognition
- Sustainable open-source project

**Let's build it.** 🚀

---

**Document Version:** 1.0  
**Last Updated:** February 23, 2026  
**Author:** Taim Kellizy  
**Status:** Ready for Development
