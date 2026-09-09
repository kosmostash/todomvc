export type ParamsT3447874133 = {};
export type ResponseTGET1868331565 = Array<{
  id: VRefine<number, {
    minimum: 1;
    multipleOf: 1
  }>;
  title: string;
  completed: boolean
}>;
export type JsonTPOST2418144118 = {
  title: VRefine<string, {
    minLength: 1;
    maxLength: 255
  }>
};
export type ResponseTPOST4226798136 = {
  id: VRefine<number, {
    minimum: 1;
    multipleOf: 1
  }>;
  title: string;
  completed: boolean
};
export type JsonTPATCH2418144118 = {
  completed: boolean
};
export type ResponseTPATCH1868331565 = Array<{
  id: VRefine<number, {
    minimum: 1;
    multipleOf: 1
  }>;
  title: string;
  completed: boolean
}>;
export type QueryTDELETE2418144118 = {
  completed: boolean
};
export type ResponseTDELETE1868331565 = Array<{
  id: VRefine<number, {
    minimum: 1;
    multipleOf: 1
  }>;
  title: string;
  completed: boolean
}>;
