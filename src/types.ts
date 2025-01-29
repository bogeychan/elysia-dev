export type BaseOptions<T extends string> = { $type: T }

export type BaseParseOptions<T extends string> = BaseOptions<T> & {
	$watch?: boolean
}

type U2O<U extends string> = {
	[key in U]: U2O<Exclude<U, key>>
}

type O2T<O extends {}> = {} extends O
	? []
	: {
			[key in keyof O]: [key, ...O2T<O[key] extends {} ? O[key] : never>]
	  }[keyof O]

export type UnionOfPossibleTuples<T extends string> = O2T<U2O<T>>
