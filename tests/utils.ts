import path from 'node:path'
import { Glob } from 'bun'

const tsGlob = new Glob('*.ts')
const jsonGlob = new Glob('*.json')

export const files = Array.from(
	tsGlob.scanSync({
		cwd: path.join(__dirname, 'files', 'typescript'),
		onlyFiles: true,
		dot: false,
		absolute: true
	})
).map((filePath) => [path.basename(filePath), filePath])

export const openApiFiles = Array.from(
	jsonGlob.scanSync({
		cwd: path.join(__dirname, 'files', 'open-api'),
		onlyFiles: true,
		dot: false,
		absolute: true
	})
).map((filePath) => [path.basename(filePath), filePath])
