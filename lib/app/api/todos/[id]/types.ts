export type ParamsT936095216 = {
  "id": VRefine<number, {
    minimum: 1;
    multipleOf: 1
  }>
};
export type JsonTPATCH2707495499 = {
  title?: VRefine<string, {
    minLength: 1;
    maxLength: 255
  }>;
  completed?: boolean
};
export type ResponseTPATCH3283446079 = {
  id: VRefine<number, {
    minimum: 1;
    multipleOf: 1
  }>;
  title: string;
  completed: boolean
};
export type ResponseTDELETE3283446079 = {
  id: VRefine<number, {
    minimum: 1;
    multipleOf: 1
  }>;
  title: string;
  completed: boolean
};
