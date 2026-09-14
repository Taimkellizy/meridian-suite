import { parse } from '@babel/parser';
import * as recast from 'recast';

export const parseCode = (codeString, fileName = '') => {
    const isTS = fileName && fileName.toLowerCase().endsWith('.ts') && !fileName.toLowerCase().endsWith('.tsx');
    const plugins = [
        'typescript', 
        'classProperties', 
        'dynamicImport', 
        'exportDefaultFrom', 
        'exportNamespaceFrom'
    ];

    if (!isTS) {
        plugins.push('jsx');
    }

    return recast.parse(codeString, {
        parser: {
            parse(source) {
                return parse(source, {
                    sourceType: 'module',
                    plugins: plugins,
                    tokens: true
                });
            }
        }
    });
};
