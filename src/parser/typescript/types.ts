import type { CompilerOptions } from 'typescript'
import type { BaseParseOptions } from '../../types'

export type Options = BaseParseOptions<'typescript'> & CompilerOptions
