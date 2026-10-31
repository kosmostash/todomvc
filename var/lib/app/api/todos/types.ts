export type ParamsT3447874133 = {};
export type ResponseTGET2162869163 = Array<{
  id: number;
  title: string;
  completed: boolean
}>;
export type JsonTPOST2418144118 = {
  title: VRefine<string, {
    pattern: "\\S"
  }>
};
export type ResponseTPOST2368446457 = {
  id: number;
  title: string;
  completed: boolean
};
export type JsonTPATCH2418144118 = {
  completed: boolean
};
export type ResponseTPATCH2162869163 = Array<{
  id: number;
  title: string;
  completed: boolean
}>;
export type ResponseTDELETE2162869163 = Array<{
  id: number;
  title: string;
  completed: boolean
}>;
