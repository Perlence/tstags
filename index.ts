/// <reference path="typings/tsd.d.ts" />

import fs = require('fs')
import ts = require('typescript')

var fileNames = process.argv.slice(2)
fileNames.forEach((fileName) => {
    var sourceFile = ts.createSourceFile(fileName, fs.readFileSync(fileName).toString(), ts.ScriptTarget.ES6, /* setParentNodes */ true)
    ts.forEachChild(sourceFile, (node) => {
        console.log(node.kind)
    })
})
