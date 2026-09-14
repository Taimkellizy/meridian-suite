import { injectProvider } from './src/utils/reactInjector.js';

const code = `import React from 'react';
function App() {
  return (
    <div className="App">
      <h1>Hello</h1>
    </div>
  )
}
export default App;`;

console.log("Output:");
console.log(injectProvider(code));

