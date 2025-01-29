import path from 'node:path'
import { gen } from '../src'

await gen({
	entrypoint: path.resolve(__dirname, 'app.ts'),
	parse: {
		$type: 'typescript',
		$watch: false
	},
	outFile: path.resolve(__dirname, 'out', 'open-api.json'),
	write: {
		$type: 'open-api'
	}
})

// await gen({
// 	entrypoint: path.resolve(__dirname, 'app.ts'),
// 	parse: {
// 		$type: 'typescript'
// 	},
// 	outFile: path.resolve(__dirname, 'out', 'app.ts'),
// 	write: {
// 		$type: 'typescript'
// 	}
// })

// await gen({
// 	entrypoint: path.resolve(__dirname, 'out', 'open-api.json'),
// 	parse: {
// 		$type: 'open-api'
// 	},
// 	outFile: path.resolve(__dirname, 'out', 'app.ts'),
// 	write: {
// 		$type: 'typescript'
// 	}
// })

// await gen({
// 	entrypoint: path.resolve(__dirname, 'app.ts'),
// 	parse: {
// 		$type: 'typescript'
// 	},
// 	outFile: path.resolve(__dirname, 'out', 'test.test.ts'),
// 	write: {
// 		$type: 'treaty'
// 	}
// })

// await gen({
// 	entrypoint: path.resolve(__dirname, 'app.ts'),
// 	parse: {
// 		$type: 'typescript'
// 	},
// 	outFile: path.resolve(__dirname, 'out', 'request.http'),
// 	write: {
// 		$type: 'rest'
// 	}
// })
