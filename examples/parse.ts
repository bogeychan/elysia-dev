import path from 'node:path'
import * as parser from '../src/parser'

const ast = await parser.parse(path.resolve(__dirname, 'app.ts'), {
	$type: 'typescript'
})

// const ast = await parser.parse(
// 	path.resolve(__dirname, 'out', 'open-api.json'),
// 	{
// 		$type: 'open-api'
// 	}
// )

console.log(JSON.stringify(ast, null, '  '))
