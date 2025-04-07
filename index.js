const QueryEngine = require('@comunica/query-sparql').QueryEngine;

// import {LoggerVoid} from "@comunica/logger-void";
// const { LoggerVoid } = require('@comunica/logger-void');
const {LoggerPretty} = require('@comunica/logger-pretty');

async function main() {
  const myEngine = new QueryEngine();
  const bindingsStream = await myEngine.queryBindings(`
    SELECT ?s ?p ?o WHERE {
      ?s ?p ?o
    } LIMIT 10`, {
    sources: [ 'http://localhost:3000/sparql', 'https://query.wikidata.org/sparql' ],
//      sources: [ 'https://dbpedia.org/sparql' ],
    log: new LoggerPretty({ level: 'debug' }),
  });
  
  // Consume results as a stream (best performance)
  bindingsStream.on('data', (binding) => {
    console.log(binding.toString()); // Quick way to print bindings for testing
  
  //   console.log(binding.has('s')); // Will be true
  
  //   // Obtaining values
  //   console.log(binding.get('s').value);
  //   console.log(binding.get('s').termType);
  //   console.log(binding.get('p').value);
  //   console.log(binding.get('o').value);
   });
  bindingsStream.on('end', () => {
    // The data-listener will not be called anymore once we get here.
  });
  bindingsStream.on('error', (error) => {
    console.error(error);
  });
  
  // Consume results as async iterable (easier)
  for await (const binding of bindingsStream) {
    console.log(binding.toString());
  }
  
  // // Consume results as an array (easier)
  // const bindings = await bindingsStream.toArray();
  // console.log(bindings[0].get('s').value);
  // console.log(bindings[0].get('s').termType);
}

main();
