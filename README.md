# Patching fetch-sparql-endpoint with comunica

npm install

mouaif, en fait faire :
```
cp SparqlEndpointFetcher-patched.js node_modules/fetch-sparql-endpoint/lib/SparqlEndpointFetcher.js
```

est suffisant (même si c'est vraiment pas clean)
un sorte de patch...

puis:
```
export export ACCESS_TOKEN=tagada 
node index.js
```

on voit 
```
ajout de l'access token dans le header:tagada
```

donc le proxy doit écouter sur `localhost:3000/sparql`

ARGHHH : comunica detecte les sources en fonction de la tête de l'URL. Si le proxy n'est pas lancé avec /sparql -> n'utilise plus SparqlEndpointFetcher mais autre chose... (je sais pas quoi...)

## commandes utiles
```
npm list fetch-sparql-endpoint
npm explain fetch-sparql-endpoint
```

