export type Override<A, B> = Omit<A, keyof B> & B;

export type StaticParams = {
  "active": [  ];
  "completed": [  ];
  "index": [  ];
};

export type LinkProps =
  | [ "active",  ]
    | [ "completed",  ]
    | [ "index",  ]
  ;
