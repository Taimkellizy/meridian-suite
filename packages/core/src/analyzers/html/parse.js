import { parse } from 'node-html-parser';

export const parseHTML = (htmlString) => {
    // node-html-parser parses the string into an HTMLElement tree
    return parse(htmlString); 
};
