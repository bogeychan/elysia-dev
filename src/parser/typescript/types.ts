import type { CompilerOptions } from 'typescript'
import type { BaseOptions } from '../../types'

export type Options = BaseOptions<'typescript'> & CompilerOptions
