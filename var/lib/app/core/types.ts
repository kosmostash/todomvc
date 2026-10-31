export type Override<A, B> = Omit<A, keyof B> & B;

export type StaticParams = {
  "{filter}": [ filter?: string | number ];
};

export type LinkProps =
  | [ "{filter}", filter?: string | number ]
  ;
